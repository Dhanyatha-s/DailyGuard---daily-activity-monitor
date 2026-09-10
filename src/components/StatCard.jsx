export default function StatCard({ label, value, sub, brand }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={'stat-value' + (brand ? ' brand' : '')}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
