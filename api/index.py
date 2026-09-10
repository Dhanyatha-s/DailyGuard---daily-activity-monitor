"""
DAYGUARD backend — single FastAPI app, deployed as one Vercel Python
serverless function (see vercel.json: /api/(.*) -> /api/index.py).

Route groups mirror spec sec. 51:
  /api/dashboard/today
  /api/tasks
  /api/schedule/*
  /api/sessions/*
  /api/checkins*
  /api/hydration*
  /api/exercise*
  /api/notes*
  /api/reports/*
  /api/settings*
"""
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from db import Base, engine, get_db
from models import (
    DailyPlan, ScheduleBlock, Task, WorkSession, CheckIn,
    HydrationLog, ExerciseLog, Note, DailyReport, Settings
)
from schemas import (
    TaskIn, TaskUpdate, TaskOut, CheckInIn, SessionStartIn,
    HydrationLogIn, ExerciseLogIn, NoteIn, DayEndIn, SettingIn
)
from seed import ensure_today_seeded
from scoring import compute_score

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DAYGUARD API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def today_str():
    return date.today().isoformat()


# ---------------------------------------------------------------- dashboard
@app.get("/api/dashboard/today")
def dashboard_today(db: Session = Depends(get_db)):
    plan = ensure_today_seeded(db)
    blocks = (
        db.query(ScheduleBlock)
        .filter(ScheduleBlock.daily_plan_id == plan.id)
        .order_by(ScheduleBlock.start_time)
        .all()
    )
    now = datetime.now().strftime("%H:%M")

    current_block = None
    for b in blocks:
        if b.start_time <= now < b.end_time and b.status != "COMPLETE":
            current_block = b
            break

    active_session = (
        db.query(WorkSession)
        .filter(WorkSession.status == "ACTIVE")
        .order_by(WorkSession.started_at.desc())
        .first()
    )

    tasks_today = (
        db.query(Task)
        .filter(Task.planned_date == plan.date, Task.status != "CANCELLED")
        .all()
    )

    hydration = db.query(HydrationLog).filter(HydrationLog.date == plan.date).all()
    exercise = db.query(ExerciseLog).filter(ExerciseLog.date == plan.date).first()
    late_starts = db.query(CheckIn).filter(
        CheckIn.type == "WORK_LATE", CheckIn.timestamp >= datetime.combine(date.today(), datetime.min.time())
    ).count()

    return {
        "date": plan.date,
        "now": now,
        "current_block": _block_dict(current_block),
        "active_session": _session_dict(active_session),
        "blocks": [_block_dict(b) for b in blocks],
        "tasks": [TaskOut.model_validate(t).model_dump() for t in tasks_today],
        "hydration": {
            "done": sum(1 for h in hydration if h.status == "DONE"),
            "total": len(hydration),
            "items": [{"id": h.id, "time": h.scheduled_time, "status": h.status} for h in hydration],
        },
        "exercise": {
            "status": exercise.status if exercise else "PENDING",
            "planned_time": exercise.planned_time if exercise else None,
            "duration_minutes": exercise.duration_minutes if exercise else None,
            "id": exercise.id if exercise else None,
        },
        "late_starts": late_starts,
    }


def _block_dict(b: Optional[ScheduleBlock]):
    if not b:
        return None
    return {
        "id": b.id, "type": b.type, "title": b.title,
        "start_time": b.start_time, "end_time": b.end_time,
        "status": b.status, "task_id": b.task_id,
    }


def _session_dict(s: Optional[WorkSession]):
    if not s:
        return None
    return {
        "id": s.id, "task_id": s.task_id, "schedule_block_id": s.schedule_block_id,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "planned_minutes": s.planned_minutes, "status": s.status,
    }


# -------------------------------------------------------------------- tasks
@app.get("/api/tasks", response_model=List[TaskOut])
def list_tasks(date_filter: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Task)
    if date_filter:
        q = q.filter(Task.planned_date == date_filter)
    return q.order_by(Task.planned_start.is_(None), Task.planned_start).all()


@app.post("/api/tasks", response_model=TaskOut)
def create_task(payload: TaskIn, db: Session = Depends(get_db)):
    t = Task(planned_date=payload.planned_date or today_str(), **payload.model_dump(exclude={"planned_date"}))
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).get(task_id)
    if not t:
        raise HTTPException(404, "Task not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(t, k, v)
    if data.get("status") == "COMPLETED" and not t.completed_at:
        t.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return t


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).get(task_id)
    if not t:
        raise HTTPException(404, "Task not found")
    db.delete(t)
    db.commit()
    return {"deleted": task_id}


# ----------------------------------------------------------------- schedule
@app.get("/api/schedule/today")
def schedule_today(db: Session = Depends(get_db)):
    plan = ensure_today_seeded(db)
    blocks = (
        db.query(ScheduleBlock)
        .filter(ScheduleBlock.daily_plan_id == plan.id)
        .order_by(ScheduleBlock.start_time)
        .all()
    )
    return [_block_dict(b) for b in blocks]


@app.put("/api/schedule/blocks/{block_id}")
def update_block(block_id: str, status: str, db: Session = Depends(get_db)):
    b = db.query(ScheduleBlock).get(block_id)
    if not b:
        raise HTTPException(404, "Block not found")
    b.status = status
    db.commit()
    return _block_dict(b)


# ------------------------------------------------------------------ sessions
@app.post("/api/sessions/start")
def start_session(payload: SessionStartIn, db: Session = Depends(get_db)):
    s = WorkSession(
        task_id=payload.task_id,
        schedule_block_id=payload.schedule_block_id,
        started_at=datetime.utcnow(),
        planned_minutes=payload.planned_minutes,
        status="ACTIVE",
    )
    db.add(s)
    if payload.task_id:
        t = db.query(Task).get(payload.task_id)
        if t:
            t.status = "IN_PROGRESS"
    if payload.schedule_block_id:
        b = db.query(ScheduleBlock).get(payload.schedule_block_id)
        if b:
            b.status = "ACTIVE"
    db.commit()
    db.refresh(s)
    return _session_dict(s)


@app.post("/api/sessions/{session_id}/stop")
def stop_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(WorkSession).get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    s.ended_at = datetime.utcnow()
    s.status = "COMPLETE"
    if s.started_at:
        s.actual_minutes = int((s.ended_at - s.started_at).total_seconds() // 60)
    if s.task_id:
        t = db.query(Task).get(s.task_id)
        if t:
            t.status = "COMPLETED"
            t.completed_at = datetime.utcnow()
            t.actual_minutes = (t.actual_minutes or 0) + (s.actual_minutes or 0)
    if s.schedule_block_id:
        b = db.query(ScheduleBlock).get(s.schedule_block_id)
        if b:
            b.status = "COMPLETE"
    db.commit()
    db.refresh(s)
    return _session_dict(s)


# ----------------------------------------------------------------- checkins
@app.post("/api/checkins")
def create_checkin(payload: CheckInIn, db: Session = Depends(get_db)):
    c = CheckIn(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "type": c.type, "response": c.response, "timestamp": c.timestamp.isoformat()}


@app.get("/api/checkins/today")
def checkins_today(db: Session = Depends(get_db)):
    start = datetime.combine(date.today(), datetime.min.time())
    rows = db.query(CheckIn).filter(CheckIn.timestamp >= start).order_by(CheckIn.timestamp.desc()).all()
    return [{"id": r.id, "type": r.type, "response": r.response, "timestamp": r.timestamp.isoformat()} for r in rows]


# ---------------------------------------------------------------- hydration
@app.get("/api/hydration/today")
def hydration_today(db: Session = Depends(get_db)):
    ensure_today_seeded(db)
    rows = db.query(HydrationLog).filter(HydrationLog.date == today_str()).order_by(HydrationLog.scheduled_time).all()
    return [{"id": r.id, "time": r.scheduled_time, "status": r.status} for r in rows]


@app.post("/api/hydration")
def log_hydration(payload: HydrationLogIn, db: Session = Depends(get_db)):
    r = db.query(HydrationLog).get(payload.id)
    if not r:
        raise HTTPException(404, "Hydration entry not found")
    r.status = payload.status
    r.logged_at = datetime.utcnow()
    db.commit()
    return {"id": r.id, "status": r.status}


# ----------------------------------------------------------------- exercise
@app.get("/api/exercise/today")
def exercise_today(db: Session = Depends(get_db)):
    ensure_today_seeded(db)
    r = db.query(ExerciseLog).filter(ExerciseLog.date == today_str()).first()
    return {"id": r.id, "status": r.status, "planned_time": r.planned_time, "duration_minutes": r.duration_minutes}


@app.post("/api/exercise")
def log_exercise(payload: ExerciseLogIn, db: Session = Depends(get_db)):
    r = db.query(ExerciseLog).get(payload.id)
    if not r:
        raise HTTPException(404, "Exercise entry not found")
    r.status = payload.status
    db.commit()
    return {"id": r.id, "status": r.status}


# -------------------------------------------------------------------- notes
@app.post("/api/notes")
def create_note(payload: NoteIn, db: Session = Depends(get_db)):
    n = Note(**payload.model_dump())
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"id": n.id, "kind": n.kind, "content": n.content}


@app.get("/api/notes")
def list_notes(db: Session = Depends(get_db)):
    rows = db.query(Note).order_by(Note.created_at.desc()).limit(50).all()
    return [{"id": r.id, "kind": r.kind, "content": r.content, "created_at": r.created_at.isoformat()} for r in rows]


# ------------------------------------------------------------------ reports
@app.get("/api/reports/today")
def report_today(db: Session = Depends(get_db)):
    return _build_report(db, today_str())


@app.post("/api/reports/day-end")
def day_end(payload: DayEndIn, db: Session = Depends(get_db)):
    report = _build_report(db, today_str(), persist=True)
    row = db.query(DailyReport).filter(DailyReport.date == today_str()).first()
    row.reflection = payload.reflection
    row.biggest_issue = payload.biggest_issue
    db.commit()
    return report


@app.get("/api/reports/history")
def report_history(days: int = 14, db: Session = Depends(get_db)):
    rows = (
        db.query(DailyReport)
        .order_by(DailyReport.date.desc())
        .limit(days)
        .all()
    )
    return [
        {
            "date": r.date, "score": r.score, "schedule_adherence": r.schedule_adherence,
            "tasks_completed": r.tasks_completed, "tasks_total": r.tasks_total,
            "late_starts": r.late_starts, "actual_work_minutes": r.actual_work_minutes,
        }
        for r in rows
    ]


def _build_report(db: Session, day: str, persist: bool = False):
    plan = db.query(DailyPlan).filter(DailyPlan.date == day).first()
    blocks = db.query(ScheduleBlock).filter(ScheduleBlock.daily_plan_id == plan.id).all() if plan else []
    tasks = db.query(Task).filter(Task.planned_date == day).all()
    hydration = db.query(HydrationLog).filter(HydrationLog.date == day).all()
    exercise = db.query(ExerciseLog).filter(ExerciseLog.date == day).first()

    work_blocks = [b for b in blocks if b.type == "WORK"]
    planned_work_minutes = sum(_block_minutes(b) for b in work_blocks)
    sessions = db.query(WorkSession).filter(WorkSession.schedule_block_id.in_([b.id for b in work_blocks])).all() if work_blocks else []
    actual_work_minutes = sum(s.actual_minutes or 0 for s in sessions)

    completed_blocks = sum(1 for b in blocks if b.status == "COMPLETE")
    schedule_adherence = round((completed_blocks / len(blocks)) * 100) if blocks else 0

    tasks_completed = sum(1 for t in tasks if t.status == "COMPLETED")
    tasks_total = len(tasks)

    late_starts = db.query(CheckIn).filter(CheckIn.type == "WORK_LATE").count()
    unplanned_breaks = db.query(CheckIn).filter(CheckIn.type == "UNPLANNED_BREAK").count()

    hydration_done = sum(1 for h in hydration if h.status == "DONE")
    hydration_total = len(hydration)
    exercise_done = bool(exercise and exercise.status == "DONE")

    learning_blocks = [b for b in blocks if b.type == "LEARNING" and b.status == "COMPLETE"]
    learning_minutes = sum(_block_minutes(b) for b in learning_blocks)

    checkins_expected = len(blocks)
    checkins_completed = db.query(CheckIn).count()

    score = compute_score(
        schedule_adherence, planned_work_minutes, actual_work_minutes,
        tasks_completed, tasks_total, checkins_completed, checkins_expected,
        hydration_done, hydration_total, exercise_done, learning_minutes,
    )

    result = {
        "date": day,
        "schedule_adherence": schedule_adherence,
        "planned_work_minutes": planned_work_minutes,
        "actual_work_minutes": actual_work_minutes,
        "tasks_completed": tasks_completed,
        "tasks_total": tasks_total,
        "late_starts": late_starts,
        "unplanned_breaks": unplanned_breaks,
        "hydration_done": hydration_done,
        "hydration_total": hydration_total,
        "exercise_done": exercise_done,
        "learning_minutes": learning_minutes,
        "score": score,
    }

    if persist:
        row = db.query(DailyReport).filter(DailyReport.date == day).first()
        if not row:
            row = DailyReport(date=day)
            db.add(row)
        for k, v in result.items():
            if k != "date":
                setattr(row, k, v)
        db.commit()

    return result


def _block_minutes(b: ScheduleBlock) -> int:
    try:
        h1, m1 = map(int, b.start_time.split(":"))
        h2, m2 = map(int, b.end_time.split(":"))
        return max(0, (h2 * 60 + m2) - (h1 * 60 + m1))
    except Exception:
        return 0


# ------------------------------------------------------------------ settings
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(Settings).all()
    out = {r.key: r.value for r in rows}
    plan = db.query(DailyPlan).filter(DailyPlan.date == today_str()).first()
    if plan:
        out.setdefault("wake_time", plan.wake_time)
        out.setdefault("work_start", plan.work_start)
        out.setdefault("work_end", plan.work_end)
        out.setdefault("learning_start", plan.learning_start)
        out.setdefault("learning_end", plan.learning_end)
    return out


@app.post("/api/settings")
def set_setting(payload: SettingIn, db: Session = Depends(get_db)):
    row = db.query(Settings).filter(Settings.key == payload.key).first()
    if not row:
        row = Settings(key=payload.key, value=payload.value)
        db.add(row)
    else:
        row.value = payload.value
    db.commit()
    return {"key": row.key, "value": row.value}
