import { CRITERIA, type Rubric } from './lib/diagnose.ts';

const LABEL: Record<string, string> = { TR: 'ใจความ', ME: 'กลศาสตร์', LR: 'คำศัพท์', GRA: 'ไวยากรณ์', CC: 'เชื่อมโยง' };

/** Five-axis radar, scores 1-5. */
export default function Radar({ rubric, color = 'var(--accent)' }: { rubric: Rubric; color?: string }) {
  const W = 300, H = 280, cx = 150, cy = 140, r = 100, a0 = -Math.PI / 2;
  const pt = (i: number, k: number, extra = 0) => {
    const a = a0 + (i * 2 * Math.PI) / CRITERIA.length;
    return { x: cx + (r * k + extra) * Math.cos(a), y: cy + (r * k + extra) * Math.sin(a) };
  };
  const ring = (lv: number) => CRITERIA.map((_, i) => { const p = pt(i, lv / 5); return `${p.x},${p.y}`; }).join(' ');
  const shape = CRITERIA.map((c, i) => { const p = pt(i, Math.max(0, Math.min(5, rubric[c] ?? 0)) / 5); return `${p.x},${p.y}`; }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="radar" role="img" aria-label="กราฟเรดาร์ 5 ทักษะ">
      {[1, 2, 3, 4, 5].map((lv) => (
        <polygon key={lv} points={ring(lv)} fill="none" stroke="var(--border)" strokeWidth={lv === 5 ? 1.6 : 1} />
      ))}
      {CRITERIA.map((c, i) => {
        const e = pt(i, 1);
        const l = pt(i, 1, 24);
        return (
          <g key={c}>
            <line x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="var(--border)" />
            <text x={l.x} y={l.y - 4} textAnchor="middle" className="radar-code">{c}</text>
            <text x={l.x} y={l.y + 9} textAnchor="middle" className="radar-label">{LABEL[c]} {rubric[c] ?? '–'}</text>
          </g>
        );
      })}
      <polygon points={shape} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
