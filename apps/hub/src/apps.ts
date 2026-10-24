const base = import.meta.env.BASE_URL;

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Where the app lives. Omit while it is not available yet. */
  href?: string;
  /** Opens in a new tab (apps hosted elsewhere). */
  external?: boolean;
}

// Single source of truth for the launcher grid and the home cards.
export const apps: AppEntry[] = [
  {
    id: 'exam',
    name: 'Exam Management',
    description: 'รายงานผลและติดตามแบบฝึกหัด สำหรับนักเรียน ครู และผู้ดูแล',
    color: '#38bdf8',
    href: `${base}exam/`,
  },
  {
    id: 'learning',
    name: 'Learning System',
    description: 'ระบบแบบฝึกหัดและติดตามผล (รวม Dashboard ของนักเรียนไว้ด้วย)',
    color: '#a78bfa',
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'พยากรณ์อากาศ',
    color: '#f59e0b',
  },
  {
    id: 'music',
    name: 'Music Player',
    description: 'ขอเพลงผ่าน QR สำหรับกิจกรรม',
    color: '#f472b6',
  },
  {
    id: 'electrical',
    name: 'Appliance Notifier',
    description: 'โครงงาน IS ระบบแจ้งเตือนสถานะอุปกรณ์ไฟฟ้า (อยู่ใน repo แยก)',
    color: '#34d399',
    href: 'https://github.com/dentenplay5555/Electrical-Status-Notification-System',
    external: true,
  },
];
