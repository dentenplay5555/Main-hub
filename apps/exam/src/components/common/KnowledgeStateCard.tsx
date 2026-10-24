import React from 'react';
import type { KnowledgeStateType, FlagType } from '../../types';
import { BrainCircuit, AlertTriangle, Compass, ArrowRight } from 'lucide-react';

interface KnowledgeStateCardProps {
  ks: KnowledgeStateType;
  flag: FlagType;
  tips: string[];
  onConsultTeacher?: () => void;
}

export const KnowledgeStateCard: React.FC<KnowledgeStateCardProps> = ({
  ks,
  flag,
  tips,
  onConsultTeacher
}) => {
  const stateMeta = {
    Mastery: {
      title: 'กลุ่มแตกฉานรอบด้าน (Mastery)',
      badgeClass: 'pill-mastery',
      color: '#10b981',
      desc: 'เชี่ยวชาญทั้งการตอบตรงโจทย์ โครงสร้างประโยค ไวยากรณ์ และคำศัพท์ระดับสูง มีความพร้อมสู่การเขียนระดับก้าวหน้า'
    },
    'Language Dev': {
      title: 'กลุ่มเน้นพัฒนาภาษา (Language Dev)',
      badgeClass: 'pill-lang-dev',
      color: '#38bdf8',
      desc: 'โครงสร้างประโยคและตอบโจทย์ได้ดีเยี่ยม แต่ควรเน้นยกระดับความถูกต้องของไวยากรณ์ (GRA) หรือความหลากหลายของคำศัพท์ (LR)'
    },
    'Structure OK': {
      title: 'กลุ่มโครงสร้างผ่านเกณฑ์ (Structure OK)',
      badgeClass: 'pill-structure-ok',
      color: '#f59e0b',
      desc: 'เขียนประโยคความเดียวและเครื่องหมายวรรคตอนได้ถูกต้อง แนะนำเสริมความสอดคล้องและการเชื่อมโยงใจความ (Coherence)'
    },
    Beginner: {
      title: 'กลุ่มเริ่มต้นพื้นฐาน (Beginner)',
      badgeClass: 'pill-beginner',
      color: '#f43f5e',
      desc: 'ต้องการการทบทวนโครงสร้างประโยคพื้นฐาน ไวยากรณ์ และการสะกดคำ เพื่อสร้างรากฐานที่มั่นคง'
    }
  }[ks] || {
    title: ks,
    badgeClass: 'pill-lang-dev',
    color: '#38bdf8',
    desc: 'ข้อมูลการวินิจฉัยจากระบบประเมิน CbKST'
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrainCircuit size={20} color={stateMeta.color} />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
            สถานะองค์ความรู้ (Knowledge State)
          </h3>
        </div>
        <span className={`pill ${stateMeta.badgeClass}`}>
          {stateMeta.title}
        </span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.6, marginBottom: 16 }}>
        {stateMeta.desc}
      </p>

      {/* Anomaly Flag (Lucky / Careless) */}
      {flag !== 'OK' && (
        <div style={{
          backgroundColor: flag === 'Careless' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(192, 132, 252, 0.12)',
          border: `1px solid ${flag === 'Careless' ? 'rgba(249, 115, 22, 0.35)' : 'rgba(192, 132, 252, 0.35)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10
        }}>
          <AlertTriangle size={17} color={flag === 'Careless' ? '#fb923c' : '#c084fc'} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: 13, color: flag === 'Careless' ? '#fb923c' : '#c084fc', display: 'block', marginBottom: 2 }}>
              {flag === 'Careless' ? 'สัญญาณข้อผิดพลาดพลั้งเผลอ (Careless Slip)' : 'สัญญาณคะแนนกระจายผิดปกติ (Lucky Gap)'}
            </strong>
            <p style={{ fontSize: 12, color: 'var(--text-main)', margin: 0 }}>
              {flag === 'Careless'
                ? 'คะแนนรวมสูงแต่พลาดเกณฑ์ย่อยพื้นฐานบางข้อ ลองตรวจทานเครื่องหมายและการสะกดคำก่อนส่ง'
                : 'ทำแบบทดสอบย่อยผ่านแต่คะแนนภาพรวมยังต้องการการเสริมพื้นฐาน แนะนำทบทวนหลักการอย่างสม่ำเสมอ'}
            </p>
          </div>
        </div>
      )}

      {/* Actionable Tips */}
      {tips && tips.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Compass size={17} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', display: 'block', marginBottom: 2 }}>
                คำแนะนำตามกลุ่มการเรียนรู้:
              </span>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                {tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {onConsultTeacher && (
            <button
              onClick={onConsultTeacher}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '5px 10px', whiteSpace: 'nowrap', alignSelf: 'center' }}
            >
              <span>คุยกับครู</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
