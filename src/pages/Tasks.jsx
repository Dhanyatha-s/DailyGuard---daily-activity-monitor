import { useEffect, useState } from 'react'
import { api } from '../api.js'
import TaskRow from '../components/TaskRow.jsx'

const CATEGORIES = ['CLIENT', 'PERSONAL', 'LEARNING', 'RESEARCH', 'ADMIN', 'HEALTH', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState({ title: '', category: 'CLIENT', priority: 'MEDIUM', planned_start: '', estimated_minutes: '' })
  const [showForm, setShowForm] = useState(false)

  function load() {
    api.tasks().then(setTasks)
  }
  useEffect(load, [])

  async function handleToggle(task) {
    const next = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED'
    await api.updateTask(task.id, { status: next })
    load()
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await api.createTask({
      title: form.title,
      category: form.category,
      priority: form.priority,
      planned_start: form.planned_start || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
    })
    setForm({ title: '', category: 'CLIENT', priority: 'MEDIUM', planned_start: '', estimated_minutes: '' })
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    await api.deleteTask(id)
    load()
  }

  const byCategory = tasks.reduce((acc, t) => {
    acc[t.category] = acc[t.category] || []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="content">
      <div className="panel-head" style={{ border: 'none', padding: '0 0 14px' }}>
        <h2 style={{ fontFamily: 'var(--head)', fontSize: 18 }}>All tasks</h2>
        <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="panel" style={{ padding: 16, marginBottom: 20, display: 'grid', gap: 10 }}>
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={inputStyle}
            required
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="time" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Est. min" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} style={{ ...inputStyle, width: 90 }} />
          </div>
          <button className="btn primary" type="submit" style={{ justifySelf: 'start' }}>Add task</button>
        </form>
      )}

      {Object.keys(byCategory).length === 0 && (
        <div className="panel" style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No tasks yet.</div>
      )}

      {Object.entries(byCategory).map(([cat, items]) => (
        <div className="panel" key={cat}>
          <div className="panel-head"><h2>{cat}</h2><span className="count">{items.length}</span></div>
          {items.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}><TaskRow task={t} onToggle={handleToggle} /></div>
              <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: '0 16px', fontSize: 16 }} title="Delete">×</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  padding: '9px 11px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'var(--sans)', fontSize: 13,
}
