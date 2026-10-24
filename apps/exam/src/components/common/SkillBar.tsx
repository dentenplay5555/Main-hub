import React from 'react';

interface SkillBarProps {
  code: string;
  name: string;
  score: number;
  feedback?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export const SkillBar: React.FC<SkillBarProps> = ({
  code,
  name,
  score,
  feedback,
  isSelected,
  onClick
}) => {
  const getLevelBadge = (val: number) => {
    if (val >= 5) return { label: 'ยอดเยี่ยม', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    if (val >= 4) return { label: 'ดีมาก', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    if (val >= 3) return { label: 'ผ่าน', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    if (val >= 2) return { label: 'พัฒนา', bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' };
    return { label: 'ปรับปรุง', bg: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: 'rgba(244, 63, 94, 0.3)' };
  };

  const badge = getLevelBadge(score);
  const colorMap: Record<string, string> = {
    TR: '#38bdf8',
    ME: '#10b981',
    LR: '#818cf8',
    GRA: '#f59e0b',
    CC: '#ec4899'
  };
  const skillColor = colorMap[code] || '#38bdf8';

  return (
    <div
      onClick={onClick}
      className={onClick ? 'interactive-card' : ''}
      style={{
        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface)',
        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: skillColor, letterSpacing: '0.05em' }}>
            {code}
          </span>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {name}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`
          }}>
            {badge.label}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: score >= 3 ? '#fff' : 'var(--accent-rose)' }}>
            {score}<span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>/5</span>
          </span>
        </div>
      </div>

      {/* Progress Bar with pass marker at 60% */}
      <div style={{
        height: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${(score / 5) * 100}%`,
          backgroundColor: skillColor,
          borderRadius: 999,
          transition: 'width 0.4s ease'
        }} />
        <div style={{
          position: 'absolute',
          left: '60%',
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.4)'
        }} title="เกณฑ์ผ่าน (3.0)" />
      </div>

      {feedback && isSelected && (
        <div style={{
          marginTop: 10,
          padding: '8px 10px',
          borderRadius: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderLeft: `3px solid ${skillColor}`,
          fontSize: 12,
          color: 'var(--text-muted)'
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
};
