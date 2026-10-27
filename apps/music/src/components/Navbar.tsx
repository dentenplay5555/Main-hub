import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Disc3, Radio, Tv, Shield, Home } from 'lucide-react';

interface NavbarProps {
  roomCode?: string;
  roomName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ roomCode, roomName }) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
          <Disc3 className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide text-white">
            QR MUSIC
          </span>
          <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Jukebox
          </span>
        </div>
      </Link>

      {/* Center Room Badge if in room context */}
      {roomCode && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">ห้อง:</span>
          <span className="font-bold text-white tracking-wide">{roomName || roomCode}</span>
          <span className="text-slate-500 font-mono">({roomCode})</span>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex items-center gap-2" aria-label="เมนูหลัก">
        <Link
          to="/"
          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
            location.pathname === '/'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="หน้าแรก"
          aria-label="หน้าแรก"
        >
          <Home className="w-4 h-4" />
        </Link>

        {roomCode && (
          <>
            <Link
              to={`/r/${roomCode}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                location.pathname.startsWith('/r/')
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ขอเพลง</span>
            </Link>

            <Link
              to={`/p/${roomCode}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                location.pathname.startsWith('/p/')
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จอ Player</span>
            </Link>
          </>
        )}

        <Link
          to="/admin"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            location.pathname.startsWith('/admin')
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;
