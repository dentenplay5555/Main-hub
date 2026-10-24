import React, { useEffect, useState } from 'react';
import type { StudentResultPayload } from '../../types';
import { studentApi } from '../../lib/api';
import { LevelBox } from '../../components/common/LevelBox';
import { KnowledgeStateCard } from '../../components/common/KnowledgeStateCard';
import { SkillBar } from '../../components/common/SkillBar';
import { BadgeGrid } from '../../components/common/BadgeGrid';
import { RadarChart } from '../../components/common/RadarChart';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { ArrowLeft, MessageSquare, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface StudentResultPageProps {
  exId: string;
  onBack: () => void;
  onSelectExercise: (exId: string) => void;
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({
  exId,
  onBack,
  onSelectExercise
}) => {
  const [data, setData] = useState<StudentResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<'TR' | 'ME' | 'LR' | 'GRA' | 'CC'>('TR');
  const [showConsultDialog, setShowConsultDialog] = useState(false);

  const fetchResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.getResult(exId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดผลสอบได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [exId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={40} width={200} />
        <Skeleton height={140} borderRadius={16} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <Skeleton height={220} borderRadius={16} />
          <Skeleton height={220} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchResult} />;
  }

  if (!data) return null;

  // Status "ยังไม่ได้ส่งงาน" - Specific Page Telling Student to Contact Teacher (Rule 2)
  if (data.status === 'TODO') {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '36px', borderLeft: '4px solid var(--accent-rose)' }}>
          <AlertCircle size={48} color="var(--accent-rose)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            ยังไม่พบประวัติการส่งงานในระบบ
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
            คุณยังไม่ได้ส่งงานชุด <strong>{data.exercise.name}</strong> กรุณาเข้าทำแบบฝึกหัดในเว็บต้นทาง หรือติดต่ออาจารย์ผู้สอนประจำวิชา
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={onBack} className="btn-secondary">
              <ArrowLeft size={15} />
              <span>กลับไปหน้ารวมแบบฝึก</span>
            </button>
            <button onClick={() => setShowConsultDialog(true)} className="btn-primary">
              <MessageSquare size={15} />
              <span>ติดต่อครูผู้สอน</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const seriesTabs = [
    { id: 'prism-fanboys-pretest', label: 'Pretest' },
    { id: 'prism-fanboys-c1', label: 'Cycle 1' },
    { id: 'prism-fanboys-c2', label: 'Cycle 2' },
    { id: 'prism-fanboys-post', label: 'Post Test' }
  ];

  const skillNames: Record<'TR' | 'ME' | 'LR' | 'GRA' | 'CC', string> = {
    TR: 'Task Response',
    ME: 'Mechanics',
    LR: 'Lexical Resource',
    GRA: 'Grammar & Accuracy',
    CC: 'Coherence & Cohesion'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Top Header & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
          <ArrowLeft size={15} />
          <span>กลับหน้ารายการแบบฝึก</span>
        </button>

        {/* Series Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface)',
          padding: 3,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          {seriesTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onSelectExercise(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: tab.id === exId ? 700 : 500,
                backgroundColor: tab.id === exId ? 'var(--accent-cyan)' : 'transparent',
                color: tab.id === exId ? '#060e1c' : 'var(--text-muted)',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student Profile Card (Rule 2) */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        borderLeft: '4px solid var(--accent-cyan)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)',
              padding: '2px 8px',
              borderRadius: 4
            }}>
              ห้อง {data.student.class} · เลขที่ {data.student.no}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ส่งแล้ว (ใช้สิทธิ์ {data.attempts.used}/{data.attempts.max} ครั้ง)
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
            {data.student.name}
          </h1>

          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            แบบฝึกหัด: <strong style={{ color: '#fff' }}>{data.exercise.name}</strong>
          </div>
        </div>

        <button
          onClick={() => setShowConsultDialog(true)}
          className="btn-primary"
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          <MessageSquare size={16} />
          <span>คุยกับครู</span>
        </button>
      </div>

      {/* Level Card & Knowledge State Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <LevelBox
          level={data.level}
          binaryTotal={data.binaryTotal}
          rubricTotal={data.rubricTotal}
        />
        <KnowledgeStateCard
          ks={data.ks}
          flag={data.flag}
          tips={data.tips}
          onConsultTeacher={() => setShowConsultDialog(true)}
        />
      </div>

      {/* 5 Competencies & Radar Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>
          คะแนนรูบริก 5 มิติ และแผนภูมิเรดาร์ (5 Writing Competencies)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
          {/* Radar Chart */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart scores={data.scores} />
          </div>

          {/* 5 Competency Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['TR', 'ME', 'LR', 'GRA', 'CC'] as const).map(code => (
              <SkillBar
                key={code}
                code={code}
                name={skillNames[code]}
                score={data.scores[code]}
                feedback={data.feedback[code]}
                isSelected={selectedSkill === code}
                onClick={() => setSelectedSkill(code)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CbKST 9 Binary Items (q1-q9) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
            CbKST 9 Binary Items (q1–q9)
          </h3>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-cyan)' }}>
            ผ่าน {data.binaryTotal} / 9 ข้อ
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {Object.entries(data.binary).map(([itemId, passed]) => (
            <div
              key={itemId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`
              }}
            >
              {passed ? (
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
              ) : (
                <XCircle size={16} color="var(--accent-rose)" />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: passed ? '#fff' : 'var(--text-dim)' }}>
                {itemId.toUpperCase()}: {passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <BadgeGrid badges={data.badges} />

      {/* Consult Teacher Dialog Modal */}
      {showConsultDialog && (
        <div className="modal-overlay" onClick={() => setShowConsultDialog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px', maxWidth: 520 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
              ส่งข้อความปรึกษาอาจารย์ผู้สอน
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              ระบบจะแนบผลคะแนน CbKST ({data.level.name}, KS: {data.ks}) ไปพร้อมข้อความอัตโนมัติ
            </p>
            <textarea
              rows={4}
              placeholder="พิมพ์คำถามหรือจุดที่ต้องการขอคำแนะนำ..."
              defaultValue="สวัสดีครับอาจารย์ อยากขอคำแนะนำเพิ่มเติมเรื่องการใช้ FANBOYS เชื่อมประโยคครับ"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--bg-deep)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowConsultDialog(false)} className="btn-secondary">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  alert('ส่งข้อความถึงอาจารย์ผู้สอนเรียบร้อยแล้ว!');
                  setShowConsultDialog(false);
                }}
                className="btn-primary"
              >
                ส่งข้อความ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
