import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { LyricsPanel } from '../components/LyricsPanel';
import { api, connectRoomWebSocket } from '../api/client';
import { QueueSnapshot, Song } from '@qr-music/shared';
import {
  Maximize2,
  Minimize2,
  SkipForward,
  ListMusic,
  Radio,
  Wifi,
  Volume2,
  ShieldCheck,
  Info,
} from 'lucide-react';

export const PlayerPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();

  // Read player token from URL ?token=... and persist to localStorage once
  const playerTokenInUrl = searchParams.get('token');
  const hasPlayerToken = useRef(false);

  useEffect(() => {
    if (playerTokenInUrl && !hasPlayerToken.current) {
      api.setPlayerToken(playerTokenInUrl);
      hasPlayerToken.current = true;
    }
  }, [playerTokenInUrl]);

  const canControl = Boolean(playerTokenInUrl || api.getPlayerToken());

  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showAdTips, setShowAdTips] = useState(false);
  const [autoplay, setAutoplay] = useState<{ on: boolean; available: boolean; busy: boolean; error: string | null } | null>(null);

  // Store playerState in a ref so heartbeat always sends the latest value
  // without adding it to useEffect dependency array.
  const playerStateRef = useRef<string>('Ready');
  const [playerStateDisplay, setPlayerStateDisplay] = useState<string>('Ready');

  const ytRef = useRef<import('../components/YouTubePlayer').YouTubePlayerHandle>(null);
  const getVideoTime = React.useCallback(() => ytRef.current?.getCurrentTime() ?? 0, []);

  const loadQueue = async () => {
    if (!roomCode) return;
    try {
      const data = await api.getQueue(roomCode);
      setSnapshot((prev) =>
        prev && prev.room.id === data.room.id && data.queueVersion < prev.queueVersion ? prev : data
      );
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  };

  const loadAutoplay = React.useCallback(async () => {
    if (!roomCode || !canControl) return;
    try {
      const a = await api.getPlayerAutoplay(roomCode);
      setAutoplay((prev) => ({ on: a.autoplay, available: a.available, busy: prev?.busy ?? false, error: prev?.error ?? null }));
    } catch {
      setAutoplay(null);
    }
  }, [roomCode, canControl]);

  useEffect(() => {
    void loadAutoplay();
  }, [loadAutoplay]);

  const toggleAutoplay = async () => {
    if (!roomCode || !autoplay || autoplay.busy) return;
    const next = !autoplay.on;
    setAutoplay({ ...autoplay, busy: true, error: null });
    try {
      const a = await api.setPlayerAutoplay(roomCode, next);
      setAutoplay({ on: a.autoplay, available: a.available, busy: false, error: null });
      loadQueue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setAutoplay({
        ...autoplay,
        busy: false,
        error: msg.includes('AUTOPLAY_UNAVAILABLE') ? 'เซิร์ฟเวอร์ยังไม่มี YOUTUBE_API_KEY จึงเปิด Autoplay ไม่ได้' : 'เปลี่ยน Autoplay ไม่สำเร็จ ลองอีกครั้ง',
      });
    }
  };

  const handleSongEnded = async () => {
    if (!roomCode) return;
    try {
      await api.nextSong(roomCode);
      loadQueue();
    } catch (err) {
      console.error('Failed to advance song:', err);
    }
  };

  const handleManualSkip = async () => {
    if (!roomCode || !snapshot?.playing) return;
    try {
      await api.nextSong(roomCode);
      loadQueue();
    } catch (err) {
      console.error('Failed to skip song:', err);
    }
  };

  // Track YouTube player state without causing WS reconnects
  const handleStateChange = (state: string) => {
    playerStateRef.current = state;
    setPlayerStateDisplay(state);
  };

  useEffect(() => {
    loadQueue();
    if (!roomCode) return;

    // Initial heartbeat and periodic (every 15s)
    api.sendPlayerHeartbeat(roomCode, playerStateRef.current).catch(() => {});
    const heartbeatTimer = setInterval(() => {
      api.sendPlayerHeartbeat(roomCode, playerStateRef.current).catch(() => {});
      loadQueue();
    }, 15000);

    // WebSocket connection
    const cleanup = connectRoomWebSocket(
      roomCode,
      (msg) => {
        if (
          msg.type === 'queue.updated' ||
          msg.type === 'song.added' ||
          msg.type === 'song.started' ||
          msg.type === 'song.skipped'
        ) {
          loadQueue();
        } else if (msg.type === 'room.updated') {
          void loadAutoplay();
        } else if (msg.type === 'player.command') {
          const cmd = (msg.payload as any)?.command;
          if (cmd === 'pause') {
            ytRef.current?.pauseVideo();
          } else if (cmd === 'play') {
            ytRef.current?.playVideo();
          } else if (cmd === 'start') {
            ytRef.current?.startJukebox();
          } else if (cmd === 'skip') {
            handleManualSkip();
          }
        }
      },
      setWsStatus
    );

    return () => {
      clearInterval(heartbeatTimer);
      cleanup();
    };
    // Intentionally omit playerStateRef from deps: it is a ref, not reactive state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const room = snapshot?.room;
  const currentSong = snapshot?.playing;
  const queue = snapshot?.queue || [];

  return (
    <div className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${isFullscreen ? 'bg-black' : ''}`}>
      {!isFullscreen && <Navbar roomCode={roomCode} roomName={room?.name} />}

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Player and Now Playing */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-sm text-white tracking-wide">
                {room?.name || 'Classroom Player'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                {roomCode}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                : {playerStateDisplay}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {autoplay && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoplay.on}
                  aria-busy={autoplay.busy}
                  onClick={toggleAutoplay}
                  title="เมื่อคิวหมด ให้หาเพลงที่คล้ายกันจาก YouTube มาเล่นต่อ"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span className={`relative inline-block w-8 h-4 rounded-full transition-colors ${autoplay.on ? 'bg-emerald-500' : 'bg-slate-600'}`} aria-hidden="true">
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${autoplay.on ? 'translate-x-4' : ''}`} />
                  </span>
                  <span>Autoplay</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAdTips(!showAdTips)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                title="เคล็ดลับเล่นเพลงแบบไร้โฆษณา"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">ป้องกันโฆษณา</span>
              </button>

              {/* Only show skip button if this browser has a player token */}
              {currentSong && canControl && (
                <button
                  type="button"
                  onClick={handleManualSkip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  title="ข้ามเพลงนี้"
                >
                  <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">ข้ามเพลง</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
                aria-label={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </div>
          </div>

          {autoplay?.error && (
            <p role="alert" className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {autoplay.error}
            </p>
          )}

          {/* Ad Tips Info Box (Collapsible) */}
          {showAdTips && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white mb-1">
                  คำแนะนำสำหรับการเล่นเพลงบนเวทีหรือห้องเรียนโดยไม่มีโฆษณาแทรก:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>ระบบเปิดใช้งานโหมดความเป็นส่วนตัว (youtube-nocookie) เป็นค่าเริ่มต้นแล้ว</li>
                  <li>ขอแนะนำให้เปิดหน้านี้ด้วยเบราว์เซอร์ที่มีตัวบล็อกโฆษณาในตัว เช่น Brave Browser</li>
                  <li>หรือติดตั้งส่วนขยาย uBlock Origin บน Chrome / Edge จะป้องกันโฆษณาวิดีโอได้ 100%</li>
                  <li>เลือกเพลงจากแท็บ &quot;คลังเพลงค้นหาง่าย&quot; ในหน้าขอเพลง ซึ่งเป็นเพลงที่ผ่านการคัดสรรแล้ว</li>
                </ul>
              </div>
            </div>
          )}

          {/* YouTube Player, with the lyrics beside it on wide screens so nothing gets pushed down */}
          <div className={currentSong && roomCode ? 'grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}>
            <div className="w-full min-w-0">
              <YouTubePlayer
                ref={ytRef}
                videoId={currentSong?.video_id || null}
                playKey={currentSong?.id ?? null}
                onEnded={handleSongEnded}
                onStateChange={handleStateChange}
              />
            </div>
            {currentSong && roomCode && (
              <div className="relative min-w-0 lg:min-h-0">
                <div className="lg:absolute lg:inset-0 lg:flex lg:flex-col">
                  <LyricsPanel
                    fill
                    roomCode={roomCode}
                    songId={currentSong.id}
                    songTitle={currentSong.title}
                    getTime={getVideoTime}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Now Playing Details Bar */}
          {currentSong ? (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wider uppercase mb-1">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>กำลังเล่น (Now Playing)</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white truncate">
                  {currentSong.title || `วิดีโอ (${currentSong.video_id})`}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {currentSong.autoplay ? 'เลือกโดย Autoplay จากเพลงก่อนหน้า' : 'เพลงที่ส่งเข้าคิวในห้องนี้'}
                </p>
              </div>

              <div className="hidden sm:flex flex-col items-end shrink-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  VIDEO ID
                </span>
                <span className="text-xs font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  {currentSong.video_id}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
              ไม่มีเพลงที่กำลังเล่นอยู่ สแกน QR Code เพื่อส่งเพลงได้ทันที
            </div>
          )}

        </div>

        {/* Right Column: QR Code and Up Next Queue */}
        <div className="w-full lg:w-96 flex flex-col gap-5">
          {/* QR Code Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <Radio className="w-3.5 h-3.5" />
              <span>SCAN TO REQUEST</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">สแกนเพื่อส่งเพลงเข้าคิว</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              เปิดกล้องมือถือสแกนเพื่อค้นหาเพลงในคลังและส่งเข้าคิวได้ทันที
            </p>

            {roomCode && (
              <QRCodeDisplay
                roomCode={roomCode}
                publicUrl={snapshot?.publicUrl}
                size={180}
                showLink={true}
              />
            )}
          </div>

          {/* Up Next List */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white">เพลงถัดไป (Up Next)</h4>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {queue.length} เพลง
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-96 flex flex-col gap-2 pr-1">
              {queue.length > 0 ? (
                queue.map((song: Song, index: number) => (
                  <div
                    key={song.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                  >
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <img
                      src={`https://img.youtube.com/vi/${song.video_id}/default.jpg`}
                      alt="ภาพปกเพลง"
                      className="w-12 h-9 rounded object-cover border border-slate-800 shrink-0 bg-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {song.title || `วิดีโอ (${song.video_id})`}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {song.video_id}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400">
                  <span>ยังไม่มีเพลงในคิวถัดไป</span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    สแกน QR Code ด้านบนเพื่อส่งเพลงคนแรก
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlayerPage;
