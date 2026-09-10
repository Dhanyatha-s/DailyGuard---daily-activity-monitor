"""
Daily productivity score — implements the weighting from spec sec. 32:
  Schedule adherence   30%
  Work completion      25%
  Task completion      20%
  Check-in consistency 10%
  Personal routines    10%
  Learning consistency  5%
Each component is 0-100; the weighted sum is the final 0-100 score.
"""


def compute_score(
    schedule_adherence: int,
    planned_work_minutes: int,
    actual_work_minutes: int,
    tasks_completed: int,
    tasks_total: int,
    checkins_completed: int,
    checkins_expected: int,
    hydration_done: int,
    hydration_total: int,
    exercise_done: bool,
    learning_minutes: int,
    learning_target_minutes: int = 120,
) -> int:
    work_completion = min(100, round((actual_work_minutes / planned_work_minutes) * 100)) if planned_work_minutes else 0
    task_completion = round((tasks_completed / tasks_total) * 100) if tasks_total else 0
    checkin_consistency = round((checkins_completed / checkins_expected) * 100) if checkins_expected else 100
    hydration_pct = round((hydration_done / hydration_total) * 100) if hydration_total else 0
    personal_routines = round((hydration_pct + (100 if exercise_done else 0)) / 2)
    learning_consistency = min(100, round((learning_minutes / learning_target_minutes) * 100)) if learning_target_minutes else 0

    score = (
        schedule_adherence * 0.30
        + work_completion * 0.25
        + task_completion * 0.20
        + checkin_consistency * 0.10
        + personal_routines * 0.10
        + learning_consistency * 0.05
    )
    return round(score)
