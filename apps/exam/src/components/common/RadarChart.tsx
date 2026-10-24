import React from 'react';

interface RadarChartProps {
  scores: {
    TR: number;
    ME: number;
    LR: number;
    GRA: number;
    CC: number;
  };
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 280 }) => {
  const dimensions = [
    { key: 'TR', label: 'TR (ตอบโจทย์)', val: scores.TR },
    { key: 'ME', label: 'ME (เครื่องหมาย)', val: scores.ME },
    { key: 'LR', label: 'LR (คำศัพท์)', val: scores.LR },
    { key: 'GRA', label: 'GRA (ไวยากรณ์)', val: scores.GRA },
    { key: 'CC', label: 'CC (เชื่อมโยง)', val: scores.CC },
  ];

  const center = size / 2;
  const radius = center - 45;
  const totalSides = dimensions.length;

  const getCoordinates = (index: number, value: number, max: number = 5) => {
    const angle = (Math.PI * 2 / totalSides) * index - Math.PI / 2;
    const r = (value / max) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate grid webs (levels 1 to 5)
  const webLevels = [1, 2, 3, 4, 5];

  // Polygon points for student score
  const studentPoints = dimensions.map((d, i) => {
    const { x, y } = getCoordinates(i, d.val);
    return `${x},${y}`;
  }).join(' ');

  // Pass threshold polygon (score 3)
  const passPoints = dimensions.map((_, i) => {
    const { x, y } = getCoordinates(i, 3);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Grid Webs */}
        {webLevels.map(level => {
          const points = dimensions.map((_, i) => {
            const { x, y } = getCoordinates(i, level);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={level === 3 ? 1.5 : 0.8}
              strokeDasharray={level === 3 ? '3 3' : 'none'}
            />
          );
        })}

        {/* Axis Lines & Labels */}
        {dimensions.map((d, i) => {
          const { x: ax, y: ay } = getCoordinates(i, 5);
          const { x: lx, y: ly } = getCoordinates(i, 5.8);
          return (
            <g key={d.key}>
              <line
                x1={center}
                y1={center}
                x2={ax}
                y2={ay}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#94a3b8"
                fontSize={11}
                fontWeight={600}
              >
                {d.key} ({d.val})
              </text>
            </g>
          );
        })}

        {/* Pass Threshold Outline (Score = 3) */}
        <polygon
          points={passPoints}
          fill="none"
          stroke="rgba(245, 158, 11, 0.4)"
          strokeWidth={1}
          strokeDasharray="4 2"
        />

        {/* Student Score Area */}
        <polygon
          points={studentPoints}
          fill="rgba(56, 189, 248, 0.25)"
          stroke="#38bdf8"
          strokeWidth={2}
        />

        {/* Vertex Points */}
        {dimensions.map((d, i) => {
          const { x, y } = getCoordinates(i, d.val);
          return (
            <circle
              key={d.key}
              cx={x}
              cy={y}
              r={4}
              fill="#38bdf8"
              stroke="#060e1c"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, backgroundColor: 'rgba(56, 189, 248, 0.4)', border: '1px solid #38bdf8' }} />
          คะแนนของฉัน
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 0, borderBottom: '1px dashed #f59e0b' }} />
          เกณฑ์ผ่าน (3.0)
        </span>
      </div>
    </div>
  );
};
