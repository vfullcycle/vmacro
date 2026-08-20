import "./ProgressBar.css";

export default function ProgressBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="progress-bar">
      <div className="progress-bar-label">
        <span>{label}</span>
        <span>
          {Math.round(value)} / {Math.round(target)}
        </span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
