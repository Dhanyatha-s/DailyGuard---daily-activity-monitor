import { Routes, Route } from 'react-router-dom'
import Sidebar, { BottomNav } from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Schedule from './pages/Schedule.jsx'
import Reports from './pages/Reports.jsx'
import SettingsPage from './pages/Settings.jsx'

const CRUMBS = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/schedule': 'Schedule',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export default function App() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Routes>
          <Route path="/" element={<><Topbar crumb="Today" clockedIn /><Dashboard /></>} />
          <Route path="/tasks" element={<><Topbar crumb="Tasks" /><Tasks /></>} />
          <Route path="/schedule" element={<><Topbar crumb="Schedule" /><Schedule /></>} />
          <Route path="/reports" element={<><Topbar crumb="Reports" /><Reports /></>} />
          <Route path="/settings" element={<><Topbar crumb="Settings" /><SettingsPage /></>} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
