import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Trash2, XCircle } from 'lucide-react';
import type { CornerDotType, CornerSquareType, DesignPreset, DotType, ErrorCorrectionLevel, QRDesignSettings } from '@/types';
import { builtInPresets } from '@/lib/defaults';
import { checkScannability } from '@/lib/qr/scannability';
import { deletePreset, getAllPresets, savePreset } from '@/lib/storage/db';
import { ColorConfigInput, ColorInput } from '@/components/ui/ColorInput';

interface DesignPanelProps {
  design: QRDesignSettings;
  onChange: (design: QRDesignSettings) => void;
}

const dotTypes: { id: DotType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
  { id: 'classy', label: 'Classy' },
  { id: 'classy-rounded', label: 'Classy rounded' },
  { id: 'extra-rounded', label: 'Extra rounded' },
];
const cornerSquareTypes: { id: CornerSquareType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'extra-rounded', label: 'Rounded' },
  { id: 'dot', label: 'Circle' },
];
const cornerDotTypes: { id: CornerDotType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'dot', label: 'Circle' },
];
const ecLevels: { id: ErrorCorrectionLevel; label: string; hint: string }[] = [
  { id: 'L', label: 'L', hint: 'Recovers about 7% damage. Smallest code.' },
  { id: 'M', label: 'M', hint: 'Recovers about 15% damage. A good default.' },
  { id: 'Q', label: 'Q', hint: 'Recovers about 25% damage.' },
  { id: 'H', label: 'H', hint: 'Recovers about 30% damage. Best with a logo.' },
];

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-studio-muted">{title}</h3>
      {children}
    </section>
  );
}

function OptionGrid<T extends string>({ label, options, value, onChange, cols = 3 }: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div>
      <span className="studio-label">{label}</span>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
        {options.map(o => {
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.id)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${selected ? 'border-studio-accent/40 bg-studio-accent/15 text-studio-accent' : 'border-studio-border text-studio-muted hover:text-studio-text hover:bg-studio-surface'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="studio-label">{label}: {format ? format(value) : value}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} className="w-full accent-studio-accent" onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-studio-border px-3 py-2.5">
      <span className="text-sm text-studio-text">{label}</span>
      <input type="checkbox" role="switch" className="h-5 w-5 accent-studio-accent" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export function DesignPanel({ design, onChange }: DesignPanelProps) {
  const set = <K extends keyof QRDesignSettings>(key: K, value: QRDesignSettings[K]) => onChange({ ...design, [key]: value });
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<DesignPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const checks = checkScannability(design);

  const loadPresets = () => getAllPresets().then(setUserPresets).catch(() => setUserPresets([]));
  useEffect(() => { void loadPresets(); }, []);

  const applyPreset = (p: DesignPreset) => {
    // Presets keep the user's own logo and frame, and only restyle the code itself.
    onChange({ ...design, ...p.design, logo: design.logo, frame: design.frame });
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const { logo: _logo, frame: _frame, ...rest } = design;
    void _logo; void _frame;
    try {
      await savePreset({ id: `preset-${Date.now().toString(36)}`, name, design: rest, isBuiltIn: false, createdAt: Date.now() });
      setPresetName('');
      setPresetError(null);
      await loadPresets();
    } catch {
      setPresetError('Could not save the preset. Browser storage may be blocked.');
    }
  };

  const handleDeletePreset = async (id: string) => {
    try { await deletePreset(id); await loadPresets(); } catch { setPresetError('Could not delete the preset.'); }
  };

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setLogoError('Use a PNG, JPG, WebP or SVG image.'); return; }
    if (file.size > MAX_LOGO_BYTES) { setLogoError('The image is larger than 1 MB. Use a smaller file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoError(null);
      const nextEc = design.errorCorrection === 'L' || design.errorCorrection === 'M' ? 'H' : design.errorCorrection;
      onChange({ ...design, errorCorrection: nextEc, logo: { ...design.logo, enabled: true, src: String(reader.result) } });
    };
    reader.onerror = () => setLogoError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const preview = (p: DesignPreset) => {
    const fg = p.design.foreground.type === 'gradient' && p.design.foreground.gradient
      ? `linear-gradient(135deg, ${p.design.foreground.gradient.colorStops.map(s => s.color).join(', ')})`
      : p.design.foreground.color;
    return { fg, bg: p.design.background.color };
  };

  const allPresets = [...builtInPresets, ...userPresets];

  return (
    <div className="space-y-6">
      <Section title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {allPresets.map(p => {
            const { fg, bg } = preview(p);
            return (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-studio-border px-2.5 py-2 text-left text-sm text-studio-text hover:border-studio-border-hover hover:bg-studio-surface"
                >
                  <span className="relative h-7 w-7 shrink-0 rounded-md border border-studio-border" style={{ background: bg === 'transparent' ? 'repeating-conic-gradient(#8896b3 0% 25%, transparent 0% 50%) 50% / 8px 8px' : bg }}>
                    <span className="absolute inset-1.5 rounded-sm" style={{ background: fg }} />
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
                {!p.isBuiltIn && (
                  <button
                    type="button"
                    aria-label={`Delete preset ${p.name}`}
                    onClick={() => handleDeletePreset(p.id)}
                    className="absolute right-1 top-1 rounded p-1 text-studio-muted hover:text-studio-error"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className="studio-input"
            placeholder="Name for the current look"
            aria-label="Preset name"
            value={presetName}
            maxLength={40}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSavePreset(); }}
          />
          <button type="button" className="studio-btn-secondary shrink-0" disabled={!presetName.trim()} onClick={handleSavePreset}>Save preset</button>
        </div>
        {presetError && <p role="alert" className="text-xs text-studio-error">{presetError}</p>}
      </Section>

      <Section title="Pattern">
        <OptionGrid label="Module shape" options={dotTypes} value={design.dotType} onChange={v => set('dotType', v)} />
        <OptionGrid label="Corner frame" options={cornerSquareTypes} value={design.cornerSquareType} onChange={v => set('cornerSquareType', v)} />
        <OptionGrid label="Corner dot" options={cornerDotTypes} value={design.cornerDotType} onChange={v => set('cornerDotType', v)} cols={2} />
      </Section>

      <Section title="Colors">
        <ColorConfigInput label="Modules" config={design.foreground} onChange={c => set('foreground', c)} />
        <ColorConfigInput label="Background" config={design.background} onChange={c => set('background', c)} allowTransparent allowGradient={false} />
        <ColorConfigInput label="Corner frame color" config={design.cornerSquareColor} onChange={c => set('cornerSquareColor', c)} allowGradient={false} />
        <ColorConfigInput label="Corner dot color" config={design.cornerDotColor} onChange={c => set('cornerDotColor', c)} allowGradient={false} />
      </Section>

      <Section title="Scannability">
        <ul className="space-y-1.5" aria-live="polite">
          {checks.map((c, i) => (
            <li key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${c.level === 'ok' ? 'bg-studio-success/10 text-studio-success' : c.level === 'warning' ? 'bg-studio-warning/10 text-studio-warning' : 'bg-studio-error/10 text-studio-error'}`}>
              {c.level === 'ok' ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : c.level === 'warning' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
              <span>{c.message}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-studio-muted">These checks are guidelines. Scan the final code with a phone before you print it.</p>
      </Section>

      <Section title="Error correction and margin">
        <div>
          <span className="studio-label">Error correction</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Error correction level">
            {ecLevels.map(l => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={design.errorCorrection === l.id}
                title={l.hint}
                onClick={() => set('errorCorrection', l.id)}
                className={`rounded-lg border py-2 text-sm font-semibold ${design.errorCorrection === l.id ? 'border-studio-accent/40 bg-studio-accent/15 text-studio-accent' : 'border-studio-border text-studio-muted hover:text-studio-text hover:bg-studio-surface'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-studio-muted">{ecLevels.find(l => l.id === design.errorCorrection)?.hint}</p>
        </div>
        <Range label="Margin" value={design.margin} min={0} max={200} step={4} format={v => `${Math.round((v / 1024) * 100)}% of width`} onChange={v => set('margin', v)} />
      </Section>

      <Section title="Logo">
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_TYPES.join(',')}
          className="sr-only"
          aria-label="Upload logo"
          onChange={e => { handleLogoFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        {!design.logo.src ? (
          <button type="button" className="studio-btn-secondary w-full" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} /> Add a logo
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={design.logo.src} alt="Logo preview" className="h-12 w-12 rounded-lg border border-studio-border bg-white object-contain p-1" />
              <div className="flex flex-1 gap-2">
                <button type="button" className="studio-btn-secondary flex-1" onClick={() => fileRef.current?.click()}>Replace</button>
                <button type="button" className="studio-btn-danger" onClick={() => set('logo', { ...design.logo, enabled: false, src: '' })}>Remove</button>
              </div>
            </div>
            <Toggle label="Show logo" checked={design.logo.enabled} onChange={v => set('logo', { ...design.logo, enabled: v })} />
            <Range label="Logo size" value={design.logo.size} min={0.1} max={0.5} step={0.01} format={v => `${Math.round(v * 100)}%`} onChange={v => set('logo', { ...design.logo, size: v })} />
            <Range label="Space around logo" value={design.logo.padding} min={0} max={30} onChange={v => set('logo', { ...design.logo, padding: v })} />
            <Toggle label="Clear modules behind the logo" checked={design.logo.hideBackgroundDots} onChange={v => set('logo', { ...design.logo, hideBackgroundDots: v })} />
          </div>
        )}
        {logoError && <p role="alert" className="text-xs text-studio-error">{logoError}</p>}
      </Section>

      <Section title="Frame">
        <Toggle label="Add a frame with text" checked={design.frame.enabled} onChange={v => set('frame', { ...design.frame, enabled: v })} />
        {design.frame.enabled && (
          <div className="space-y-3">
            <OptionGrid label="Style" options={[{ id: 'simple', label: 'Simple' }, { id: 'rounded', label: 'Rounded' }, { id: 'banner', label: 'Banner' }]} value={design.frame.style} onChange={v => set('frame', { ...design.frame, style: v })} />
            <div>
              <label className="studio-label" htmlFor="frame-text">Text</label>
              <input id="frame-text" className="studio-input" value={design.frame.text} maxLength={40} onChange={e => set('frame', { ...design.frame, text: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorInput label="Frame color" value={design.frame.frameColor} onChange={v => set('frame', { ...design.frame, frameColor: v })} />
              <ColorInput label="Text color" value={design.frame.textColor} onChange={v => set('frame', { ...design.frame, textColor: v })} />
            </div>
            <Range label="Text size" value={design.frame.fontSize} min={10} max={40} onChange={v => set('frame', { ...design.frame, fontSize: v })} />
            <Range label="Frame width" value={design.frame.padding} min={8} max={60} onChange={v => set('frame', { ...design.frame, padding: v })} />
            <OptionGrid label="Weight" options={[{ id: 'normal', label: 'Regular' }, { id: 'bold', label: 'Bold' }]} value={design.frame.fontWeight} onChange={v => set('frame', { ...design.frame, fontWeight: v })} cols={2} />
          </div>
        )}
      </Section>
    </div>
  );
}
