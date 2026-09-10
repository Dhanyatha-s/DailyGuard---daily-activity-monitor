import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import TaskRow from '../components/TaskRow.jsx'
import CheckInModal from '../components/CheckInModal.jsx'
import { useScheduleNotifications } from '../hooks/useNotifications.js'

const STUCK_OPTIONS = [
  "I don't understand the task",
  "I don't know how to implement it",
  "I need to research",
  "I'm overwhelmed",
  'Other',
]
const BREAK_OPTIONS = ['Quick break', 'Personal matter', 'Unexpected interruption', 'Feeling tired', 'Other']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [modal, setModal] = useState(null) // 'stuck' | 'break' | null
  const [session, setSession] = useState(null)

  const load = useCallback(() => {
    api.dashboard().then(setData).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  useScheduleNotifications(data?.blocks)

  if (!data) return <div className="content">Loading today's plan…</div>

  const { current_block, tasks, blocks, hydration, exercise, late_starts } = data
  const currentTask = tasks.find((t) => t.status === 'IN_PROGRESS') || tasks.find((t) => t.status === 'TODO')
  const doneCount = tasks.filter((t) => t.status === 'COMPLETED').length
  const workedBlocks = blocks.filter((b) => b.status === 'COMPLETE').length

  async function handleStart() {
    if (!currentTask || !current_block) return
    const s = await api.startSession({
      task_id: currentTask.id,
      schedule_block_id: current_block.id,
      planned_minutes: blockMinutes(current_block),
    })
    setSession(s)
    load()
  }

  async function handleComplete() {
    if (session) {
      await api.stopSession(session.id)
      setSession(null)
    } else if (currentTask) {
      await api.updateTask(currentTask.id, { status: 'COMPLETED' })
    }
    load()
  }

  async function handleToggleTask(task) {
    const next = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED'
    await api.updateTask(task.id, { status: next })
    load()
  }

  async function handleStuck(reason) {
    await api.createCheckin({ type: 'STUCK', task_id: currentTask?.id, response: reason })
    setModal(null)
  }

  async function handleBreak(reason) {
    await api.createCheckin({ type: 'UNPLANNED_BREAK', response: reason })
    setModal(null)
  }

  const remaining = current_block ? remainingLabel(current_block) : '—'

  return (
    <div className="content">
      <div className="hero">
        <div className="hero-left">
          <div className="eyebrow">
            {current_block ? `CURRENT ASSIGNMENT · ${current_block.start_time}–${current_block.end_time}` : 'NO ACTIVE BLOCK'}
          </div>
          <h1>{currentTask ? currentTask.title : current_block?.title || 'Free time'}</h1>
          <div className="sub">
            {currentTask ? `${currentTask.category} work` : current_block?.type || ''} · {remaining} · {late_starts > 0 ? `${late_starts} late start(s) today` : 'on schedule'}
          </div>
        </div>
        <div className="hero-progress">
          <div className="hero-actions">
            {!session && currentTask?.status !== 'IN_PROGRESS' && (
              <button className="btn primary" onClick={handleStart}>Start</button>
            )}
            <button className="btn primary" onClick={handleComplete}>Mark complete</button>
            <button className="btn warn" onClick={() => setModal('stuck')}>I'm stuck</button>
            <button className="btn" onClick={() => setModal('break')}>Take break</button>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <StatCard label="TASKS TODAY" value={`${doneCount} / ${tasks.length}`} sub="today's assignments" />
        <StatCard label="SCHEDULE BLOCKS" value={`${workedBlocks} / ${blocks.length}`} brand sub="completed today" />
        <StatCard label="HYDRATION" value={`${hydration.done} / ${hydration.total}`} sub="tap in Schedule to log" />
        <StatCard label="LATE STARTS" value={late_starts} sub="today" />
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Assigned today</h2><span className="count">{tasks.length} items</span></div>
        {tasks.length === 0 && <div className="task-row"><span className="task-meta">No tasks yet — add some in Tasks.</span></div>}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={handleToggleTask} current={currentTask?.id === t.id} />
        ))}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Today's schedule</h2><span className="count">{exercise.status === 'DONE' ? 'exercise done' : 'exercise pending'}</span></div>
        {blocks.map((b) => (
          <div key={b.id} className={'task-row' + (b.id === current_block?.id ? ' current' : '')}>
            <div className={'chk' + (b.status === 'COMPLETE' ? ' done' : '')} />
            <div className={'task-name' + (b.status === 'COMPLETE' ? ' done' : '')}>{b.title}</div>
            <span />
            <span className={'pill ' + pillClassForBlock(b)}>{pillLabelForBlock(b)}</span>
            <span className="task-time">{b.start_time}</span>
          </div>
        ))}
      </div>

      {modal === 'stuck' && (
        <CheckInModal title="What's blocking you?" label="I'M STUCK" options={STUCK_OPTIONS}
          onSelect={handleStuck} onClose={() => setModal(null)} />
      )}
      {modal === 'break' && (
        <CheckInModal title="Why are you leaving your work session?" label="UNPLANNED BREAK" options={BREAK_OPTIONS}
          onSelect={handleBreak} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function blockMinutes(b) {
  const [h1, m1] = b.start_time.split(':').map(Number)
  const [h2, m2] = b.end_time.split(':').map(Number)
  return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1))
}

function remainingLabel(b) {
  const now = new Date()
  const [h2, m2] = b.end_time.split(':').map(Number)
  const end = new Date()
  end.setHours(h2, m2, 0, 0)
  const diffMin = Math.round((end - now) / 60000)
  if (diffMin <= 0) return 'block ended'
  return `${diffMin} min remaining`
}

function pillClassForBlock(b) {
  if (b.status === 'COMPLETE') return 'done'
  if (b.status === 'ACTIVE') return 'progress'
  if (b.status === 'MISSED' || b.status === 'LATE') return 'blocked'
  return 'todo'
}
function pillLabelForBlock(b) {
  if (b.status === 'COMPLETE') return 'Done'
  if (b.status === 'ACTIVE') return 'Active'
  if (b.status === 'MISSED') return 'Missed'
  if (b.status === 'LATE') return 'Late'
  return 'Upcoming'
}
