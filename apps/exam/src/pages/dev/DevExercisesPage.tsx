import React, { useEffect, useState } from 'react';
import type { DevExerciseItem, ExerciseDefinition } from '../../types';
import { devApi } from '../../lib/api';
import { RegisterExerciseModal } from '../../components/DevView/RegisterExerciseModal';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import {
  Server,
  Plus,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCw,
  Copy,
  Check
} from 'lucide-react';

interface DevExercisesPageProps {
  onNavigateLogs: () => void;
  onNavigateUsers: () => void;
}

export const DevExercisesPage: React.FC<DevExercisesPageProps> = ({
  onNavigateLogs,
  onNavigateUsers
}) => {
  const [exercises, setExercises] = useState<DevExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [secretModal, setSecretModal] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await devApi.getExercises();
      setExercises(res);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายการ Exercise Registry ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleTestRoutes = async (id: string) => {
    setTestingId(id);
    try {
      const res = await devApi.testExercise(id);
      if (res.ok) {
        alert('ผลการทดสอบเส้นทางทั้ง 4 เส้นทาง: ผ่านสมบูรณ์ (200 OK)');
      }
    } catch (err: any) {
      alert(`การทดสอบเส้นทางล้มเหลว: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncExercise = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await devApi.syncExercise(id);
      alert(`ซิงค์ข้อมูลสำเร็จ! อัปเดต ${res.rows} แถวข้อมูลใน Hub DB`);
      fetchExercises();
    } catch (err: any) {
      alert(`การซิงค์ข้อมูลล้มเหลว: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRotateSecret = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการสลับกุญแจลับ (HMAC Secret)? เว็บแบบฝึกหัดจะต้องอัปเดต Environment Variable ใหม่')) {
      return;
    }
    try {
      const res = await devApi.rotateSecret(id);
      setSecretModal({ id, secret: res.secret });
    } catch (err: any) {
      alert(`ไม่สามารถสลับกุญแจลับได้: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={50} width={300} />
        <Skeleton height={140} borderRadius={16} />
        <Skeleton height={300} borderRadius={16} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchExercises} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Dev Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <Server size={15} />
            <span>Exercise Registry ({exercises.length})</span>
          </button>
          <button onClick={onNavigateLogs} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <span>บันทึกการทำงาน (Logs)</span>
          </button>
          <button onClick={onNavigateUsers} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <span>จัดการผู้ใช้และสิทธิ์ (Users)</span>
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ fontSize: 13, padding: '7px 16px', backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
        >
          <Plus size={16} />
          <span>ลงทะเบียนแบบฝึกหัดใหม่ (Wizard)</span>
        </button>
      </div>

      {/* Header Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)'
            }}>
              HUB CORE CONTROLLER
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent-emerald)' }}>● All endpoints monitored</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '4px 0' }}>
            ระบบควบคุมทะเบียนแบบฝึกหัด (Exercise Registry)
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            ควบคุม URL ปลายทางของแบบฝึกหัดอิสระ ตรวจสอบสัญญาเชื่อมต่อ (API Contract) และจัดการกุญแจความปลอดภัย HMAC
          </p>
        </div>

        <button onClick={fetchExercises} className="btn-secondary" style={{ fontSize: 13 }}>
          <RefreshCw size={14} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Exercises Table / Cards */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            รายการแบบฝึกหัดที่ลงทะเบียนไว้ใน Hub
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            รวม {exercises.length} ชุดแบบฝึกหัด
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px' }}>ชื่อแบบฝึกหัด / ID</th>
                <th style={{ padding: '12px 18px' }}>Base URL (Worker Target)</th>
                <th style={{ padding: '12px 18px' }}>สถานะระบบ</th>
                <th style={{ padding: '12px 18px' }}>เวอร์ชัน Manifest</th>
                <th style={{ padding: '12px 18px' }}>ซิงค์ล่าสุด</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map(ex => (
                <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {ex.name}
                      {ex.rosterSource && (
                        <span style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-cyan)'
                        }}>
                          Roster Master
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      {ex.id}
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <a
                      href={ex.baseUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--accent-cyan)',
                        textDecoration: 'none',
                        fontFamily: 'monospace',
                        fontSize: 12
                      }}
                    >
                      <span>{ex.baseUrl}</span>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {ex.health === 'healthy' ? (
                        <>
                          <CheckCircle2 size={15} color="var(--accent-emerald)" />
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>ปกติ (Healthy)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={15} color="var(--accent-rose)" />
                          <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>มีปัญหา ({ex.lastError})</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    v{ex.manifestVersion}
                  </td>
                  <td style={{ padding: '16px 18px', color: 'var(--text-muted)' }}>
                    {ex.lastSyncAt}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => handleTestRoutes(ex.id)}
                        disabled={testingId === ex.id}
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        title="ทดสอบ 4 เส้นทางสัญญา API"
                      >
                        <ShieldCheck size={13} />
                        <span>{testingId === ex.id ? 'กำลังทดสอบ...' : 'ทดสอบ Route'}</span>
                      </button>

                      <button
                        onClick={() => handleSyncExercise(ex.id)}
                        disabled={syncingId === ex.id}
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        title="สั่งซิงค์ข้อมูลลงฐานข้อมูล Hub ทันที"
                      >
                        <RotateCw size={13} />
                        <span>{syncingId === ex.id ? 'กำลังซิงค์...' : 'Sync'}</span>
                      </button>

                      <button
                        onClick={() => handleRotateSecret(ex.id)}
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        title="สลับกุญแจลับ HMAC Secret"
                      >
                        <Key size={13} />
                        <span>สลับกุญแจ</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret Modal */}
      {secretModal && (
        <div className="modal-overlay" onClick={() => setSecretModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Key size={22} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                กุญแจลับใหม่ (New HMAC Secret)
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
              กุญแจลับสำหรับ Exercise ID <code style={{ color: 'var(--accent-cyan)' }}>{secretModal.id}</code> ถูกสร้างใหม่แล้ว กรุณานำไปใส่ใน Cloudflare Worker Environment Variable ของเว็บแบบฝึกหัด
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 16
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-emerald)', wordBreak: 'break-all' }}>
                {secretModal.secret}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(secretModal.secret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-secondary"
                style={{ fontSize: 11, padding: '4px 8px', marginLeft: 8 }}
              >
                {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
            <button onClick={() => setSecretModal(null)} className="btn-primary" style={{ width: '100%' }}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Register Exercise Wizard Modal */}
      {showAddModal && (
        <RegisterExerciseModal
          onClose={() => {
            setShowAddModal(false);
            fetchExercises();
          }}
          onAddExercise={(_newEx: ExerciseDefinition) => {
            setShowAddModal(false);
            fetchExercises();
          }}
        />
      )}
    </div>
  );
};
