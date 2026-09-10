"""
Idempotent daily seeding — creates today's DailyPlan + default ScheduleBlocks
+ default hydration/exercise entries if they don't already exist (spec sec. 52:
"the scheduler must be idempotent... must not create duplicate reminders").
"""
from datetime import date
from sqlalchemy.orm import Session
from models import DailyPlan, ScheduleBlock, HydrationLog, ExerciseLog

DEFAULT_BLOCKS = [
    ("WAKE", "Wake window", "05:30", "06:30"),
    ("PERSONAL", "Morning routine", "06:30", "07:30"),
    ("PREP", "Preparation", "07:30", "09:00"),
    ("WORK", "Work block", "09:00", "10:30"),
    ("BREAK", "Household break", "10:30", "11:30"),
    ("WORK", "Work block", "11:30", "13:30"),
    ("LUNCH", "Lunch", "13:30", "15:00"),
    ("WORK", "Work block", "15:00", "17:00"),
    ("SHUTDOWN", "Workday complete", "17:00", "17:00"),
    ("LEARNING", "Learning", "20:00", "22:00"),
    ("SHUTDOWN", "Shutdown", "22:00", "22:00"),
]

DEFAULT_HYDRATION_TIMES = ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"]


def ensure_today_seeded(db: Session) -> DailyPlan:
    today = date.today().isoformat()
    plan = db.query(DailyPlan).filter(DailyPlan.date == today).first()
    if plan:
        return plan

    plan = DailyPlan(date=today)
    db.add(plan)
    db.flush()  # get plan.id without committing yet

    for btype, title, start, end in DEFAULT_BLOCKS:
        db.add(ScheduleBlock(
            daily_plan_id=plan.id, type=btype, title=title,
            start_time=start, end_time=end, status="UPCOMING"
        ))

    for t in DEFAULT_HYDRATION_TIMES:
        db.add(HydrationLog(date=today, scheduled_time=t, status="PENDING"))

    db.add(ExerciseLog(date=today, activity="Movement", planned_time="17:30",
                        duration_minutes=20, status="PENDING"))

    db.commit()
    db.refresh(plan)
    return plan
