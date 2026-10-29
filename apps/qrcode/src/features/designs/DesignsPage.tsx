import { useCallback, useEffect, useState } from 'react';
import { Copy, FolderOpen, Plus, Trash2 } from 'lucide-react';
import type { QRProject } from '@/types';
import { deleteProject, getAllProjects, saveProject } from '@/lib/storage/db';
import { generatePayload } from '@/lib/qr/payload';
import { renderQRCanvas } from '@/lib/qr/render';
import { makeId } from '@/lib/id';

interface DesignsPageProps { onOpen: (p: QRProject) => void; onNew: () => void }

function Thumb({ project }: { project: QRProject }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    renderQRCanvas(generatePayload(project.content) || ' ', project.design, 240, { includeFrame: true })
      .then(c => { if (!cancelled) setSrc(c.toDataURL('image/png')); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [project]);
  return src
    ? <img src={src} alt={`Preview of ${project.name}`} className="aspect-square w-full rounded-lg border border-studio-border bg-white object-contain" />
    : <div className="aspect-square w-full animate-pulse rounded-lg bg-studio-surface" aria-hidden="true" />;
}

export default function DesignsPage({ onOpen, onNew }: DesignsPageProps) {
  const [projects, setProjects] = useState<QRProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getAllProjects().then(p => { setProjects(p); setError(null); }).catch(() => { setProjects([]); setError('Saved designs could not be read. Browser storage may be blocked.'); });
  }, []);
  useEffect(load, [load]);

  const duplicate = async (p: QRProject) => {
    const now = Date.now();
    try { await saveProject({ ...p, id: makeId('qr'), name: `${p.name} copy`, createdAt: now, updatedAt: now }); load(); }
    catch { setError('Could not save the copy. Browser storage may be full or blocked.'); }
  };
  const remove = async (p: QRProject) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await deleteProject(p.id); load(); } catch { setError('Could not delete that design.'); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-studio-text">My designs</h2>
        <button type="button" className="studio-btn-primary" onClick={onNew}><Plus size={16} /> New code</button>
      </div>
      {error && <p role="alert" className="text-sm text-studio-error">{error}</p>}
      {projects === null ? (
        <p role="status" className="text-sm text-studio-muted">Loading</p>
      ) : projects.length === 0 ? (
        <div className="studio-panel p-8 text-center text-sm text-studio-muted">
          <p>No saved designs yet.</p>
          <p className="mt-1">Make a code on the Create page and press Save to keep it here. Designs stay in this browser only.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {projects.map(p => (
            <li key={p.id} className="studio-panel space-y-2 p-3">
              <Thumb project={p} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-studio-text">{p.name || 'Untitled'}</p>
                <p className="text-xs text-studio-muted">{p.content.type} · {new Date(p.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" className="studio-btn-secondary flex-1 px-2" onClick={() => onOpen(p)}><FolderOpen size={14} /> Open</button>
                <button type="button" className="studio-btn-ghost p-2" aria-label={`Duplicate ${p.name}`} onClick={() => duplicate(p)}><Copy size={14} /></button>
                <button type="button" className="studio-btn-ghost p-2" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
