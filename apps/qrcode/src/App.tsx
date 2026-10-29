import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SettingsProvider, useSettings } from '@/state/settings';
import { draftFromProject, newDraft, type Draft } from '@/state/draft';
import type { AppPage, QRProject } from '@/types';

const CreatePage = lazy(() => import('@/features/generator/CreatePage'));
const ScanPage = lazy(() => import('@/features/scanner/ScanPage'));
const BulkPage = lazy(() => import('@/features/bulk-generator/BulkPage'));
const DesignsPage = lazy(() => import('@/features/designs/DesignsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
      <div className="w-8 h-8 border-2 border-studio-accent/30 border-t-studio-accent rounded-full animate-spin" />
    </div>
  );
}

function Studio() {
  const { settings, loaded } = useSettings();
  const [page, setPage] = useState<AppPage>('create');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  // The starting design depends on saved settings, so build the first draft once they are read.
  useEffect(() => {
    if (loaded && !draft) setDraft(newDraft(settings));
  }, [loaded, draft, settings]);

  const navigate = useCallback((p: AppPage) => {
    setPage(p);
    setSidebarOpen(false);
  }, []);

  const openProject = useCallback((project: QRProject) => {
    setDraft(draftFromProject(project));
    setPage('create');
  }, []);

  const startNew = useCallback(() => {
    setDraft(newDraft(settings));
    setPage('create');
  }, [settings]);

  const renderPage = () => {
    if (!draft) return <PageLoader />;
    switch (page) {
      case 'create': return <CreatePage draft={draft} onDraftChange={setDraft} onNew={startNew} />;
      case 'scan': return <ScanPage />;
      case 'bulk': return <BulkPage design={draft.design} />;
      case 'designs': return <DesignsPage onOpen={openProject} onNew={startNew} />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <Sidebar page={page} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header page={page} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Studio />
    </SettingsProvider>
  );
}
