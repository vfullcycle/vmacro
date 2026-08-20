import type { ReactNode } from "react";
import "./DonutRing.css";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

// Composition donut (not a target-progress ring) — segment sizes are proportions of
// whatever `value` represents (grams, etc.), not consumed-vs-target (FR-DASH-1
// amendment, 2026-08-20). Renders as a CSS conic-gradient rather than SVG arcs since
// the segment count varies (up to 7 for the "other nutrients" breakout ring).
export default function DonutRing({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel?: ReactNode }) {
  const present = segments.filter((s) => s.value > 0);
  const total = present.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  let acc = 0;
  const stops = present
    .map((seg) => {
      const start = (acc / total) * 100;
      acc += seg.value;
      const end = (acc / total) * 100;
      return `${seg.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-ring-wrap">
      <div className="donut-ring" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-ring-hole">{centerLabel}</div>
      </div>
      <ul className="donut-ring-legend">
        {present.map((seg) => (
          <li key={seg.key}>
            <span className="donut-ring-swatch" style={{ background: seg.color }} />
            {seg.label} {Math.round((seg.value / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
