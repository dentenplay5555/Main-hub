import React, { useEffect, useState } from 'react';
import type { TeacherSubmissionStatus } from '../../types';
import { teacherApi } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TeacherStatusPageProps {
  exId: string;
  classId: string;
  onBack: () => void;
}

export const TeacherStatusPage: React.FC<TeacherStatusPageProps> = ({ exId, classId, onBack }) => {
  const [list, setList] = useState<TeacherSubmissionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teacherApi.getStatus(exId, classId);
      setList(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดสถานะการส่งงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [exId, classId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={40} width={240} />
        <Skeleton height={300} borderRadius={16} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchStatus} />;
  }

  const submittedCount = list.filter(s => s.status === 'SUBMITTED' || s.status === 'COMPLETED').length;
  const pendingCount = list.length - submittedCount;

  const filteredList = list.filter(s => {
    if (statusFilter === 'SUBMITTED') return s.status === 'SUBMITTED' || s.status === 'COMPLETED';
    if (statusFilter === 'PENDING') return s.status === 'TODO' || s.status === 'IN_PROGRESS';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
          <ArrowLeft size={15} />
          <span>กลับไปหน้ารายงานรวม</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: statusFilter === 'ALL' ? 700 : 500,
              backgroundColor: statusFilter === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: statusFilter === 'ALL' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'ALL' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`
            }}
          >
            ทั้งหมด ({list.length})
          </button>
          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: statusFilter === 'SUBMITTED' ? 700 : 500,
              backgroundColor: statusFilter === 'SUBMITTED' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: statusFilter === 'SUBMITTED' ? 'var(--accent-emerald)' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'SUBMITTED' ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`
            }}
          >
            ส่งแล้ว ({submittedCount})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: statusFilter === 'PENDING' ? 700 : 500,
              backgroundColor: statusFilter === 'PENDING' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
              color: statusFilter === 'PENDING' ? 'var(--accent-rose)' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === 'PENDING' ? 'var(--accent-rose)' : 'var(--border-subtle)'}`
            }}
          >
            ยังไม่ส่ง ({pendingCount})
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
            สถานะการส่งงานรายบุคคล (ห้อง {classId})
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Route: /teacher/status/:exId/:classId
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>เลขที่</th>
                <th style={{ padding: '10px' }}>ชื่อ-นามสกุล</th>
                <th style={{ padding: '10px' }}>สถานะ</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>ส่วนที่ทำเสร็จ</th>
                <th style={{ padding: '10px' }}>กิจกรรมล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(s => (
                <tr key={s.userId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 700, color: '#fff' }}>{s.no}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#fff' }}>{s.name}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {s.partsCompleted} / {s.totalParts} ส่วน
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-dim)', fontSize: 12 }}>
                    {s.lastActivityAt ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
