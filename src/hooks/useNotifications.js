import { useEffect, useRef } from 'react'

/**
 * Schedules local notifications for today's schedule blocks while the app is
 * open (spec sec. 27-29). True background push isn't possible on a static
 * free host without a push service, so this fires while the tab/PWA is
 * running and relies on the service worker for the actual notification UI
 * so it still appears if the tab is backgrounded but the PWA process is alive.
 */
export function useScheduleNotifications(blocks) {
  const firedRef = useRef(new Set())

  useEffect(() => {
    if (!blocks || blocks.length === 0) return
    if (typeof Notification === 'undefined') return

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    const timers = []
    const now = new Date()

    blocks.forEach((b) => {
      if (b.status === 'COMPLETE') return
      const [h, m] = b.start_time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const delay = target - now
      if (delay <= 0 || delay > 12 * 60 * 60 * 1000) return // only schedule within the next 12h

      const key = `${b.id}-${b.start_time}`
      const t = setTimeout(() => {
        if (firedRef.current.has(key)) return
        firedRef.current.add(key)
        fireNotification(b.title, `Scheduled to start now (${b.start_time})`)
      }, delay)
      timers.push(t)
    })

    return () => timers.forEach(clearTimeout)
  }, [blocks])
}

export function fireNotification(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: `DAYGUARD — ${title}`,
      options: { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
    })
  } else {
    new Notification(`DAYGUARD — ${title}`, { body, icon: '/icons/icon-192.png' })
  }
}
