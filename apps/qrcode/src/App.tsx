import { useState, useCallback, lazy, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import type { AppPage } from '@/types';

const CreatePage = lazy(() => import('@/features/generator/CreatePage'));
const ScanPage = lazy(() => import('@/features/scanner/ScanPage'));
const BulkPage = lazy(() => import('@/features/bulk-generator/BulkPage'));
const DesignsPage = lazy(() => import('@/features/designs/DesignsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-studio-accent/30 border-t-studio-accent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<AppPage>('create');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((p: AppPage) => {
    setPage(p);
    setSidebarOpen(false);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'create': return <CreatePage />;
      case 'scan': return <ScanPage />;
      case 'bulk': return <BulkPage />;
      case 'designs': return <DesignsPage />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar page={page} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header page={page} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
