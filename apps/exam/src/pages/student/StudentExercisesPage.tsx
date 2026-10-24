import React, { useEffect, useState } from 'react';
import type { StudentExerciseItem } from '../../types';
import { studentApi } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Calendar, ExternalLink, ArrowRight, BookOpen, Clock } from 'lucide-react';

interface StudentExercisesPageProps {
  onSelectResult: (exId: string) => void;
}

export const StudentExercisesPage: React.FC<StudentExercisesPageProps> = ({ onSelectResult }) => {
  const [exercises, setExercises] = useState<StudentExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getExercises();
      // Sort by due date
      const dueTime = (d: string | null) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);
      const sorted = [...data].sort((a, b) => dueTime(a.dueAt) - dueTime(b.dueAt));
      setExercises(sorted);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายการแบบฝึกหัดได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={40} width={260} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={200} borderRadius={16} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchExercises} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
          งานของฉัน (My Assigned Exercises)
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          รายการแบบฝึกหัดการเขียนภาษาอังกฤษ เรียงตามกำหนดส่ง
        </p>
      </div>

      {/* Exercise Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {exercises.map((ex) => {
          const isSubmitted = ex.status === 'SUBMITTED' || ex.status === 'COMPLETED';
          const dueDateStr = ex.dueAt
            ? new Date(ex.dueAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'ไม่ระบุ';

          return (
            <div
              key={ex.id}
              className="glass-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                borderLeft: `4px solid ${isSubmitted ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    color: 'var(--accent-cyan)'
                  }}>
                    {ex.phase}
                  </span>
                  <StatusBadge status={ex.status} />
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {ex.name}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="var(--accent-cyan)" />
                    <span>กำหนดส่ง: {dueDateStr} (23:59 น.)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color="var(--text-dim)" />
                    <span>จำนวนครั้งที่ส่ง: <strong>{ex.attemptsUsed}</strong> จากที่อนุญาต <strong>{ex.maxAttempts}</strong> ครั้ง</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Single Big Button "ทำต่อ" (Rule 2) */}
                {ex.exerciseUrl && (
                  <a
                    href={ex.exerciseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      fontSize: 15,
                      textDecoration: 'none',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <span>ทำต่อ (เข้าสู่เว็บแบบฝึกหัด)</span>
                    <ExternalLink size={16} />
                  </a>
                )}

                {/* View Result button if already submitted */}
                {isSubmitted && (
                  <button
                    onClick={() => onSelectResult(ex.id)}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: 13, padding: '9px 16px' }}
                  >
                    <span>ดูผลการวินิจฉัย CbKST</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
