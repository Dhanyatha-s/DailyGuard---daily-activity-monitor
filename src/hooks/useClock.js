import { useEffect, useState } from 'react'

export function useClock(intervalMs = 30000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function hhmm(d = new Date()) {
  return d.toTimeString().slice(0, 5)
}
