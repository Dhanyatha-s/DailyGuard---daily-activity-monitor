import { useEffect, useState } from 'react'
import { api } from '../api.js'

const FIELDS = [
  { key: 'wake_time', label: 'Wake target', type: 'time' },
  { key: 'work_start', label: 'Work start', type: 'time' },
  { key: 'work_end', label: 'Work end', type: 'time' },
  { key: 'learning_start', label: 'Learning start', type: 'time' },
  { key: 'learning_end', label: 'Learning end', type: 'time' },
]

const MODES = ['Gentle', 'Standard', 'Strict']

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { api.settings().then(setSettings) }, [])

  async function save(key, value) {
    setSettings((s) => ({ ...s, [key]: value }))
    await api.setSetting(key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="content">
      <div className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ border: 'none', padding: '0 0 14px' }}><h2>Schedule</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
          {FIELDS.map((f) => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              {f.label}
              <input
                type={f.type}
                value={settings[f.key] || ''}
                onChange={(e) => save(f.key, e.target.value)}
                style={{ padding: '9px 11px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 13 }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ border: 'none', padding: '0 0 14px' }}><h2>Accountability mode</h2></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODES.map((m) => (
            <button
              key={m}
              className={'btn' + (settings.accountability_mode === m || (!settings.accountability_mode && m === 'Standard') ? ' primary' : '')}
              onClick={() => save('accountability_mode', m)}
            >
              {m}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 10 }}>
          Gentle = minimal reminders · Standard = normal accountability · Strict = more frequent intervention on missed commitments.
        </p>
      </div>

      <div className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ border: 'none', padding: '0 0 14px' }}><h2>Notifications</h2></div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Browser notifications fire for scheduled blocks while DAYGUARD is open (installed as a PWA keeps this running
          in the background on most Android browsers). Enable notification permission when prompted on the Dashboard.
        </p>
      </div>

      {saved && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>Saved.</div>}
    </div>
  )
}
