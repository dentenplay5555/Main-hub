import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Disc3, Radio, Tv, Shield, ArrowRight, Music2, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim().toUpperCase();
    if (clean) {
      navigate(`/r/${clean}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Disc3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-wide text-white">QR Music</span>
        </div>

        <Link
          to="/admin"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>เข้าสู่ระบบ Admin</span>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        {/* Subtitle Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-300 text-xs font-medium mb-6">
          <Music2 className="w-3.5 h-3.5 text-amber-400" />
          <span>ระบบขอเพลงสำหรับงานเลี้ยง ห้องเรียน และเวทีสังสรรค์</span>
        </div>

        {/* Big Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 max-w-2xl leading-tight">
          ส่งเพลงขึ้นจอใหญ่ได้ง่ายดาย ด้วยการสแกน QR Code
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed">
          ผู้ร่วมงานค้นหาเพลงจากคลังเพลงยอดนิยม หรือวางลิงก์ที่ชอบ เพลงจะถูกจัดคิวและเล่นบนหน้าจอหลักตามลำดับอย่างราบรื่น
        </p>

        {/* Room Code Form */}
        <form
          onSubmit={handleJoin}
          className="w-full max-w-md bg-slate-900 p-2 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-2 mb-10 shadow-xl"
        >
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ใส่รหัสห้อง เช่น ROOM01"
            maxLength={10}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono text-center sm:text-left text-base tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
            aria-label="รหัสห้อง"
          />
          <button
            type="submit"
            disabled={!roomCode.trim()}
            className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-400/10"
          >
            <span>เข้าห้อง</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Feature Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-3">
                <Radio className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white text-sm mb-1">หน้าขอเพลง (Request)</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                สแกน QR Code แล้วค้นหาเพลงโปรดจากคลังเพลงหรือวางลิงก์ได้ทันที
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-3">
                <Tv className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white text-sm mb-1">หน้าจอ Player (Stage)</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                เปิดแสดงผลบนจอโปรเจกเตอร์หรือทีวี พร้อม QR Code สำหรับสแกนขอเพลง
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-3">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white text-sm mb-1">แผงควบคุม Admin</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                สร้างห้องใหม่ จัดการคิวเพลง ข้ามเพลง และลบห้องที่ไม่ใช้งานได้อย่างปลอดภัย
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-5 text-xs text-slate-400 border-t border-slate-800/80">
        QR Music : ระบบจัดคิวเพลงเรียลไทม์ผ่าน WebSocket
      </footer>
    </div>
  );
};

export default HomePage;
