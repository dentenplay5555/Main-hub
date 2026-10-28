import { useEffect, useId, useState } from 'react';
import type { ColorConfig } from '@/types';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function toSixDigit(hex: string): string {
  if (/^#[0-9a-f]{3}$/i.test(hex)) return '#' + hex.slice(1).split('').map(c => c + c).join('');
  return HEX.test(hex) ? hex : '#000000';
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
}

export function ColorInput({ label, value, onChange, allowTransparent }: ColorInputProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const transparent = value === 'transparent';
  const invalid = draft !== 'transparent' && !HEX.test(draft);

  return (
    <div>
      <label htmlFor={id} className="studio-label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-studio-border bg-studio-surface p-1 disabled:opacity-40"
          value={toSixDigit(transparent ? '#ffffff' : value)}
          disabled={transparent}
          onChange={e => onChange(e.target.value)}
        />
        <input
          id={id}
          className={`studio-input font-mono text-sm ${invalid ? 'border-studio-error' : ''}`}
          value={draft}
          spellCheck={false}
          aria-invalid={invalid}
          onChange={e => {
            setDraft(e.target.value);
            if (HEX.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setDraft(value)}
        />
        {allowTransparent && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-studio-muted cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-studio-accent"
              checked={transparent}
              onChange={e => onChange(e.target.checked ? 'transparent' : '#ffffff')}
            />
            None
          </label>
        )}
      </div>
    </div>
  );
}

interface ColorConfigInputProps {
  label: string;
  config: ColorConfig;
  onChange: (config: ColorConfig) => void;
  allowTransparent?: boolean;
  allowGradient?: boolean;
}

export function ColorConfigInput({ label, config, onChange, allowTransparent, allowGradient = true }: ColorConfigInputProps) {
  const isGradient = config.type === 'gradient' && !!config.gradient;
  const g = config.gradient;

  const setGradient = (next: NonNullable<ColorConfig['gradient']>) =>
    onChange({ type: 'gradient', color: next.colorStops[0].color, gradient: next });

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{label}</legend>
      {allowGradient && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-studio-muted">{label}</span>
          <div className="inline-flex rounded-lg border border-studio-border p-0.5" role="radiogroup" aria-label={`${label} fill`}>
            {(['solid', 'gradient'] as const).map(t => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={(t === 'gradient') === isGradient}
                className={`px-2.5 py-1 text-xs rounded-md capitalize ${(t === 'gradient') === isGradient ? 'bg-studio-accent/15 text-studio-accent' : 'text-studio-muted hover:text-studio-text'}`}
                onClick={() => {
                  if (t === 'solid') onChange({ type: 'solid', color: config.color });
                  else setGradient(g ?? { type: 'linear', rotation: 135, colorStops: [{ offset: 0, color: toSixDigit(config.color) }, { offset: 1, color: '#3b82f6' }] });
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isGradient && (
        <ColorInput
          label={allowGradient ? 'Color' : label}
          value={config.color}
          allowTransparent={allowTransparent}
          onChange={color => onChange({ type: 'solid', color })}
        />
      )}

      {isGradient && g && (
        <div className="space-y-3 rounded-lg border border-studio-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <ColorInput label="Start" value={g.colorStops[0].color} onChange={color => setGradient({ ...g, colorStops: [{ ...g.colorStops[0], color }, g.colorStops[1]] })} />
            <ColorInput label="End" value={g.colorStops[1].color} onChange={color => setGradient({ ...g, colorStops: [g.colorStops[0], { ...g.colorStops[1], color }] })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="studio-label" htmlFor={`${label}-gtype`}>Direction</label>
              <select
                id={`${label}-gtype`}
                className="studio-select"
                value={g.type}
                onChange={e => setGradient({ ...g, type: e.target.value as 'linear' | 'radial' })}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>
            <div>
              <label className="studio-label" htmlFor={`${label}-grot`}>Angle: {g.rotation}°</label>
              <input
                id={`${label}-grot`}
                type="range"
                min={0}
                max={360}
                step={5}
                className="w-full accent-studio-accent"
                value={g.rotation}
                disabled={g.type === 'radial'}
                onChange={e => setGradient({ ...g, rotation: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
