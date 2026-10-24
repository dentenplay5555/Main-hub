import React from 'react';

interface ItemDifficultyProps {
  items: Array<{
    id: string;
    passPct: number;
    tag: 'ง่าย' | 'ปานกลาง' | 'ยาก';
  }>;
}

export const ItemDifficulty: React.FC<ItemDifficultyProps> = ({ items }) => {
  const getTagColor = (tag: 'ง่าย' | 'ปานกลาง' | 'ยาก') => {
    if (tag === 'ง่าย') return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' };
    if (tag === 'ปานกลาง') return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
    return { color: '#fb7185', bg: 'rgba(244, 63, 94, 0.15)' };
  };

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
          ความยากรายข้อ (Item Difficulty q1–q9)
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>CbKST Binary</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {items.map(item => {
          const tagStyle = getTagColor(item.tag);
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{item.id.toUpperCase()}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: tagStyle.color,
                  backgroundColor: tagStyle.bg,
                  padding: '1px 5px',
                  borderRadius: 3
                }}>
                  {item.tag}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: tagStyle.color, fontFamily: 'var(--font-heading)' }}>
                {item.passPct}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                ผ่านเกณฑ์
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
