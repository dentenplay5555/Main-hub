import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api, connectRoomWebSocket, ApiError } from '../api/client';
import { QueueSnapshot, Song } from '@qr-music/shared';
import {
  SONG_CATEGORIES,
  CategoryId,
  LibrarySong,
  searchSongLibrary,
} from '../lib/songLibrary';
import {
  Send,
  Music,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListMusic,
  Clipboard,
  Radio,
  Wifi,
  WifiOff,
  Search,
  Sparkles,
  ShieldCheck,
  Plus,
  X,
  Flame,
} from 'lucide-react';

export const RequestPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);

  // Tab: 'library' | 'custom'
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');

  // Library search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [requestingSongId, setRequestingSongId] = useState<string | null>(null);

  // Custom YouTube URL form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ title: string | null; position: number } | null>(
    null
  );
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Filtered library songs
  const filteredSongs = useMemo(() => {
    return searchSongLibrary(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Load initial snapshot
  const loadQueue = async () => {
    if (!roomCode) return;
    try {
      const data = await api.getQueue(roomCode);
      setSnapshot(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('ไม่สามารถเชื่อมต่อกับห้องได้');
      }
    }
  };

  useEffect(() => {
    loadQueue();

    if (!roomCode) return;

    // Connect WebSocket
    const cleanup = connectRoomWebSocket(
      roomCode,
      (msg) => {
        if (
          msg.type === 'queue.updated' ||
          msg.type === 'song.added' ||
          msg.type === 'song.started' ||
          msg.type === 'song.skipped' ||
          msg.type === 'room.updated'
        ) {
          loadQueue();
        }
      },
      setWsStatus
    );

    return cleanup;
  }, [roomCode]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setYoutubeUrl(text);
    } catch {
      // ignore clipboard read failure on unsupported environments
    }
  };

  // Submit custom YouTube URL
  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !youtubeUrl.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await api.addSong(roomCode, youtubeUrl.trim());
      setSuccessInfo({
        title: res.song.title,
        position: res.position,
      });
      setYoutubeUrl('');
      loadQueue();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการส่งเพลง กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick request a song from the curated library
  const handleRequestLibrarySong = async (song: LibrarySong) => {
    if (!roomCode || requestingSongId || isClosed) return;

    setRequestingSongId(song.id);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await api.addSong(roomCode, song.youtubeUrl);
      setSuccessInfo({
        title: song.title + ' (' + song.artist + ')',
        position: res.position,
      });
      loadQueue();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการส่งเพลงเข้าคิว');
      }
    } finally {
      setRequestingSongId(null);
    }
  };

  const room = snapshot?.room;
  const isClosed = room && room.status !== 'open';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar roomCode={roomCode} roomName={room?.name} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Connection & Room Status */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span>ซิงก์เรียลไทม์ออนไลน์</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>กำลังเชื่อมต่อ...</span>
              </span>
            )}
          </div>
          {room && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                room.status === 'open'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {room.status === 'open' ? 'ห้องเปิดรับเพลง' : 'ห้องปิดรับเพลงชั่วคราว'}
            </span>
          )}
        </div>

        {/* Global Feedback Banner */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successInfo && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-start gap-3 text-xs text-emerald-100"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-emerald-300">
                {successInfo.position === 0
                  ? 'ส่งเพลงสำเร็จ: กำลังเล่นเพลงนี้บนหน้าจอทันที'
                  : `ส่งเพลงเข้าคิวสำเร็จ: ลำดับที่ #${successInfo.position}`}
              </p>
              <p className="text-slate-300 truncate max-w-sm sm:max-w-md mt-0.5">
                {successInfo.title || 'เพลงที่ขอ'}
              </p>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-400 hover:text-white"
              aria-label="ปิดข้อความ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Request Method Tabs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'library'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>คลังเพลงค้นหาง่าย</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'custom'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>วางลิงก์ YouTube</span>
              </button>
            </div>
          </div>

          {/* TAB 1: CURATED SONG LIBRARY & SEARCH */}
          {activeTab === 'library' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>ค้นหาเพลงยอดนิยมในคลัง</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    กดขอเพลงได้ทันที ไม่ต้องสลับไปเปิดแอป YouTube หรือก๊อปปี้ลิงก์
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อเพลง, ศิลปิน เช่น Three Man Down, Lofi..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {SONG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Song List Results */}
              <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredSongs.map((song) => {
                  const isRequesting = requestingSongId === song.id;
                  return (
                    <div
                      key={song.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                    >
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        loading="lazy"
                        className="w-14 h-11 rounded-lg object-cover border border-slate-800 shrink-0 bg-slate-900"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                            {song.title}
                          </h4>
                          {song.adFreeVerified && (
                            <span
                              title="เพลงในคลังทดสอบแล้ว เล่นต่อเนื่องราบรื่น"
                              className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>ไร้โฆษณาแทรก</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {song.artist} • <span className="text-slate-500">{song.duration}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequestLibrarySong(song)}
                        disabled={Boolean(requestingSongId) || isClosed}
                        className="px-3 py-2 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`ขอเพลง ${song.title}`}
                      >
                        {isRequesting ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{isRequesting ? 'กำลังส่ง...' : 'ขอเพลงนี้'}</span>
                      </button>
                    </div>
                  );
                })}

                {filteredSongs.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    ไม่พบเพลงที่ตรงกับ &quot;{searchQuery}&quot; คุณสามารถสลับไปแท็บ &quot;วางลิงก์ YouTube&quot; เพื่อส่งเพลงใดก็ได้
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM YOUTUBE URL */}
          {activeTab === 'custom' && (
            <form onSubmit={handleSubmitCustom} className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">วางลิงก์ YouTube URL</h3>
                <p className="text-xs text-slate-400 mb-3">
                  รองรับคลิปวิดีโอทั่วไป, MV เพลง, YouTube Shorts หรือรหัสวิดีโอ 11 หลัก
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="เช่น https://youtu.be/... หรือ https://www.youtube.com/watch?v=..."
                  disabled={loading || isClosed}
                  className="w-full pl-3.5 pr-20 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={loading || isClosed}
                  className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors disabled:opacity-40"
                  title="วางลิงก์จากคลิปบอร์ด"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>วาง</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !youtubeUrl.trim() || isClosed}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-400/10"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>กำลังส่งเข้าคิว...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ส่งเพลงเข้าคิวห้องนี้</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Now Playing Card */}
        {snapshot?.playing && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-wider mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>กำลังเล่นอยู่บนจอหลัก (Now Playing)</span>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={`https://img.youtube.com/vi/${snapshot.playing.video_id}/mqdefault.jpg`}
                alt="ภาพปกเพลง"
                className="w-16 h-12 rounded-lg object-cover border border-slate-800 shrink-0 bg-slate-950"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                  {snapshot.playing.title || `วิดีโอ (${snapshot.playing.video_id})`}
                </h4>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Music className="w-3 h-3 text-slate-400" />
                  <span>{snapshot.playing.autoplay ? 'เลือกโดย Autoplay' : 'ขอเพลงโดยผู้ร่วมงานในห้อง'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Queue List */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-amber-400" />
              <span>คิวเพลงถัดไป (Up Next)</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {snapshot?.queue?.length || 0} เพลงในคิว
            </span>
          </div>

          {snapshot?.queue && snapshot.queue.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {snapshot.queue.map((song: Song, index: number) => (
                <div
                  key={song.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3"
                >
                  <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <img
                    src={`https://img.youtube.com/vi/${song.video_id}/default.jpg`}
                    alt="ภาพปก"
                    className="w-12 h-9 rounded object-cover border border-slate-800 shrink-0 bg-slate-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {song.title || `วิดีโอ (${song.video_id})`}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>สถานะ: รอเล่นตามลำดับ</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              ยังไม่มีเพลงในคิวถัดไป เลือกเพลงจากคลังเพลงด้านบนเพื่อเป็นคนแรกได้เลย
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RequestPage;
