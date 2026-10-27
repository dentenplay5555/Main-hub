import type { QRContent } from '@/types';

interface ContentFormProps {
  content: QRContent;
  onChange: (content: QRContent) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="studio-label">{label}</label>
      {children}
    </div>
  );
}

export function ContentForm({ content, onChange }: ContentFormProps) {
  const update = <T extends QRContent>(field: keyof T, value: string | boolean) => {
    onChange({ ...content, [field]: value } as QRContent);
  };

  switch (content.type) {
    case 'url':
      return (
        <Field label="Website URL">
          <input
            className="studio-input"
            type="url"
            placeholder="https://example.com"
            value={content.url}
            onChange={e => update<typeof content>('url', e.target.value)}
            autoFocus
          />
        </Field>
      );

    case 'text':
      return (
        <Field label="Text Content">
          <textarea
            className="studio-input min-h-[120px] resize-y"
            placeholder="Enter any text, including Thai: สวัสดีครับ"
            value={content.text}
            onChange={e => update<typeof content>('text', e.target.value)}
            autoFocus
          />
        </Field>
      );

    case 'wifi':
      return (
        <div className="space-y-3">
          <Field label="Network Name (SSID)">
            <input
              className="studio-input"
              placeholder="MyNetwork"
              value={content.ssid}
              onChange={e => update<typeof content>('ssid', e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Encryption">
            <select
              className="studio-select"
              value={content.encryption}
              onChange={e => update<typeof content>('encryption', e.target.value)}
            >
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No Password</option>
            </select>
          </Field>
          {content.encryption !== 'nopass' && (
            <Field label="Password">
              <input
                className="studio-input"
                type="password"
                placeholder="Network password"
                value={content.password}
                onChange={e => update<typeof content>('password', e.target.value)}
              />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-studio-muted cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-studio-border text-studio-accent bg-studio-surface"
              checked={content.hidden}
              onChange={e => update<typeof content>('hidden', e.target.checked)}
            />
            Hidden network
          </label>
        </div>
      );

    case 'vcard':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <input className="studio-input" placeholder="John" value={content.firstName}
                onChange={e => update<typeof content>('firstName', e.target.value)} autoFocus />
            </Field>
            <Field label="Last Name">
              <input className="studio-input" placeholder="Doe" value={content.lastName}
                onChange={e => update<typeof content>('lastName', e.target.value)} />
            </Field>
          </div>
          <Field label="Organization">
            <input className="studio-input" placeholder="Company" value={content.organization}
              onChange={e => update<typeof content>('organization', e.target.value)} />
          </Field>
          <Field label="Job Title">
            <input className="studio-input" placeholder="Developer" value={content.title}
              onChange={e => update<typeof content>('title', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="studio-input" type="tel" placeholder="+1234567890" value={content.phone}
              onChange={e => update<typeof content>('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="studio-input" type="email" placeholder="john@example.com" value={content.email}
              onChange={e => update<typeof content>('email', e.target.value)} />
          </Field>
          <Field label="Website">
            <input className="studio-input" type="url" placeholder="https://example.com" value={content.website}
              onChange={e => update<typeof content>('website', e.target.value)} />
          </Field>
          <Field label="Address">
            <input className="studio-input" placeholder="123 Main St, City" value={content.address}
              onChange={e => update<typeof content>('address', e.target.value)} />
          </Field>
          <Field label="Note">
            <textarea className="studio-input resize-y min-h-[60px]" placeholder="Additional notes" value={content.note}
              onChange={e => update<typeof content>('note', e.target.value)} />
          </Field>
        </div>
      );

    case 'email':
      return (
        <div className="space-y-3">
          <Field label="Email Address">
            <input className="studio-input" type="email" placeholder="recipient@example.com" value={content.address}
              onChange={e => update<typeof content>('address', e.target.value)} autoFocus />
          </Field>
          <Field label="Subject">
            <input className="studio-input" placeholder="Email subject" value={content.subject}
              onChange={e => update<typeof content>('subject', e.target.value)} />
          </Field>
          <Field label="Body">
            <textarea className="studio-input resize-y min-h-[80px]" placeholder="Email body" value={content.body}
              onChange={e => update<typeof content>('body', e.target.value)} />
          </Field>
        </div>
      );

    case 'sms':
      return (
        <div className="space-y-3">
          <Field label="Phone Number">
            <input className="studio-input" type="tel" placeholder="+1234567890" value={content.phone}
              onChange={e => update<typeof content>('phone', e.target.value)} autoFocus />
          </Field>
          <Field label="Message">
            <textarea className="studio-input resize-y min-h-[80px]" placeholder="SMS message" value={content.message}
              onChange={e => update<typeof content>('message', e.target.value)} />
          </Field>
        </div>
      );

    case 'phone':
      return (
        <Field label="Phone Number">
          <input className="studio-input" type="tel" placeholder="+1234567890" value={content.phone}
            onChange={e => update<typeof content>('phone', e.target.value)} autoFocus />
        </Field>
      );

    case 'geo':
      return (
        <div className="space-y-3">
          <Field label="Search Query (optional)">
            <input className="studio-input" placeholder="Central Park, New York" value={content.query}
              onChange={e => update<typeof content>('query', e.target.value)} autoFocus />
          </Field>
          <p className="text-xs text-studio-muted">Or enter coordinates directly:</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input className="studio-input" placeholder="40.7829" value={content.latitude}
                onChange={e => update<typeof content>('latitude', e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input className="studio-input" placeholder="-73.9654" value={content.longitude}
                onChange={e => update<typeof content>('longitude', e.target.value)} />
            </Field>
          </div>
        </div>
      );

    case 'calendar':
      return (
        <div className="space-y-3">
          <Field label="Event Title">
            <input className="studio-input" placeholder="Meeting" value={content.title}
              onChange={e => update<typeof content>('title', e.target.value)} autoFocus />
          </Field>
          <Field label="Description">
            <textarea className="studio-input resize-y min-h-[60px]" placeholder="Event details" value={content.description}
              onChange={e => update<typeof content>('description', e.target.value)} />
          </Field>
          <Field label="Location">
            <input className="studio-input" placeholder="Meeting Room A" value={content.location}
              onChange={e => update<typeof content>('location', e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-studio-muted cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-studio-border text-studio-accent bg-studio-surface"
              checked={content.allDay} onChange={e => update<typeof content>('allDay', e.target.checked)} />
            All day event
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input className="studio-input" type="date" value={content.startDate}
                onChange={e => update<typeof content>('startDate', e.target.value)} />
            </Field>
            {!content.allDay && (
              <Field label="Start Time">
                <input className="studio-input" type="time" value={content.startTime}
                  onChange={e => update<typeof content>('startTime', e.target.value)} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="End Date">
              <input className="studio-input" type="date" value={content.endDate}
                onChange={e => update<typeof content>('endDate', e.target.value)} />
            </Field>
            {!content.allDay && (
              <Field label="End Time">
                <input className="studio-input" type="time" value={content.endTime}
                  onChange={e => update<typeof content>('endTime', e.target.value)} />
              </Field>
            )}
          </div>
        </div>
      );

    case 'whatsapp':
      return (
        <div className="space-y-3">
          <Field label="Phone Number (with country code)">
            <input className="studio-input" type="tel" placeholder="14155552671" value={content.phone}
              onChange={e => update<typeof content>('phone', e.target.value)} autoFocus />
          </Field>
          <Field label="Message (optional)">
            <textarea className="studio-input resize-y min-h-[80px]" placeholder="Pre-filled message" value={content.message}
              onChange={e => update<typeof content>('message', e.target.value)} />
          </Field>
        </div>
      );

    case 'social':
      return (
        <div className="space-y-3">
          <Field label="Platform">
            <select className="studio-select" value={content.platform}
              onChange={e => update<typeof content>('platform', e.target.value)}>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter / X</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="github">GitHub</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Profile URL">
            <input className="studio-input" type="url" placeholder="https://instagram.com/username" value={content.url}
              onChange={e => update<typeof content>('url', e.target.value)} autoFocus />
          </Field>
        </div>
      );

    case 'custom':
      return (
        <Field label="Custom Payload">
          <textarea
            className="studio-input min-h-[150px] resize-y font-mono text-sm"
            placeholder="Enter any QR payload data"
            value={content.payload}
            onChange={e => update<typeof content>('payload', e.target.value)}
            autoFocus
          />
        </Field>
      );

    default:
      return null;
  }
}
