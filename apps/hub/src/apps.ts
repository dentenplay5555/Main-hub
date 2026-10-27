const base = import.meta.env.BASE_URL;
// Set by scripts/build.mjs (INCLUDE_EXAM=1). Off = the exam tile shows as "เร็ว ๆ นี้" and is not published.
const includeExam = import.meta.env.VITE_INCLUDE_EXAM === '1';
const includeLearning = import.meta.env.VITE_INCLUDE_LEARNING === '1';
// Set by scripts/build.mjs (INCLUDE_MUSIC=1). Off = the music tile shows as "เร็ว ๆ นี้" and is not published.
const includeMusic = import.meta.env.VITE_INCLUDE_MUSIC === '1';

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
    href: includeExam ? `${base}exam/` : undefined,
  },
  {
    id: 'learning',
    name: 'Learning System',
    description: 'ผลการเรียนรู้รายบุคคล ระดับ สัญญาณเตือน และคำแนะนำ (รวม Dashboard ของนักเรียนไว้ด้วย)',
    color: '#a78bfa',
    href: includeLearning ? `${base}learning/` : undefined,
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
    href: includeMusic ? `${base}music/` : undefined,
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
