import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic2, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import type { LyricsResponse } from '@qr-music/shared';
import { api } from '../api/client';

interface LyricsPanelProps {
  roomCode: string;
  songId: string;
  songTitle: string | null;
  /** Seconds into the playing video. Used to follow time-stamped lyrics. */
  getTime: () => number;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; data: LyricsResponse }
  | { kind: 'error' };

const STORAGE_KEY = 'qr_music_lyrics_open';

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function LyricsPanel({ roomCode, songId, songTitle, getTime }: LyricsPanelProps) {
  const [open, setOpen] = useState(readOpen);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // A new song starts with a fresh timing offset.
  useEffect(() => setOffset(0), [songId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    setActiveIndex(-1);
    api
      .getLyrics(roomCode, songId)
      .then(data => { if (!cancelled) setState({ kind: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, [roomCode, songId, open, attempt]);

  const synced = state.kind === 'ready' && state.data.found ? state.data.synced : undefined;
  const times = useMemo(() => (synced ? synced.map(l => l.t) : []), [synced]);

  // Follow the video: find the last line whose time has passed.
  useEffect(() => {
    if (!synced || !open) return;
    const tick = () => {
      const now = getTime() + offset;
      let lo = 0, hi = times.length - 1, idx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= now) { idx = mid; lo = mid + 1; } else hi = mid - 1;
      }
      setActiveIndex(prev => (prev === idx ? prev : idx));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [synced, times, getTime, offset, open]);

  // Keep the current line centred inside the panel. Scrolls the panel only, never the page.
  useEffect(() => {
    const box = scrollRef.current;
    const el = lineRefs.current[activeIndex];
    if (!box || !el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [activeIndex]);

  const toggle = () => {
    setOpen(v => {
      try { localStorage.setItem(STORAGE_KEY, v ? '0' : '1'); } catch { /* storage blocked: toggle still works for this visit */ }
      return !v;
    });
  };

  const message = (() => {
    if (state.kind !== 'ready') return null;
    const d = state.data;
    if (d.found && d.instrumental && !d.plain && !d.synced) return 'เพลงนี้เป็นเพลงบรรเลง ไม่มีเนื้อร้อง';
    if (d.found) return null;
    if (d.reason === 'no_title') return 'เพลงนี้ไม่มีชื่อ จึงค้นหาเนื้อเพลงไม่ได้';
    if (d.reason === 'unavailable') return 'ติดต่อบริการเนื้อเพลงไม่ได้ในขณะนี้';
    return `ไม่พบเนื้อเพลงที่ตรงกับ "${songTitle ?? 'เพลงนี้'}"`;
  })();

  return (
    <section className="rounded-2xl bg-slate-900 border border-slate-800" aria-label="เนื้อเพลง">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="lyrics-body"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <Mic2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
          เนื้อเพลง
          {synced && <span className="text-[10px] font-medium text-emerald-300 border border-emerald-500/40 rounded px-1.5 py-0.5">ซิงก์ตามเวลา</span>}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />}
      </button>

      {open && (
        <div id="lyrics-body" className="px-4 pb-4">
          {state.kind === 'loading' && (
            <p className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center" role="status">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> กำลังค้นหาเนื้อเพลง
            </p>
          )}

          {state.kind === 'error' && (
            <div className="py-6 text-center text-sm text-slate-300" role="alert">
              <p>โหลดเนื้อเพลงไม่สำเร็จ</p>
              <button type="button" onClick={() => setAttempt(a => a + 1)} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200">
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> ลองอีกครั้ง
              </button>
            </div>
          )}

          {message && <p className="py-6 text-center text-sm text-slate-400">{message}</p>}

          {state.kind === 'ready' && state.data.found && !message && (
            <>
              <p className="text-xs text-slate-400 mb-2 truncate">
                {state.data.trackName}{state.data.artistName ? ` · ${state.data.artistName}` : ''}
              </p>
              <div ref={scrollRef} className="relative max-h-72 overflow-y-auto pr-2" tabIndex={0} aria-label="เนื้อเพลง เลื่อนอ่านได้">
                {synced ? (
                  <div className="space-y-2 py-24">
                    {synced.map((line, i) => (
                      <p
                        key={i}
                        ref={el => { lineRefs.current[i] = el; }}
                        aria-current={i === activeIndex ? 'true' : undefined}
                        className={`text-lg leading-snug transition-colors ${i === activeIndex ? 'text-white font-bold' : 'text-slate-500'}`}
                      >
                        {line.text || '♪'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-200">{state.data.plain}</p>
                )}
              </div>
              {synced && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>ถ้าเนื้อไม่ตรงจังหวะ ปรับเวลา:</span>
                  <button type="button" onClick={() => setOffset(o => o - 0.5)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200" aria-label="เนื้อเพลงเร็วขึ้น 0.5 วินาที">เร็วขึ้น</button>
                  <span className="font-mono w-14 text-center" aria-live="polite">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
                  <button type="button" onClick={() => setOffset(o => o + 0.5)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200" aria-label="เนื้อเพลงช้าลง 0.5 วินาที">ช้าลง</button>
                </div>
              )}
            </>
          )}

          <p className="mt-3 text-[11px] text-slate-500">เนื้อเพลงจาก LRCLIB ดึงมาแสดงชั่วคราว ไม่ได้เก็บไว้ในระบบ</p>
        </div>
      )}
    </section>
  );
}
