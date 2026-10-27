import { Menu } from 'lucide-react';
import type { AppPage } from '@/types';

interface HeaderProps {
  page: AppPage;
  onMenuToggle: () => void;
}

const pageTitles: Record<AppPage, string> = {
  create: 'Create QR Code',
  scan: 'Scan QR Code',
  bulk: 'Bulk Generator',
  designs: 'My Designs',
  settings: 'Settings',
};

export function Header({ page, onMenuToggle }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-studio-border bg-studio-surface/80 backdrop-blur-sm sticky top-0 z-20">
      <button
        className="lg:hidden p-2 rounded-lg text-studio-muted hover:text-studio-text hover:bg-studio-panel transition-colors"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-base font-semibold text-studio-text truncate">
        {pageTitles[page]}
      </h1>
    </header>
  );
}
