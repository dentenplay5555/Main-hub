import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trendText?: string;
  trendColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  trendText,
  trendColor = 'var(--accent-cyan)'
}) => {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{title}</span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)' }}>
          {value}
        </span>
        {subValue && (
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {subValue}
          </span>
        )}
      </div>

      {trendText && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 8, fontWeight: 500 }}>
          {trendText}
        </div>
      )}
    </div>
  );
};
