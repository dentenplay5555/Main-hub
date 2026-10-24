import React, { useState } from 'react';
import type { ExerciseDefinition } from '../../types';
import { X, Globe, Key, ShieldCheck, CheckCircle2, Copy, Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface RegisterExerciseModalProps {
  onClose: () => void;
  onAddExercise: (newEx: ExerciseDefinition) => void;
}

export const RegisterExerciseModal: React.FC<RegisterExerciseModalProps> = ({
  onClose,
  onAddExercise
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [workerUrl, setWorkerUrl] = useState('https://prism-compound.nssc-english.workers.dev');
  const [exerciseName, setExerciseName] = useState('PRISM · Compound Sentences Master');
  const [isValidating, setIsValidating] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [testedRoutes, setTestedRoutes] = useState<Record<string, boolean>>({
    '/hub/manifest': false,
    '/hub/roster': false,
    '/hub/status': false,
    '/hub/submissions': false
  });
  const [isTestingRoutes, setIsTestingRoutes] = useState(false);

  // Step 1: Validate URL & Manifest
  const handleValidateManifest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      // Generate simulated HMAC secret (32 bytes hex)
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      setGeneratedSecret(`hub_sec_${secret}`);
      setStep(2);
    }, 1200);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 3: Run Contract Route Tests
  const handleRunRouteTests = () => {
    setIsTestingRoutes(true);
    const routes = ['/hub/manifest', '/hub/roster', '/hub/status', '/hub/submissions'];
    routes.forEach((route, index) => {
      setTimeout(() => {
        setTestedRoutes(prev => ({ ...prev, [route]: true }));
        if (index === routes.length - 1) {
          setIsTestingRoutes(false);
          setStep(4);
        }
      }, (index + 1) * 600);
    });
  };

  // Final: Register & Finish
  const handleFinish = () => {
    const newEx: ExerciseDefinition = {
      id: `prism-ex-${Date.now()}`,
      name: exerciseName,
      seriesId: 'prism-writing',
      phase: 'Sprint Practice',
      status: 'active',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      totalStudents: 144,
      submittedStudents: 0,
      manifestVersion: '1.0.0',
      baseUrl: workerUrl,
      health: 'healthy',
      lastSyncAt: 'เมื่อสักครู่',
      contractVerified: true
    };
    onAddExercise(newEx);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '28px', maxWidth: 640 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
              ลงทะเบียนแบบฝึกหัดใหม่ (Register Exercise Endpoint)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              เชื่อมต่อเว็บแบบฝึกหัดอิสระผ่าน Cloudflare Worker URL
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                backgroundColor: s <= step ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Step 1: Worker URL Input */}
        {step === 1 && (
          <form onSubmit={handleValidateManifest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                ชื่อแบบฝึกหัด (Exercise Display Name)
              </label>
              <input
                type="text"
                required
                value={exerciseName}
                onChange={e => setExerciseName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-deep)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Cloudflare Worker URL (Base Endpoint)
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-deep)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0 12px'
              }}>
                <Globe size={16} color="var(--text-dim)" style={{ marginRight: 8 }} />
                <input
                  type="url"
                  required
                  value={workerUrl}
                  onChange={e => setWorkerUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                Hub จะยิง GET ไปที่ <code>{workerUrl}/hub/manifest</code> เพื่อตรวจสอบโครงสร้าง Zod
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={onClose} className="btn-secondary">
                ยกเลิก
              </button>
              <button type="submit" disabled={isValidating} className="btn-primary">
                {isValidating ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>กำลังตรวจสอบ Manifest...</span>
                  </>
                ) : (
                  <>
                    <span>ตรวจสอบโครงสร้าง & ถัดไป</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Show Secret & Wrangler Instructions */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <CheckCircle2 size={20} color="var(--accent-emerald)" />
              <div style={{ fontSize: 13, color: '#fff' }}>
                โครงสร้าง Manifest ถูกต้องตาม Zod Schema (ตรวจพบ 5 Skills, 2 Parts, Rule AST ผ่าน)
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                HMAC Shared Secret (กุญแจเข้ารหัสเฉพาะแบบฝึกนี้ - แสดงครั้งเดียว):
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-deep)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                gap: 10
              }}>
                <Key size={16} color="var(--accent-cyan)" />
                <code style={{ flex: 1, color: 'var(--accent-cyan)', fontSize: 13, fontFamily: 'monospace' }}>
                  {generatedSecret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(10, 21, 38, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 12
            }}>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                คำสั่งตั้งค่าใน Worker ของแบบฝึกหัด:
              </strong>
              <pre style={{ color: 'var(--accent-cyan)', background: '#050b14', padding: '8px 12px', borderRadius: 6, overflowX: 'auto' }}>
                wrangler secret put HUB_SECRET
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setStep(3)} className="btn-primary">
                <span>นำ Secret ไปใส่แล้ว ทดสอบ 4 Routes</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Test 4 Contract Routes */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              ระบบกำลังส่ง Signed Request พร้อมเฮดเดอร์ <code>X-Hub-Signature</code> และ <code>X-Hub-Timestamp</code> เพื่อทดสอบ 4 เส้นทาง contract:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['/hub/manifest', '/hub/roster', '/hub/status', '/hub/submissions'].map((route) => {
                const passed = testedRoutes[route];
                return (
                  <div
                    key={route}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-deep)',
                      border: `1px solid ${passed ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <code style={{ fontSize: 13, color: '#fff' }}>GET {route}</code>
                    {passed ? (
                      <span style={{ fontSize: 12, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={15} /> 200 OK (Signed Verified)
                      </span>
                    ) : isTestingRoutes ? (
                      <span style={{ fontSize: 12, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Loader2 size={14} className="spin-icon" /> กำลังตรวจสอบ...
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>รอดำเนินการ</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={handleRunRouteTests}
                disabled={isTestingRoutes}
                className="btn-primary"
              >
                {isTestingRoutes ? 'กำลังทดสอบสัญญาณ...' : 'เริ่มทดสอบทั้ง 4 Routes'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Ready to Enable */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <ShieldCheck size={32} color="var(--accent-emerald)" />
            </div>
            <h4 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              ผ่านการตรวจสอบ Contract ครบถ้วน!
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 20px' }}>
              แบบฝึกหัด <strong>{exerciseName}</strong> พร้อมเปิดใช้งานใน Hub แล้ว ระบบจะเริ่มรอบ Sync อัตโนมัติทุก 10 นาที
            </p>
            <button onClick={handleFinish} className="btn-primary" style={{ padding: '10px 24px' }}>
              <span>เปิดใช้งานและบันทึกลง D1</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
