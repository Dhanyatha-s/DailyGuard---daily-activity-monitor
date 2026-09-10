export default function CheckInModal({ title, label, options, onSelect, onClose }) {
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="k-label">{label}</div>
        <h3>{title}</h3>
        {options.map((opt) => (
          <button key={opt} className="opt" onClick={() => onSelect(opt)}>{opt}</button>
        ))}
        <div className="cancel" onClick={onClose}>cancel</div>
      </div>
    </div>
  )
}
