"""
SQLAlchemy models — mirrors the entity list in the DAYGUARD spec (secs. 44-51).
Kept to one file since the schema is small; split further if it grows.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from db import Base


def uid():
    return str(uuid.uuid4())


class DailyPlan(Base):
    __tablename__ = "daily_plans"
    id = Column(String, primary_key=True, default=uid)
    date = Column(String, unique=True, index=True)  # YYYY-MM-DD
    wake_time = Column(String, default="06:30")
    work_start = Column(String, default="09:00")
    work_end = Column(String, default="17:00")
    learning_start = Column(String, default="20:00")
    learning_end = Column(String, default="22:00")
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    blocks = relationship("ScheduleBlock", back_populates="plan", cascade="all, delete-orphan")


class ScheduleBlock(Base):
    __tablename__ = "schedule_blocks"
    id = Column(String, primary_key=True, default=uid)
    daily_plan_id = Column(String, ForeignKey("daily_plans.id"))
    type = Column(String)  # WAKE, PERSONAL, PREP, WORK, BREAK, LUNCH, EXERCISE, LEARNING, SHUTDOWN, FREE
    title = Column(String)
    start_time = Column(String)  # HH:MM
    end_time = Column(String)
    status = Column(String, default="UPCOMING")  # UPCOMING, DUE, ACTIVE, LATE, RESCHEDULED, MISSED, COMPLETE
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    notes = Column(Text, nullable=True)

    plan = relationship("DailyPlan", back_populates="blocks")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=uid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="OTHER")  # CLIENT, PERSONAL, LEARNING, RESEARCH, ADMIN, HEALTH, OTHER
    priority = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="TODO")  # TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED, DEFERRED
    planned_date = Column(String, nullable=True)
    planned_start = Column(String, nullable=True)
    planned_end = Column(String, nullable=True)
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class WorkSession(Base):
    __tablename__ = "work_sessions"
    id = Column(String, primary_key=True, default=uid)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    schedule_block_id = Column(String, ForeignKey("schedule_blocks.id"), nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    planned_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, PAUSED, COMPLETE


class CheckIn(Base):
    __tablename__ = "check_ins"
    id = Column(String, primary_key=True, default=uid)
    type = Column(String)  # WORK_START, BREAK_END, STUCK, UNPLANNED_BREAK, DAY_END, ...
    schedule_block_id = Column(String, nullable=True)
    task_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="RECORDED")
    response = Column(String, nullable=True)  # selected option, e.g. "I'm overwhelmed"
    notes = Column(Text, nullable=True)


class HydrationLog(Base):
    __tablename__ = "hydration_logs"
    id = Column(String, primary_key=True, default=uid)
    date = Column(String, index=True)
    scheduled_time = Column(String)
    status = Column(String, default="PENDING")  # PENDING, DONE, SKIPPED
    logged_at = Column(DateTime, nullable=True)


class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    id = Column(String, primary_key=True, default=uid)
    date = Column(String, index=True)
    activity = Column(String, default="Movement")
    planned_time = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=20)
    status = Column(String, default="PENDING")  # PENDING, DONE, SKIPPED, RESCHEDULED

class Note(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True, default=uid)
    kind = Column(String, default="NOTE")  # TASK, NOTE, REMINDER, IDEA, RESEARCH
    content = Column(Text)
    transcript_raw = Column(Text, nullable=True)
    linked_task_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyReport(Base):
    __tablename__ = "daily_reports"
    id = Column(String, primary_key=True, default=uid)
    date = Column(String, unique=True, index=True)
    schedule_adherence = Column(Integer, default=0)  # 0-100
    planned_work_minutes = Column(Integer, default=0)
    actual_work_minutes = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_total = Column(Integer, default=0)
    late_starts = Column(Integer, default=0)
    unplanned_breaks = Column(Integer, default=0)
    hydration_done = Column(Integer, default=0)
    hydration_total = Column(Integer, default=0)
    exercise_done = Column(Boolean, default=False)
    learning_minutes = Column(Integer, default=0)
    score = Column(Integer, default=0)
    reflection = Column(String, nullable=True)  # Good / Okay / Poor
    biggest_issue = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Settings(Base):
    __tablename__ = "settings"
    id = Column(String, primary_key=True, default=uid)
    key = Column(String, unique=True, index=True)
    value = Column(Text)
