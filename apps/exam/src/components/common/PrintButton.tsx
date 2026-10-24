import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
  onClick?: () => void;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  label = 'พิมพ์รายงาน (Print)',
  onClick = () => window.print()
}) => {
  return (
    <button
      onClick={onClick}
      className="btn-secondary"
      style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
      title="พิมพ์รายงาน หรือบันทึกเป็น PDF"
    >
      <Printer size={15} />
      <span>{label}</span>
    </button>
  );
};
