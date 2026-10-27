import {
  Globe, Type, Wifi, UserCircle, Mail, MessageSquare,
  Phone, MapPin, Calendar, MessageCircle, Share2, Code
} from 'lucide-react';
import type { QRContentType } from '@/types';

interface ContentTypeSelectorProps {
  value: QRContentType;
  onChange: (type: QRContentType) => void;
}

const contentTypes: { id: QRContentType; label: string; icon: typeof Globe }[] = [
  { id: 'url', label: 'URL', icon: Globe },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'vcard', label: 'Contact', icon: UserCircle },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'geo', label: 'Location', icon: MapPin },
  { id: 'calendar', label: 'Event', icon: Calendar },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'custom', label: 'Custom', icon: Code },
];

export function ContentTypeSelector({ value, onChange }: ContentTypeSelectorProps) {
  return (
    <div>
      <label className="studio-label">Content Type</label>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="QR content type">
        {contentTypes.map(ct => {
          const Icon = ct.icon;
          const selected = value === ct.id;
          return (
            <button
              key={ct.id}
              role="radio"
              aria-checked={selected}
              className={`
                flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium
                transition-colors duration-100 cursor-pointer
                ${selected
                  ? 'bg-studio-accent/15 text-studio-accent border border-studio-accent/30'
                  : 'text-studio-muted hover:text-studio-text hover:bg-studio-surface border border-transparent'
                }
              `}
              onClick={() => onChange(ct.id)}
            >
              <Icon size={16} />
              <span className="truncate w-full text-center">{ct.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
