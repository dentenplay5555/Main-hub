import React from 'react';
import { Download } from 'lucide-react';

interface ExportCsvButtonProps {
  label?: string;
  onExport: () => void;
}

export const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({
  label = 'Export CSV',
  onExport
}) => {
  return (
    <button
      onClick={onExport}
      className="btn-secondary"
      style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
      title="ดาวน์โหลดไฟล์ข้อมูลสรุปเป็น CSV"
    >
      <Download size={15} />
      <span>{label}</span>
    </button>
  );
};
