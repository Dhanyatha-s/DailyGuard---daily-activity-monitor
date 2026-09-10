import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="brand">DAYGUARD<span>.</span></div>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-dot" /> {item.label}
        </NavLink>
      ))}
      <div className="sidebar-foot">Shift ends 17:00</div>
    </div>
  )
}

export function BottomNav() {
  return (
    <div className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => 'bn-item' + (isActive ? ' active' : '')}
        >
          <span className="bn-dot" />{item.label}
        </NavLink>
      ))}
    </div>
  )
}
