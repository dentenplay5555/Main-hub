// ── QR Content Types ─────────────────────────────────────────────────────────

export type QRContentType =
  | 'url'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'sms'
  | 'phone'
  | 'geo'
  | 'calendar'
  | 'whatsapp'
  | 'social'
  | 'custom';

export interface QRContentBase {
  type: QRContentType;
}

export interface URLContent extends QRContentBase {
  type: 'url';
  url: string;
}

export interface TextContent extends QRContentBase {
  type: 'text';
  text: string;
}

export interface WiFiContent extends QRContentBase {
  type: 'wifi';
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface VCardContent extends QRContentBase {
  type: 'vcard';
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  note: string;
}

export interface EmailContent extends QRContentBase {
  type: 'email';
  address: string;
  subject: string;
  body: string;
}

export interface SMSContent extends QRContentBase {
  type: 'sms';
  phone: string;
  message: string;
}

export interface PhoneContent extends QRContentBase {
  type: 'phone';
  phone: string;
}

export interface GeoContent extends QRContentBase {
  type: 'geo';
  latitude: string;
  longitude: string;
  query: string;
}

export interface CalendarContent extends QRContentBase {
  type: 'calendar';
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}

export interface WhatsAppContent extends QRContentBase {
  type: 'whatsapp';
  phone: string;
  message: string;
}

export interface SocialContent extends QRContentBase {
  type: 'social';
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'github' | 'other';
  url: string;
}

export interface CustomContent extends QRContentBase {
  type: 'custom';
  payload: string;
}

export type QRContent =
  | URLContent
  | TextContent
  | WiFiContent
  | VCardContent
  | EmailContent
  | SMSContent
  | PhoneContent
  | GeoContent
  | CalendarContent
  | WhatsAppContent
  | SocialContent
  | CustomContent;

// ── QR Design Settings ───────────────────────────────────────────────────────

export type DotType = 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';
export type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'dot';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type GradientType = 'linear' | 'radial';

export interface ColorConfig {
  type: 'solid' | 'gradient';
  color: string;
  gradient?: {
    type: GradientType;
    rotation: number;
    colorStops: Array<{ offset: number; color: string }>;
  };
}

export interface FrameConfig {
  enabled: boolean;
  style: 'simple' | 'rounded' | 'banner';
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textColor: string;
  frameColor: string;
  padding: number;
}

export interface QRDesignSettings {
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  foreground: ColorConfig;
  background: ColorConfig;
  cornerSquareColor: ColorConfig;
  cornerDotColor: ColorConfig;
  errorCorrection: ErrorCorrectionLevel;
  width: number;
  height: number;
  margin: number;
  logo: {
    enabled: boolean;
    src: string; // data URL
    size: number;     // 0-1 ratio
    padding: number;  // px
    hideBackgroundDots: boolean;
  };
  frame: FrameConfig;
}

// ── Export ────────────────────────────────────────────────────────────────────

export type ExportFormat = 'png' | 'svg' | 'jpg' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  width: number;
  height: number;
  quality: number; // 0-1 for jpg
  backgroundColor: string; // required for jpg
  includeFrame: boolean;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface QRProject {
  id: string;
  name: string;
  content: QRContent;
  design: QRDesignSettings;
  createdAt: number;
  updatedAt: number;
}

// ── Presets ──────────────────────────────────────────────────────────────────

export interface DesignPreset {
  id: string;
  name: string;
  design: Omit<QRDesignSettings, 'logo' | 'frame'>;
  isBuiltIn: boolean;
  createdAt: number;
}

// ── Scanner ──────────────────────────────────────────────────────────────────

export interface ScanResult {
  id: string;
  text: string;
  contentType: QRContentType | 'unknown';
  timestamp: number;
  source: 'camera' | 'image';
}

// ── Settings ─────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  language: 'en' | 'th';
  defaultExportWidth: number;
  defaultExportHeight: number;
  defaultErrorCorrection: ErrorCorrectionLevel;
  defaultForegroundColor: string;
  defaultBackgroundColor: string;
  scannerHistoryEnabled: boolean;
  continuousScanning: boolean;
}

// ── Navigation ───────────────────────────────────────────────────────────────

export type AppPage = 'create' | 'scan' | 'bulk' | 'designs' | 'settings';
