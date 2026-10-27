import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Play, Volume2, AlertTriangle, RefreshCw } from 'lucide-react';

export interface YouTubePlayerHandle {
  pauseVideo: () => void;
  playVideo: () => void;
  startJukebox: () => void;
}

interface YouTubePlayerProps {
  videoId: string | null;
  /**
   * Changes whenever a new song starts, even when it has the same videoId as the previous one
   * (e.g. the same video requested twice in a row). Defaults to videoId.
   */
  playKey?: string | null;
  onEnded: () => void;
  onError?: (errorText: string) => void;
  onStateChange?: (stateName: string) => void;
  autoPlay?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Load the YouTube IFrame API once for the whole page. Resolves when YT.Player is usable,
// rejects if the script cannot be loaded (offline, blocked by an ad/content blocker, ...).
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        apiPromise = null; // let the next mount try again
        reject(new Error('YouTube IFrame API failed to load'));
      };
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

// How long to wait after loading a video before deciding the browser blocked autoplay.
const AUTOPLAY_CHECK_MS = 3000;
const AUTOPLAY_RECHECK_MS = 2000;
const ERROR_SKIP_MS = 4000;

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  ({ videoId, playKey, onEnded, onError, onStateChange, autoPlay = true }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [apiFailed, setApiFailed] = useState(false);

    // The YT event handlers live as long as the player, so they must read the latest callbacks
    // from a ref instead of the ones captured on the first render.
    const callbacks = useRef({ onEnded, onError, onStateChange });
    callbacks.current = { onEnded, onError, onStateChange };

    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedByCommandRef = useRef(false);

    const clearTimers = () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      skipTimerRef.current = null;
      watchdogRef.current = null;
    };

    // Expose control methods to parent via ref
    useImperativeHandle(ref, () => ({
      pauseVideo: () => {
        pausedByCommandRef.current = true;
        const p = playerRef.current;
        if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
      },
      playVideo: () => {
        pausedByCommandRef.current = false;
        const p = playerRef.current;
        if (p && typeof p.playVideo === 'function') {
          p.playVideo();
          setAutoplayBlocked(false);
        }
      },
      startJukebox: () => {
        pausedByCommandRef.current = false;
        const p = playerRef.current;
        if (p && typeof p.playVideo === 'function') {
          try {
            p.playVideo();
            setAutoplayBlocked(false);
          } catch {
            // ignore
          }
        }
      },
    }));

    // 1. Create the YT.Player exactly once. The host element is always mounted (even when the
    //    queue is empty), so the player exists by the time the first song arrives.
    useEffect(() => {
      let cancelled = false;

      loadYouTubeApi()
        .then(() => {
          if (cancelled || !hostRef.current) return;

          // YT replaces its target element with an iframe, so give it a throwaway child
          // instead of an element React manages.
          const target = document.createElement('div');
          target.style.width = '100%';
          target.style.height = '100%';
          hostRef.current.appendChild(target);

          playerRef.current = new window.YT.Player(target, {
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 0,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                if (!cancelled) setIsReady(true);
              },
              onAutoplayBlocked: () => {
                if (!cancelled) setAutoplayBlocked(true);
              },
              onStateChange: (event: any) => {
                if (cancelled) return;
                const state = event.data;
                // YT.PlayerState: ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
                if (state === 0) {
                  if (watchdogRef.current) clearTimeout(watchdogRef.current);
                  callbacks.current.onStateChange?.('ENDED');
                  callbacks.current.onEnded();
                } else if (state === 1) {
                  if (watchdogRef.current) clearTimeout(watchdogRef.current);
                  setAutoplayBlocked(false);
                  setErrorStatus(null);
                  callbacks.current.onStateChange?.('PLAYING');
                } else if (state === 2) {
                  callbacks.current.onStateChange?.('PAUSED');
                } else if (state === 3) {
                  callbacks.current.onStateChange?.('BUFFERING');
                }
              },
              onError: (event: any) => {
                if (cancelled) return;
                const errCode = event.data;
                let msg = 'เกิดข้อผิดพลาดในการเล่นวิดีโอ';
                if (errCode === 2) {
                  msg = 'ลิงก์วิดีโอไม่ถูกต้อง';
                } else if (errCode === 5) {
                  msg = 'เบราว์เซอร์เล่นวิดีโอนี้ไม่ได้ (HTML5 player error)';
                } else if (errCode === 100) {
                  msg = 'ไม่พบวิดีโอนี้ หรือถูกตั้งเป็นส่วนตัว';
                } else if (errCode === 101 || errCode === 150) {
                  msg = 'เจ้าของวิดีโอนี้ไม่อนุญาตให้เล่นนอก YouTube (Embedding Blocked)';
                }
                setErrorStatus(msg);
                callbacks.current.onError?.(msg);

                // Auto-skip an unplayable video so it cannot freeze the queue. The timer is cleared
                // whenever another song is loaded, so it can never skip the *next* song by mistake.
                if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
                skipTimerRef.current = setTimeout(() => {
                  skipTimerRef.current = null;
                  callbacks.current.onEnded();
                }, ERROR_SKIP_MS);
              },
            },
          });
        })
        .catch(() => {
          if (!cancelled) setApiFailed(true);
        });

      return () => {
        cancelled = true;
        clearTimers();
        try {
          playerRef.current?.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
        if (hostRef.current) hostRef.current.innerHTML = '';
      };
    }, []);

    // 2. Load / stop the video whenever the current song changes.
    const loadKey = playKey ?? videoId;
    useEffect(() => {
      clearTimers();
      setErrorStatus(null);
      setAutoplayBlocked(false);
      pausedByCommandRef.current = false;

      const p = playerRef.current;
      if (!isReady || !p) return;

      if (!videoId) {
        try {
          p.stopVideo();
        } catch {
          // ignore
        }
        return;
      }

      try {
        if (autoPlay) {
          p.loadVideoById(videoId);
        } else {
          p.cueVideoById(videoId);
        }
      } catch (e) {
        console.error('Error loading video:', e);
        return;
      }

      if (!autoPlay) return;

      // Watchdog: browsers can silently refuse to start playback (autoplay policy) without throwing.
      // If the video is not playing/buffering shortly after loading, retry once, then show the
      // "Start Jukebox" button so a human can start it.
      const notPlaying = () => {
        let state = -2;
        try {
          state = p.getPlayerState();
        } catch {
          // ignore
        }
        return state !== 1 && state !== 3 && state !== 0;
      };
      watchdogRef.current = setTimeout(() => {
        if (pausedByCommandRef.current || !notPlaying()) return;
        try {
          p.playVideo();
        } catch {
          // ignore
        }
        watchdogRef.current = setTimeout(() => {
          watchdogRef.current = null;
          if (!pausedByCommandRef.current && notPlaying()) setAutoplayBlocked(true);
        }, AUTOPLAY_RECHECK_MS);
      }, AUTOPLAY_CHECK_MS);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadKey, isReady]);

    const handleStartPlayback = () => {
      pausedByCommandRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.playVideo();
          setAutoplayBlocked(false);
        } catch {
          // ignore
        }
      }
    };

    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden glass-panel border border-white/15 shadow-2xl shadow-accent-purple/10">
        {/* YouTube IFrame host: always mounted so the player survives an empty queue */}
        <div ref={hostRef} className="absolute inset-0" />

        {/* Empty queue */}
        {!videoId && (
          <div className="absolute inset-0 z-10 bg-jukebox-bg glass-card flex flex-col items-center justify-center p-8 text-center border border-white/10">
            <div className="w-16 h-16 rounded-full bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple mb-4">
              <Volume2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ยังไม่มีเพลงในคิว</h3>
            <p className="text-sm text-slate-400 max-w-md">
              สแกน QR Code ด้านขวา หรือส่ง YouTube URL เข้ามาเพื่อเริ่มเล่นเพลงแรก
            </p>
          </div>
        )}

        {/* YouTube API could not be loaded */}
        {apiFailed && (
          <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-accent-rose/20 border border-accent-rose flex items-center justify-center text-accent-rose mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">โหลดตัวเล่น YouTube ไม่ได้</h4>
            <p className="text-sm text-slate-300 max-w-md">
              ตรวจสอบอินเทอร์เน็ต หรือปิดตัวบล็อกโฆษณา/Content Blocker สำหรับหน้านี้ แล้วรีเฟรช
            </p>
          </div>
        )}

        {/* Autoplay blocked overlay per scope.md section 9.2 */}
        {videoId && autoplayBlocked && !errorStatus && (
          <div className="absolute inset-0 bg-jukebox-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-full bg-accent-purple/20 border border-accent-purple flex items-center justify-center text-accent-purple mb-4 animate-bounce">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">เริ่มเล่นเสียงบนหน้าจอนี้</h4>
            <p className="text-sm text-slate-300 max-w-sm mb-6">
              เบราว์เซอร์ต้องการให้ผู้ใช้กดเริ่มเล่นเพลงครั้งแรกเพื่อเปิดเสียง (Autoplay Policy)
            </p>
            <button
              onClick={handleStartPlayback}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan text-white font-bold shadow-lg shadow-accent-purple/30 hover:scale-105 active:scale-95 transition-all"
            >
              Start Jukebox
            </button>
          </div>
        )}

        {/* Unplayable Error Overlay */}
        {videoId && errorStatus && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-accent-rose/20 border border-accent-rose flex items-center justify-center text-accent-rose mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">วิดีโอนี้เล่นไม่ได้</h4>
            <p className="text-sm text-slate-300 max-w-md mb-4">{errorStatus}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-accent-cyan" />
              <span>กำลังข้ามไปยังเพลงถัดไปให้อัตโนมัติ...</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);
