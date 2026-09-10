const PILL = {
  TODO: ['To do', 'todo'],
  IN_PROGRESS: ['In progress', 'progress'],
  COMPLETED: ['Done', 'done'],
  BLOCKED: ['Blocked', 'blocked'],
  CANCELLED: ['Cancelled', 'blocked'],
  DEFERRED: ['Deferred', 'todo'],
}

const CATEGORY_CLASS = { CLIENT: 'client', LEARNING: 'learning' }

export default function TaskRow({ task, onToggle, current }) {
  const done = task.status === 'COMPLETED'
  const [pillLabel, pillClass] = PILL[task.status] || PILL.TODO
  return (
    <div className={'task-row' + (current ? ' current' : '')}>
      <div className={'chk' + (done ? ' done' : '')} onClick={() => onToggle(task)} />
      <div>
        <div className={'task-name' + (done ? ' done' : '')}>{task.title}</div>
        <div className="task-meta">Priority: {task.priority}</div>
      </div>
      <span className={'tag ' + (CATEGORY_CLASS[task.category] || '')}>{task.category}</span>
      <span className={'pill ' + pillClass}>{pillLabel}</span>
      <span className="task-time">{task.planned_start || '—'}</span>
    </div>
  )
}
