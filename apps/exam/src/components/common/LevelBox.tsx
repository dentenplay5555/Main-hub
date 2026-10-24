import React from 'react';
import { Trophy, Star } from 'lucide-react';

interface LevelBoxProps {
  level: {
    n: number;
    name: string;
    xp: number;
  };
  binaryTotal: number;
  rubricTotal: number;
}

export const LevelBox: React.FC<LevelBoxProps> = ({ level, binaryTotal, rubricTotal }) => {
  return (
    <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(56, 189, 248, 0.4)',
          position: 'relative',
          flexShrink: 0
        }}>
          <Trophy size={30} color="#060e1c" strokeWidth={2.4} />
          <span style={{
            position: 'absolute',
            bottom: -5,
            fontSize: 10,
            fontWeight: 800,
            backgroundColor: '#0a1628',
            color: 'var(--accent-cyan)',
            padding: '1px 6px',
            borderRadius: 999,
            border: '1px solid var(--accent-cyan)'
          }}>
            LV.{level.n}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ระดับความสามารถ</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={12}
                  fill={star <= level.n ? '#f59e0b' : 'none'}
                  color={star <= level.n ? '#f59e0b' : 'var(--text-dim)'}
                />
              ))}
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            {level.name}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            ผ่าน CbKST: <strong style={{ color: 'var(--accent-cyan)' }}>{binaryTotal}/9 items</strong> · รูบริก: <strong style={{ color: 'var(--accent-emerald)' }}>{rubricTotal}/25</strong>
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>ความก้าวหน้า XP</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{level.xp} / 100 XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${level.xp}%`,
            background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
            borderRadius: 999,
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
            transition: 'width 0.6s ease'
          }} />
        </div>
      </div>
    </div>
  );
};
