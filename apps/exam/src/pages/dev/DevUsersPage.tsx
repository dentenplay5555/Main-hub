import React, { useEffect, useState } from 'react';
import type { DevUserItem, Role } from '../../types';
import { devApi } from '../../lib/api';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Server, Users, Shield, RefreshCw, Search, ChevronDown, Check, GraduationCap, UserCheck, Terminal, BookOpen, Calendar, Clock, Edit2 } from 'lucide-react';

interface DevUsersPageProps {
  onNavigateExercises: () => void;
  onNavigateLogs: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'student', label: 'นักเรียน (Student)', icon: <GraduationCap size={14} />, color: 'var(--accent-cyan)' },
  { value: 'teacher', label: 'ครูผู้สอน (Teacher)', icon: <UserCheck size={14} />, color: 'var(--accent-emerald)' },
  { value: 'dev', label: 'ผู้ดูแลระบบ (Dev/Admin)', icon: <Terminal size={14} />, color: 'var(--accent-purple)' }
];

const AVAILABLE_CLASSES = ['ม.3/1', 'ม.3/2', 'ม.3/3', 'ม.3/4', 'ม.3/5', 'ม.3/6'];

export const DevUsersPage: React.FC<DevUsersPageProps> = ({
  onNavigateExercises,
  onNavigateLogs
}) => {
  const [users, setUsers] = useState<DevUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Teacher classes modal state
  const [editingTeacherClasses, setEditingTeacherClasses] = useState<{ id: string; name: string; classes: string[] } | null>(null);

  // Assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignExId, setAssignExId] = useState('prism-fanboys-pretest');
  const [assignClasses, setAssignClasses] = useState<string[]>(['ม.3/1']);
  const [assignDueAt, setAssignDueAt] = useState('2026-10-31T23:59');
  const [assignSaving, setAssignSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await devApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleUpdate = async (userId: string, newRole: Role) => {
    setSavingId(userId);
    try {
      await devApi.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingRoleId(null);
    } catch (err: any) {
      alert(`ไม่สามารถแก้ไขสิทธิ์ได้: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveTeacherClasses = async () => {
    if (!editingTeacherClasses) return;
    setSavingId(editingTeacherClasses.id);
    try {
      await devApi.updateTeacherClasses({
        teacherId: editingTeacherClasses.id,
        classIds: editingTeacherClasses.classes
      });
      setUsers(prev => prev.map(u => u.id === editingTeacherClasses.id ? { ...u, classes: editingTeacherClasses.classes } : u));
      setEditingTeacherClasses(null);
      alert('บันทึกการผูกห้องเรียนกับครูผู้สอนเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกการผูกห้องได้: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAssignments = async () => {
    setAssignSaving(true);
    try {
      await devApi.updateAssignments({
        exerciseId: assignExId,
        classIds: assignClasses,
        dueAt: assignDueAt
      });
      alert('บันทึกการมอบหมายแบบฝึกหัดและกำหนดส่งสำเร็จ');
      setShowAssignmentModal(false);
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกการมอบหมายได้: ${err.message}`);
    } finally {
      setAssignSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleOption = (role: Role) => ROLE_OPTIONS.find(r => r.value === role);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={50} width={300} />
        <Skeleton height={400} borderRadius={16} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchUsers} />;
  }

  const studentCount = users.filter(u => u.role === 'student').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const devCount = users.filter(u => u.role === 'dev').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Dev Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNavigateExercises} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <Server size={15} />
            <span>Exercise Registry</span>
          </button>
          <button onClick={onNavigateLogs} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <span>บันทึกการทำงาน (Logs)</span>
          </button>
          <button className="btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>
            <Users size={15} />
            <span>จัดการผู้ใช้และสิทธิ์ (Users)</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="btn-primary"
            style={{ fontSize: 13, padding: '7px 16px', backgroundColor: 'var(--accent-cyan)', color: '#060e1c', fontWeight: 700 }}
          >
            <Calendar size={15} />
            <span>มอบหมายแบบฝึกหัด (Assignments)</span>
          </button>
          <button onClick={fetchUsers} className="btn-secondary" style={{ fontSize: 13 }}>
            <RefreshCw size={14} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        borderLeft: '4px solid var(--accent-emerald)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
          จัดการผู้ใช้งานและสิทธิ์ในระบบ (User & Role Management)
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          แก้ไข Role ผู้ใช้ · ผูกห้องเรียนกับครูผู้สอน · ตั้งค่าการมอบหมายแบบฝึกหัด
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--accent-cyan)', marginBottom: 6, fontWeight: 600 }}>นักเรียน (Student)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{studentCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--accent-emerald)', marginBottom: 6, fontWeight: 600 }}>ครูผู้สอน (Teacher)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{teacherCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginBottom: 6, fontWeight: 600 }}>ผู้ดูแลระบบ (Dev)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{devCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>ผู้ใช้ทั้งหมด</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{users.length}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            รายชื่อผู้ใช้งานทั้งหมด
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรืออีเมล..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: '#fff',
                width: 200
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px' }}>ชื่อ-นามสกุล</th>
                <th style={{ padding: '12px 18px' }}>อีเมล</th>
                <th style={{ padding: '12px 18px' }}>สิทธิ์ปัจจุบัน (Role)</th>
                <th style={{ padding: '12px 18px' }}>ห้องที่รับผิดชอบ</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const rOpt = roleOption(user.role);
                const isEditing = editingRoleId === user.id;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{user.id}</div>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                          {ROLE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => handleRoleUpdate(user.id, opt.value)}
                              disabled={savingId === user.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${opt.value === user.role ? opt.color : 'var(--border-subtle)'}`,
                                backgroundColor: opt.value === user.role ? `${opt.color}20` : 'transparent',
                                color: opt.color,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {opt.value === user.role && <Check size={12} style={{ marginLeft: 'auto' }} />}
                            </button>
                          ))}
                          <button
                            onClick={() => setEditingRoleId(null)}
                            style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px', textAlign: 'center' }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: `${rOpt?.color}20`,
                          color: rOpt?.color,
                          border: `1px solid ${rOpt?.color}40`,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {rOpt?.icon}
                          {rOpt?.label}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {user.classes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {user.classes.map(cls => (
                            <span key={cls} style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: 'var(--accent-cyan)'
                            }}>
                              {cls}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      {!isEditing && (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {user.role === 'teacher' && (
                            <button
                              onClick={() => setEditingTeacherClasses({ id: user.id, name: user.name, classes: [...user.classes] })}
                              className="btn-secondary"
                              style={{ fontSize: 11, padding: '5px 10px', color: 'var(--accent-emerald)', borderColor: 'rgba(16,185,129,0.3)' }}
                              title="ผูกครู–ห้องเรียน"
                            >
                              <Edit2 size={12} />
                              <span>ผูกห้อง</span>
                            </button>
                          )}
                          <button
                            onClick={() => setEditingRoleId(user.id)}
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '5px 12px' }}
                          >
                            <Shield size={13} />
                            <span>แก้ไขสิทธิ์</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ไม่พบผู้ใช้ที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: ผูกครู–ห้องเรียน (PUT /api/dev/teacher-classes) */}
      {editingTeacherClasses && (
        <div className="modal-overlay" onClick={() => setEditingTeacherClasses(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              ผูกห้องเรียนกับครูผู้สอน
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              ครู: <strong style={{ color: '#fff' }}>{editingTeacherClasses.name}</strong>
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                เลือกห้องที่รับผิดชอบ (สอน)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {AVAILABLE_CLASSES.map(cls => {
                  const isChecked = editingTeacherClasses.classes.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setEditingTeacherClasses(prev => {
                          if (!prev) return null;
                          const next = isChecked
                            ? prev.classes.filter(c => c !== cls)
                            : [...prev.classes, cls];
                          return { ...prev, classes: next };
                        });
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isChecked ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                        backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: isChecked ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isChecked ? '✓ ' : ''}{cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setEditingTeacherClasses(null)}
                className="btn-secondary"
                disabled={savingId === editingTeacherClasses.id}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveTeacherClasses}
                className="btn-primary"
                disabled={savingId === editingTeacherClasses.id}
                style={{ backgroundColor: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
              >
                {savingId === editingTeacherClasses.id ? 'กำลังบันทึก...' : 'บันทึกการผูกห้อง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: มอบหมายแบบฝึกหัดและกำหนดส่ง (PUT /api/dev/assignments) */}
      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              มอบหมายแบบฝึกหัดและกำหนดส่ง (Assignments)
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              กำหนดห้องเรียนและวันหมดเขตสำหรับชุดแบบฝึกหัด (PUT /api/dev/assignments)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  เลือกชุดแบบฝึกหัด
                </label>
                <select
                  value={assignExId}
                  onChange={e => setAssignExId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-deep)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                >
                  <option value="prism-fanboys-pretest">PRISM · FANBOYS · Pretest</option>
                  <option value="prism-fanboys-c1">PRISM · FANBOYS · Cycle 1</option>
                  <option value="prism-fanboys-c2">PRISM · FANBOYS · Cycle 2</option>
                  <option value="prism-fanboys-post">PRISM · FANBOYS · Post-Test</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  เลือกห้องเรียนที่มอบหมาย
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {AVAILABLE_CLASSES.map(cls => {
                    const isChecked = assignClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          setAssignClasses(prev =>
                            isChecked ? prev.filter(c => c !== cls) : [...prev, cls]
                          );
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isChecked ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                          backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          color: isChecked ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {isChecked ? '✓ ' : ''}{cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  กำหนดส่ง (Due Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={assignDueAt}
                  onChange={e => setAssignDueAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-deep)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="btn-secondary"
                disabled={assignSaving}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveAssignments}
                className="btn-primary"
                disabled={assignSaving || assignClasses.length === 0}
              >
                {assignSaving ? 'กำลังบันทึก...' : 'บันทึกการมอบหมาย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
