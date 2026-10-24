import React from 'react';
import type { StatusType } from '../../types';
import { CheckCircle2, Clock, AlertCircle, CheckCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    TODO: {
      label: 'ยังไม่เริ่มทำ',
      icon: AlertCircle,
      bg: 'rgba(244, 63, 94, 0.12)',
      color: '#fb7185',
      border: 'rgba(244, 63, 94, 0.3)'
    },
    IN_PROGRESS: {
      label: 'กำลังทำ',
      icon: Clock,
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.3)'
    },
    SUBMITTED: {
      label: 'ส่งแล้ว',
      icon: CheckCircle2,
      bg: 'rgba(16, 185, 129, 0.12)',
      color: '#34d399',
      border: 'rgba(16, 185, 129, 0.3)'
    },
    COMPLETED: {
      label: 'สมบูรณ์',
      icon: CheckCheck,
      bg: 'rgba(56, 189, 248, 0.12)',
      color: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.3)'
    }
  }[status] || {
    label: status,
    icon: Clock,
    bg: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.1)'
  };

  const Icon = config.icon;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      whiteSpace: 'nowrap'
    }}>
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{config.label}</span>
    </span>
  );
};
