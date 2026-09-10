import { useState, useRef } from 'react'
import { api } from '../api.js'

// Very light heuristic classifier so voice capture works with zero AI cost
// (spec sec. 24-25: AI transformation is an optional later layer).
function classify(text) {
  const t = text.toLowerCase()
  if (t.startsWith('remind me') || t.includes('remind me to') || /\btomorrow\b/.test(t)) {
    return 'REMINDER'
  }
  if (t.includes('idea') || t.startsWith('i had an idea')) return 'IDEA'
  if (t.includes('research') || t.includes('look into')) return 'RESEARCH'
  if (/\b(finish|complete|do|call|write|build|fix|test)\b/.test(t)) return 'TASK'
  return 'NOTE'
}

export default function CaptureModal({ onClose }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saved, setSaved] = useState(false)
  const recRef = useRef(null)

  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
    }
    rec.onend = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  function stopListening() {
    recRef.current?.stop()
    setListening(false)
  }

  async function confirm() {
    setConfirmed(true)
    const kind = classify(transcript)
    if (kind === 'TASK') {
      await api.createTask({ title: transcript, category: 'OTHER', priority: 'MEDIUM' })
    } else {
      await api.createNote({ kind, content: transcript, transcript_raw: transcript })
    }
    setSaved(true)
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="k-label">CAPTURE</div>
        <h3>Capture a thought</h3>

        {!supported && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Voice input isn't supported in this browser. Type it instead.
          </p>
        )}

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Speak or type what's on your mind…"
          rows={4}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--sans)', fontSize: 13.5, marginBottom: 12 }}
        />

        {!saved ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {supported && (
                <button className="opt" style={{ margin: 0, flex: 1 }} onClick={listening ? stopListening : startListening}>
                  {listening ? 'Stop listening' : 'Start speaking'}
                </button>
              )}
              <button className="opt" style={{ margin: 0, flex: 1 }} disabled={!transcript.trim()} onClick={confirm}>
                Save
              </button>
            </div>
            <div className="cancel" onClick={onClose}>cancel</div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 12 }}>Saved as {classify(transcript).toLowerCase()}.</p>
            <div className="cancel" onClick={onClose}>close</div>
          </>
        )}
      </div>
    </div>
  )
}
