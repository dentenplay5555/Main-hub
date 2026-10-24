import React from 'react';

interface ScoreDistProps {
  distribution: Array<{ range: string; count: number }>;
}

export const ScoreDist: React.FC<ScoreDistProps> = ({ distribution }) => {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
          การกระจายคะแนน (Score Distribution)
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>เต็ม 25 คะแนน</span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 120,
        paddingTop: 16,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {distribution.map(item => {
          const barHeight = Math.max((item.count / maxCount) * 85, 6);
          return (
            <div key={item.range} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 44 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.count}</span>
              <div style={{
                width: 32,
                height: barHeight,
                backgroundColor: 'rgba(56, 189, 248, 0.45)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.4s ease'
              }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
