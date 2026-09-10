import { useState } from 'react'
import { useClock, hhmm } from '../hooks/useClock.js'
import CaptureModal from './CaptureModal.jsx'

export default function Topbar({ crumb, clockedIn }) {
  const now = useClock()
  const [capturing, setCapturing] = useState(false)

  return (
    <div className="topbar">
      <div className="breadcrumb">Home / <b>{crumb}</b></div>
      <div className="topbar-right">
        {clockedIn && <div className="clockin">Clocked in · {hhmm(now)}</div>}
        <button className="mic-btn" title="Capture a thought" onClick={() => setCapturing(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
        </button>
        <div className="avatar">D</div>
      </div>
      {capturing && <CaptureModal onClose={() => setCapturing(false)} />}
    </div>
  )
}
