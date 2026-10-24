import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'ยังไม่มีข้อมูลในส่วนนี้',
  subMessage,
  action
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 20px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-lg)'
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 14px'
      }}>
        <Inbox size={24} color="var(--text-dim)" />
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
        {message}
      </h4>
      {subMessage && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px' }}>
          {subMessage}
        </p>
      )}
      {action}
    </div>
  );
};
