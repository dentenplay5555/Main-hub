import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ForbiddenPageProps {
  onGoBack: () => void;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ onGoBack }) => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-card" style={{
        maxWidth: 480,
        width: '100%',
        padding: '36px 32px',
        textAlign: 'center',
        border: '1px solid rgba(244, 63, 94, 0.4)'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <ShieldAlert size={30} color="var(--accent-rose)" />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          ไม่มีสิทธิ์เข้าถึงหน้านี้ (403 Forbidden)
        </h2>

        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          บทบาทของคุณในปัจจุบันไม่ได้รับอนุญาตให้เข้าใช้งานส่วนนี้ สิทธิ์การเข้าถึงถูกควบคุมและบังคับใช้ที่ระดับ Cloudflare Worker API
        </p>

        <button onClick={onGoBack} className="btn-secondary" style={{ padding: '10px 20px', margin: '0 auto' }}>
          <ArrowLeft size={16} />
          <span>กลับสู่หน้าหลักของคุณ</span>
        </button>
      </div>
    </div>
  );
};
