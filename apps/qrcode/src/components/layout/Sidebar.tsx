import {
  QrCode,
  ScanLine,
  Layers,
  FolderOpen,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import type { AppPage } from '@/types';

interface SidebarProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  open: boolean;
  onClose: () => void;
}

const navItems: { id: AppPage; label: string; icon: typeof QrCode }[] = [
  { id: 'create', label: 'Create QR', icon: QrCode },
  { id: 'scan', label: 'Scan QR', icon: ScanLine },
  { id: 'bulk', label: 'Bulk Generator', icon: Layers },
  { id: 'designs', label: 'My Designs', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ page, onNavigate, open, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 flex flex-col
        bg-studio-surface border-r border-studio-border
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-studio-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-studio-accent flex items-center justify-center flex-shrink-0">
            <QrCode size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-studio-text tracking-tight">
            QR Studio
          </span>
        </div>
        <button
          className="lg:hidden p-1.5 rounded-lg text-studio-muted hover:text-studio-text hover:bg-studio-panel transition-colors"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Privacy indicator */}
      <div className="px-4 py-3 border-t border-studio-border">
        <div className="flex items-center gap-2 text-xs text-studio-muted">
          <Shield size={14} className="text-studio-success flex-shrink-0" />
          <span>Processed locally. No data sent to servers.</span>
        </div>
      </div>
    </aside>
  );
}
