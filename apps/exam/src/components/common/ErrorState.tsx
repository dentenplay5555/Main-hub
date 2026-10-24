import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      backgroundColor: 'rgba(244, 63, 94, 0.08)',
      border: '1px solid rgba(244, 63, 94, 0.25)',
      borderRadius: 'var(--radius-lg)'
    }}>
      <AlertCircle size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </h4>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 16px' }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary" style={{ fontSize: 13, padding: '7px 16px' }}>
          <RefreshCw size={14} />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
      )}
    </div>
  );
};
