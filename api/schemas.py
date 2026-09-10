"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "OTHER"
    priority: str = "MEDIUM"
    planned_date: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    estimated_minutes: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    estimated_minutes: Optional[int] = None


class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    priority: str
    status: str
    planned_date: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: int
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CheckInIn(BaseModel):
    type: str
    schedule_block_id: Optional[str] = None
    task_id: Optional[str] = None
    response: Optional[str] = None
    notes: Optional[str] = None


class SessionStartIn(BaseModel):
    task_id: Optional[str] = None
    schedule_block_id: Optional[str] = None
    planned_minutes: Optional[int] = None


class HydrationLogIn(BaseModel):
    id: str
    status: str  # DONE, SKIPPED


class ExerciseLogIn(BaseModel):
    id: str
    status: str  # DONE, SKIPPED, RESCHEDULED


class NoteIn(BaseModel):
    kind: str = "NOTE"
    content: str
    transcript_raw: Optional[str] = None


class DayEndIn(BaseModel):
    reflection: str  # Good / Okay / Poor
    biggest_issue: Optional[str] = None


class SettingIn(BaseModel):
    key: str
    value: str
