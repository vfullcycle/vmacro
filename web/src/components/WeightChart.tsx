interface WeightPoint {
  logged_at: string;
  weight_kg: number;
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 32;

export default function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length < 2) {
    return <p className="weight-chart-empty">ต้องมีอย่างน้อย 2 log ถึงจะขึ้นกราฟ trend ได้</p>;
  }

  const times = data.map((d) => new Date(d.logged_at).getTime());
  const weights = data.map((d) => d.weight_kg);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightPad = (maxWeight - minWeight || 1) * 0.15;
  const yLo = minWeight - weightPad;
  const yHi = maxWeight + weightPad;

  const xScale = (t: number) => (maxTime === minTime ? PADDING : PADDING + ((t - minTime) / (maxTime - minTime)) * (WIDTH - 2 * PADDING));
  const yScale = (w: number) => HEIGHT - PADDING - ((w - yLo) / (yHi - yLo)) * (HEIGHT - 2 * PADDING);

  const points = data.map((d) => `${xScale(new Date(d.logged_at).getTime())},${yScale(d.weight_kg)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="weight-chart" role="img" aria-label="กราฟ trend น้ำหนัก">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={2} />
      {data.map((d) => (
        <circle key={d.logged_at} cx={xScale(new Date(d.logged_at).getTime())} cy={yScale(d.weight_kg)} r={3} fill="var(--accent)" />
      ))}
      <text x={PADDING} y={HEIGHT - 8} fontSize={11} fill="var(--text)">
        {new Date(minTime).toLocaleDateString("th-TH")}
      </text>
      <text x={WIDTH - PADDING} y={HEIGHT - 8} fontSize={11} fill="var(--text)" textAnchor="end">
        {new Date(maxTime).toLocaleDateString("th-TH")}
      </text>
      <text x={PADDING} y={14} fontSize={11} fill="var(--text)">
        {maxWeight.toFixed(1)} kg
      </text>
      <text x={PADDING} y={HEIGHT - PADDING} fontSize={11} fill="var(--text)">
        {minWeight.toFixed(1)} kg
      </text>
    </svg>
  );
}
