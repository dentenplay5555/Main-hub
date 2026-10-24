import React, { useEffect, useState } from 'react';
import type { StudentResultPayload } from '../../types';
import { teacherApi } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LevelBox } from '../../components/common/LevelBox';
import { KnowledgeStateCard } from '../../components/common/KnowledgeStateCard';
import { SkillBar } from '../../components/common/SkillBar';
import { BadgeGrid } from '../../components/common/BadgeGrid';
import { RadarChart } from '../../components/common/RadarChart';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { PrintButton } from '../../components/common/PrintButton';
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, User } from 'lucide-react';

interface TeacherStudentResultPageProps {
  exId: string;
  userId: string;
  classId?: string;
  onBack: () => void;
}

export const TeacherStudentResultPage: React.FC<TeacherStudentResultPageProps> = ({
  exId,
  userId,
  classId,
  onBack
}) => {
  const [data, setData] = useState<StudentResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teacherApi.getStudentResult(exId, userId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดผลคะแนนรายนักเรียนได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentResult();
  }, [exId, userId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={40} width={220} />
        <Skeleton height={140} borderRadius={16} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <Skeleton height={260} borderRadius={16} />
          <Skeleton height={260} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchStudentResult} />;
  }

  if (!data) return null;

  const binaryItemLabels: Record<string, string> = {
    q1: 'q1: ตอบตรงประเด็น (TR ≥ 3)',
    q2: 'q2: เนื้อหาครบถ้วน (TR ≥ 4)',
    q3: 'q3: ไวยากรณ์พื้นฐานถูกต้อง (ME ≥ 3)',
    q4: 'q4: สะกดคำแม่นยำ (ME ≥ 4)',
    q5: 'q5: คำศัพท์เหมาะสมระดับชั้น (LR ≥ 3)',
    q6: 'q6: ความหลากหลายทางภาษา (LR ≥ 4)',
    q7: 'q7: โครงสร้างประโยคสมบูรณ์ (GRA ≥ 4)',
    q8: 'q8: ใช้คำเชื่อม FANBOYS ถูกต้อง (CC ≥ 3)',
    q9: 'q9: ย่อหน้าลื่นไหลไม่สะดุด (CC ≥ 4)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
          <ArrowLeft size={15} />
          <span>กลับหน้ารายงานห้อง {classId || data.student.class}</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <PrintButton />
        </div>
      </div>

      {/* Student Profile Header */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        borderLeft: '4px solid var(--accent-cyan)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <User size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)'
              }}>
                เลขที่ {data.student.no} · ห้อง {data.student.class}
              </span>
              <StatusBadge status={data.status} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '4px 0' }}>
              {data.student.name}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              ชุดแบบฝึก: <strong style={{ color: 'var(--text-primary)' }}>{data.exercise.name}</strong> · จำนวนครั้งที่ทำ: {data.attempts.used}/{data.attempts.max}
            </p>
          </div>
        </div>

        {/* Level and Summary Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>คะแนนรูบริกรวม</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {data.rubricTotal} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/ 25</span>
            </div>
          </div>
          <div style={{ width: 1, height: 40, backgroundColor: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ผ่านเกณฑ์ย่อย (TOT)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
              {data.binaryTotal} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/ 9</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Knowledge State & Level Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <KnowledgeStateCard ks={data.ks} flag={data.flag} tips={data.tips} />
        <LevelBox level={data.level} binaryTotal={data.binaryTotal} rubricTotal={data.rubricTotal} />
      </div>

      {/* Row 2: Radar Chart & 5 Skills Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Radar Chart */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', alignSelf: 'flex-start', margin: '0 0 16px' }}>
            แผนภูมิสมรรถนะ (Competency Radar)
          </h3>
          <RadarChart scores={data.scores} size={250} />
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>TR: Task Response</span>
            <span>ME: Mechanics</span>
            <span>LR: Lexical</span>
            <span>GRA: Grammar</span>
            <span>CC: Cohesion</span>
          </div>
        </div>

        {/* Skill Bars */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
            คะแนนตามเกณฑ์รูบริก 5 มิติ (เต็ม 5)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkillBar code="TR" name="Task Response (การตอบตรงโจทย์)" score={data.scores.TR} />
            <SkillBar code="ME" name="Mechanics (กลไกการเขียน/สะกดคำ)" score={data.scores.ME} />
            <SkillBar code="LR" name="Lexical Resource (คลังคำศัพท์)" score={data.scores.LR} />
            <SkillBar code="GRA" name="Grammar & Accuracy (ไวยากรณ์และความถูกต้อง)" score={data.scores.GRA} />
            <SkillBar code="CC" name="Coherence & Cohesion (ความเชื่อมโยง/FANBOYS)" score={data.scores.CC} />
          </div>
        </div>
      </div>

      {/* Row 3: Binary Checklist (q1 - q9) */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            ผลการประเมิน 9 เกณฑ์ย่อย (Pre-computed Binary Checklist)
          </h3>
          <span style={{ fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 600 }}>
            ผ่าน {data.binaryTotal} จาก 9 เกณฑ์
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {Object.entries(data.binary).map(([key, passed]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: passed ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 113, 133, 0.08)',
                border: `1px solid ${passed ? 'rgba(52, 211, 153, 0.25)' : 'rgba(251, 113, 133, 0.25)'}`
              }}
            >
              {passed ? (
                <CheckCircle2 size={18} color="var(--accent-emerald)" />
              ) : (
                <XCircle size={18} color="var(--accent-rose)" />
              )}
              <span style={{ fontSize: 13, color: passed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {binaryItemLabels[key] || key}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Diagnostic Feedback & Pedagogical Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Feedback */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
            ข้อเสนอแนะเชิงวินิจฉัย (Rubric Diagnostic Feedback)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.feedback).map(([code, text]) => (
              <div key={code} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)' }}>
                <strong style={{ color: 'var(--accent-cyan)', fontSize: 12, marginRight: 6 }}>[{code}]:</strong>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips for Teacher Interventions */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Lightbulb size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
              แนวทางเสริมทักษะสำหรับครู (Pedagogical Interventions)
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.tips.map((tip, idx) => (
              <li key={idx} style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Row 5: Badges */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
          เหรียญตราเกียรติยศ (Badges)
        </h3>
        <BadgeGrid badges={data.badges} />
      </div>
    </div>
  );
};
