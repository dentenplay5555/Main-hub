import type { LyricLine, LyricsResponse } from '@qr-music/shared';

const DEFAULT_BASE = 'https://lrclib.net/api';
const MAX_LINES = 400;
const MAX_PLAIN_CHARS = 20000;

interface LrclibTrack {
  trackName?: string;
  artistName?: string;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

// Lowercase, fold width/compatibility forms and keep only letters and digits, so "Don't Stop!" and
// "dont stop" compare equal. Works for Thai too (no spaces to rely on).
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

// Drops "(Official Video)", "[MV]", "(Lyrics)" style noise and turns separators into spaces.
export function cleanVideoTitle(title: string): string {
  return title
    .replace(/[\(\[【][^\)\]】]*(official|mv|m\/v|lyric|video|audio|hd|4k|ver\.?|version|ost|cover)[^\)\]】]*[\)\]】]/gi, ' ')
    .replace(/[|｜/–—:]+/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

// "Artist - Title" is the common YouTube shape. Returns both halves when the title has that form.
export function splitArtistTitle(title: string): { artist: string; track: string } | null {
  const m = title.match(/^(.{1,60}?)\s+[-–—]\s+(.{1,100})$/);
  if (!m) return null;
  const track = cleanVideoTitle(m[2]);
  const artist = cleanVideoTitle(m[1]);
  return artist && track ? { artist, track } : null;
}

/**
 * Picks the result that really is this song, or null. A wrong set of lyrics is worse than none, so the
 * result's track name must appear inside the video title.
 */
export function pickBestMatch(videoTitle: string, results: LrclibTrack[]): LrclibTrack | null {
  const haystack = normalizeForMatch(cleanVideoTitle(videoTitle));
  let best: { track: LrclibTrack; score: number } | null = null;
  for (const r of results) {
    if (!r.trackName) continue;
    const name = normalizeForMatch(r.trackName);
    if (name.length < 2 || !haystack.includes(name)) continue;
    if (!r.instrumental && !r.plainLyrics && !r.syncedLyrics) continue;
    let score = 1;
    const artist = r.artistName ? normalizeForMatch(r.artistName) : '';
    if (artist && haystack.includes(artist)) score += 2;
    if (r.syncedLyrics) score += 1;
    if (r.instrumental) score -= 0.5;
    if (!best || score > best.score) best = { track: r, score };
  }
  return best?.track ?? null;
}

// [mm:ss.xx] text, with one or more timestamps per line. Tags like [ar:...] are skipped.
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (stamps.length === 0) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(`0.${m[3]}`) : 0;
      lines.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text });
    }
  }
  lines.sort((a, b) => a.t - b.t);
  return lines.slice(0, MAX_LINES);
}

async function search(base: string, params: Record<string, string>): Promise<LrclibTrack[]> {
  const res = await fetch(`${base}/search?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': 'qr-music-api (https://github.com/dentenplay5555/main-hub)' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as LrclibTrack[]).slice(0, 20) : [];
}

export async function findLyrics(videoTitle: string, base = DEFAULT_BASE): Promise<LyricsResponse> {
  const query = cleanVideoTitle(videoTitle);
  if (!query) return { found: false, reason: 'no_title' };

  try {
    let match = pickBestMatch(videoTitle, await search(base, { q: query }));
    if (!match) {
      const parts = splitArtistTitle(videoTitle);
      if (parts) {
        match = pickBestMatch(videoTitle, await search(base, { track_name: parts.track, artist_name: parts.artist }));
      }
    }
    if (!match) return { found: false, reason: 'not_found' };

    const synced = match.syncedLyrics ? parseLrc(match.syncedLyrics) : [];
    const plain = match.plainLyrics ? match.plainLyrics.slice(0, MAX_PLAIN_CHARS) : undefined;
    return {
      found: true,
      instrumental: Boolean(match.instrumental),
      trackName: match.trackName,
      artistName: match.artistName,
      plain,
      synced: synced.length > 0 ? synced : undefined,
    };
  } catch {
    return { found: false, reason: 'unavailable' };
  }
}
