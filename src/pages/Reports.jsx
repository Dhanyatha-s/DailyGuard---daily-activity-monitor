import { useEffect, useState } from 'react'
import { api } from '../api.js'
import StatCard from '../components/StatCard.jsx'

export default function Reports() {
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [reflection, setReflection] = useState(null)
  const [issue, setIssue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function load() {
    api.reportToday().then(setReport)
    api.reportHistory(14).then(setHistory)
  }
  useEffect(load, [])

  async function submitDayEnd() {
    if (!reflection) return
    await api.dayEnd({ reflection, biggest_issue: issue || null })
    setSubmitted(true)
    load()
  }

  if (!report) return <div className="content">Loading report…</div>

  const maxScore = Math.max(1, ...history.map((h) => h.score))

  return (
    <div className="content">
      <div className="stats-row">
        <StatCard label="SCORE TODAY" value={`${report.score}%`} brand sub="weighted across all systems" />
        <StatCard label="SCHEDULE ADHERENCE" value={`${report.schedule_adherence}%`} sub="blocks completed" />
        <StatCard label="WORK LOGGED" value={`${Math.round(report.actual_work_minutes / 60 * 10) / 10}h`} sub={`of ${Math.round(report.planned_work_minutes / 60 * 10) / 10}h planned`} />
        <StatCard label="TASKS" value={`${report.tasks_completed} / ${report.tasks_total}`} sub="completed today" />
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Today's numbers</h2></div>
        <Row label="Late starts" value={report.late_starts} />
        <Row label="Unplanned breaks" value={report.unplanned_breaks} />
        <Row label="Hydration" value={`${report.hydration_done} / ${report.hydration_total}`} />
        <Row label="Exercise" value={report.exercise_done ? 'Completed' : 'Not yet'} />
        <Row label="Learning" value={`${report.learning_minutes} min`} />
      </div>

      <div className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ border: 'none', padding: '0 0 14px' }}><h2>End-of-day review</h2></div>
        {!submitted ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>How did today go?</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['Good', 'Okay', 'Poor'].map((opt) => (
                <button key={opt} className={'btn' + (reflection === opt ? ' primary' : '')} onClick={() => setReflection(opt)}>{opt}</button>
              ))}
            </div>
            <textarea
              placeholder="What caused the biggest problem? (optional)"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--sans)', fontSize: 13, marginBottom: 12 }}
            />
            <button className="btn primary" disabled={!reflection} onClick={submitDayEnd}>Submit review</button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--green)' }}>Review saved — see it reflected in History below tomorrow.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>History</h2><span className="count">last {history.length} days</span></div>
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {[...history].reverse().map((h) => (
            <div key={h.date} title={`${h.date}: ${h.score}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>{h.score}</div>
              <div style={{ width: '100%', background: 'var(--brand)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (h.score / maxScore) * 80)}px` }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)' }}>{h.date.slice(5)}</div>
            </div>
          ))}
          {history.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>No history yet — submit today's review to start building trends.</div>}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="task-row">
      <span />
      <div className="task-name">{label}</div>
      <span />
      <span />
      <span className="task-time">{value}</span>
    </div>
  )
}
