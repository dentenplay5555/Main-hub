import React, { useEffect, useState } from 'react';
import type { SyncLogItem, AuditLogItem } from '../../types';
import { devApi } from '../../lib/api';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Server, Shield, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface DevLogsPageProps {
  onNavigateExercises: () => void;
  onNavigateUsers: () => void;
}

export const DevLogsPage: React.FC<DevLogsPageProps> = ({
  onNavigateExercises,
  onNavigateUsers
}) => {
  const [logType, setLogType] = useState<'sync' | 'audit'>('sync');
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sLogs, aLogs] = await Promise.all([
        devApi.getLogs('sync'),
        devApi.getLogs('audit')
      ]);
      setSyncLogs(sLogs);
      setAuditLogs(aLogs);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดบันทึกการทำงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={50} width={300} />
        <Skeleton height={400} borderRadius={16} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchLogs} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Dev Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNavigateExercises} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <Server size={15} />
            <span>Exercise Registry</span>
          </button>
          <button className="btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <span>บันทึกการทำงาน (Logs)</span>
          </button>
          <button onClick={onNavigateUsers} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <span>จัดการผู้ใช้และสิทธิ์ (Users)</span>
          </button>
        </div>
        <button onClick={fetchLogs} className="btn-secondary" style={{ fontSize: 13 }}>
          <RefreshCw size={14} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* Header */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        borderLeft: '4px solid var(--accent-purple)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
          บันทึกการทำงานของระบบ (System Logs)
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Sync Log บันทึกทุกครั้งที่ Hub API ดึงข้อมูลจาก Exercise Worker · Audit Log บันทึกทุก action ที่ผู้ใช้หรือ Dev ดำเนินการ
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--bg-surface)',
        padding: 4,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        alignSelf: 'flex-start'
      }}>
        <button
          onClick={() => setLogType('sync')}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: logType === 'sync' ? 700 : 500,
            backgroundColor: logType === 'sync' ? 'var(--accent-cyan)' : 'transparent',
            color: logType === 'sync' ? '#060e1c' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RefreshCw size={14} />
          Sync Log ({syncLogs.length})
        </button>
        <button
          onClick={() => setLogType('audit')}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: logType === 'audit' ? 700 : 500,
            backgroundColor: logType === 'audit' ? 'var(--accent-purple)' : 'transparent',
            color: logType === 'audit' ? '#060e1c' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Shield size={14} />
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Sync Logs Table */}
      {logType === 'sync' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
              Sync Log — บันทึกการซิงค์ข้อมูลจาก Exercise Workers
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px' }}>เวลา (at)</th>
                  <th style={{ padding: '12px 18px' }}>Exercise ID</th>
                  <th style={{ padding: '12px 18px' }}>สถานะ</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>แถวข้อมูล</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>ระยะเวลา (ms)</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log: SyncLogItem) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} />
                        {log.at}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--accent-cyan)', fontSize: 12 }}>
                      {log.exerciseId}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {log.ok ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          <CheckCircle2 size={15} />
                          สำเร็จ (OK)
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-rose)', fontWeight: 600 }}>
                          <AlertCircle size={15} />
                          ล้มเหลว — {log.error || 'Unknown error'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                      {log.rows.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', color: log.ms < 500 ? 'var(--accent-emerald)' : log.ms < 1500 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                      {log.ms} ms
                    </td>
                  </tr>
                ))}
                {syncLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      ยังไม่มีบันทึก Sync
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {logType === 'audit' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
              Audit Log — บันทึกการดำเนินการทั้งหมดในระบบ
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px' }}>เวลา (at)</th>
                  <th style={{ padding: '12px 18px' }}>ผู้ดำเนินการ (User)</th>
                  <th style={{ padding: '12px 18px' }}>Action</th>
                  <th style={{ padding: '12px 18px' }}>Target / รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: AuditLogItem) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} />
                        {log.at}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.userEmail}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{log.userId}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(192, 132, 252, 0.15)',
                        color: 'var(--accent-purple)',
                        fontFamily: 'monospace'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {log.target}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      ยังไม่มีบันทึก Audit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
