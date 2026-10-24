import React from 'react';
import type { BadgeItem } from '../../types';
import { Award, Lock, Clock } from 'lucide-react';

interface BadgeGridProps {
  badges: BadgeItem[];
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges }) => {
  const getBadgeIcon = (id: string) => {
    switch (id) {
      case 'first-draft': return '⚡';
      case 'target-sniper': return '🎯';
      case 'bridge-builder': return '🌉';
      case 'sharp-eye': return '🔍';
      case 'rocket-climber': return '🚀';
      case 'calm-mind': return '🧘';
      default: return '🏆';
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} color="#f59e0b" />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
            เหรียญตราเกียรติยศ (Badges)
          </h3>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ปลดล็อกแล้ว <strong style={{ color: '#f59e0b' }}>{badges.filter(b => b.earned).length}</strong> / {badges.length} เหรียญ
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {badges.map(badge => {
          const isPending = badge.isPending || (!badge.earned && (badge.id === 'rocket-climber' || badge.id === 'calm-mind'));
          return (
            <div
              key={badge.id}
              style={{
                padding: '14px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: badge.earned ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${badge.earned ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: badge.earned ? 1 : 0.5
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: badge.earned ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}>
                {badge.earned ? getBadgeIcon(badge.id) : isPending ? <Clock size={16} color="var(--text-dim)" /> : <Lock size={16} color="var(--text-dim)" />}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: badge.earned ? '#fff' : 'var(--text-dim)' }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>
                  {isPending ? 'รอข้อมูล (รอบถัดไป)' : badge.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
