import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Schedule() {
  const [blocks, setBlocks] = useState([])
  const [hydration, setHydration] = useState([])
  const [exercise, setExercise] = useState(null)

  function load() {
    api.scheduleToday().then(setBlocks)
    api.hydrationToday().then(setHydration)
    api.exerciseToday().then(setExercise)
  }
  useEffect(load, [])

  async function markBlock(id, status) {
    await api.updateBlock(id, status)
    load()
  }

  async function logHydration(id, status) {
    await api.logHydration(id, status)
    load()
  }

  async function logExercise(status) {
    if (!exercise) return
    await api.logExercise(exercise.id, status)
    load()
  }

  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head"><h2>Today's schedule</h2><span className="count">{blocks.length} blocks</span></div>
        {blocks.map((b) => (
          <div key={b.id} className="task-row">
            <div className={'chk' + (b.status === 'COMPLETE' ? ' done' : '')} />
            <div>
              <div className={'task-name' + (b.status === 'COMPLETE' ? ' done' : '')}>{b.title}</div>
              <div className="task-meta">{b.type}</div>
            </div>
            <span className={'pill ' + pillClass(b.status)}>{b.status}</span>
            <span className="task-time">{b.start_time}–{b.end_time}</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              {b.status !== 'COMPLETE' && (
                <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => markBlock(b.id, 'COMPLETE')}>Complete</button>
              )}
              {b.status !== 'RESCHEDULED' && b.status !== 'COMPLETE' && (
                <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => markBlock(b.id, 'RESCHEDULED')}>Reschedule</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Hydration</h2><span className="count">{hydration.filter((h) => h.status === 'DONE').length} / {hydration.length}</span></div>
        {hydration.map((h) => (
          <div key={h.id} className="task-row">
            <div className={'chk' + (h.status === 'DONE' ? ' done' : '')} />
            <div className="task-name">💧 Hydration check</div>
            <span className={'pill ' + (h.status === 'DONE' ? 'done' : h.status === 'SKIPPED' ? 'blocked' : 'todo')}>{h.status}</span>
            <span className="task-time">{h.time}</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              {h.status === 'PENDING' && (
                <>
                  <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => logHydration(h.id, 'DONE')}>Done</button>
                  <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => logHydration(h.id, 'SKIPPED')}>Skip</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Exercise</h2><span className="count">{exercise?.duration_minutes ?? 20} min</span></div>
        {exercise && (
          <div className="task-row">
            <div className={'chk' + (exercise.status === 'DONE' ? ' done' : '')} />
            <div className="task-name">🚶 Movement — {exercise.planned_time || 'evening'}</div>
            <span className={'pill ' + (exercise.status === 'DONE' ? 'done' : 'todo')}>{exercise.status}</span>
            <span className="task-time" />
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              {exercise.status === 'PENDING' && (
                <>
                  <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => logExercise('DONE')}>Done</button>
                  <button className="btn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => logExercise('SKIPPED')}>Skip</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function pillClass(status) {
  if (status === 'COMPLETE') return 'done'
  if (status === 'ACTIVE') return 'progress'
  if (status === 'MISSED' || status === 'LATE') return 'blocked'
  return 'todo'
}
