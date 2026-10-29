import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import type { AppSettings, DesignPreset, QRProject, ScanResult } from '@/types';
import { useSettings } from '@/state/settings';
import { defaultSettings } from '@/lib/defaults';
import { clearAllData, getAllPresets, getAllProjects, getScanHistory, saveProject, savePreset } from '@/lib/storage/db';
import { downloadBlob, clampSize } from '@/lib/qr/render';

interface Backup { app: 'qr-studio'; version: 1; exportedAt: string; settings: AppSettings; projects: QRProject[]; presets: DesignPreset[]; scans: ScanResult[] }

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span><span className="block text-sm text-studio-text">{label}</span><span className="block text-xs text-studio-muted">{hint}</span></span>
      <input type="checkbox" role="switch" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--studio-accent))]" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export default function SettingsPage() {
  const { settings, update, replace, storageError } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const exportBackup = async () => {
    try {
      const backup: Backup = { app: 'qr-studio', version: 1, exportedAt: new Date().toISOString(), settings, projects: await getAllProjects(), presets: await getAllPresets(), scans: await getScanHistory() };
      downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), 'qr-studio-backup.json');
      setMsg({ ok: true, text: `Backup saved with ${backup.projects.length} design${backup.projects.length === 1 ? '' : 's'}.` });
    } catch { setMsg({ ok: false, text: 'The backup could not be created.' }); }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('That file is too large to be a backup.');
      const data = JSON.parse(await file.text()) as Partial<Backup>;
      if (data.app !== 'qr-studio' || data.version !== 1 || !Array.isArray(data.projects)) throw new Error('This is not a QR Studio backup file.');
      let n = 0;
      for (const p of data.projects) {
        if (p && typeof p.id === 'string' && p.content && p.design) { await saveProject(p); n++; }
      }
      for (const p of data.presets ?? []) if (p && typeof p.id === 'string' && p.design) await savePreset(p);
      if (data.settings) replace({ ...defaultSettings, ...data.settings });
      setMsg({ ok: true, text: `Restored ${n} design${n === 1 ? '' : 's'} and your settings.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'That file could not be read.' });
    }
  };

  const wipe = async () => {
    if (!confirm('Delete all saved designs, presets, scan history and settings from this browser? This cannot be undone.')) return;
    try { await clearAllData(); replace(defaultSettings); setMsg({ ok: true, text: 'Everything was deleted from this browser.' }); }
    catch { setMsg({ ok: false, text: 'Could not clear the data. Browser storage may be blocked.' }); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
      {storageError && <p role="alert" className="rounded-lg bg-studio-warning/10 px-3 py-2 text-sm text-studio-warning">Browser storage is blocked, so designs and settings will not be kept after you close this tab.</p>}

      <section className="studio-panel space-y-3 p-4" aria-label="Appearance">
        <h2 className="text-base font-semibold text-studio-text">Appearance</h2>
        <label className="block space-y-1 text-sm text-studio-muted">Theme
          <select className="studio-select" value={settings.theme} onChange={e => update({ theme: e.target.value as AppSettings['theme'] })}>
            <option value="dark">Dark</option><option value="light">Light</option><option value="system">Match my device</option>
          </select>
        </label>
      </section>

      <section className="studio-panel space-y-3 p-4" aria-label="Defaults for new codes">
        <h2 className="text-base font-semibold text-studio-text">Defaults for new codes</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm text-studio-muted">Size (px)
            <input type="number" className="studio-input" min={64} max={4096} value={settings.defaultExportWidth}
              onChange={e => update({ defaultExportWidth: Number(e.target.value), defaultExportHeight: Number(e.target.value) })}
              onBlur={() => { const v = clampSize(settings.defaultExportWidth); update({ defaultExportWidth: v, defaultExportHeight: v }); }} />
          </label>
          <label className="space-y-1 text-sm text-studio-muted">Error correction
            <select className="studio-select" value={settings.defaultErrorCorrection} onChange={e => update({ defaultErrorCorrection: e.target.value as AppSettings['defaultErrorCorrection'] })}>
              <option value="L">L, smallest code</option><option value="M">M, balanced</option><option value="Q">Q, sturdier</option><option value="H">H, best with a logo</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-studio-muted">Code color
            <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-studio-border bg-studio-surface" value={settings.defaultForegroundColor} onChange={e => update({ defaultForegroundColor: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-studio-muted">Background color
            <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-studio-border bg-studio-surface" value={settings.defaultBackgroundColor} onChange={e => update({ defaultBackgroundColor: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-studio-muted">Applies to codes you start from now on. The code you are editing keeps its design.</p>
      </section>

      <section className="studio-panel p-4" aria-label="Scanner">
        <h2 className="mb-1 text-base font-semibold text-studio-text">Scanner</h2>
        <Toggle label="Save scan history" hint="Keeps your last 100 scans in this browser. Nothing is uploaded." checked={settings.scannerHistoryEnabled} onChange={v => update({ scannerHistoryEnabled: v })} />
        <Toggle label="Keep scanning" hint="The camera stays on after a code is read, instead of stopping." checked={settings.continuousScanning} onChange={v => update({ continuousScanning: v })} />
      </section>

      <section className="studio-panel space-y-3 p-4" aria-label="Your data">
        <h2 className="text-base font-semibold text-studio-text">Your data</h2>
        <p className="text-xs text-studio-muted">Everything lives in this browser. Make a backup before clearing site data or switching device.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="studio-btn-secondary" onClick={exportBackup}><Download size={15} /> Download backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={e => { void importBackup(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="studio-btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore from backup</button>
          <button type="button" className="studio-btn-danger" onClick={wipe}><Trash2 size={15} /> Delete all data</button>
        </div>
        <p role="status" className={`min-h-5 text-sm ${msg && !msg.ok ? 'text-studio-error' : 'text-studio-success'}`}>{msg?.text}</p>
      </section>
    </div>
  );
}
