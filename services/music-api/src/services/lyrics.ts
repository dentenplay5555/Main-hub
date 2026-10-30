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

// Channel names like "Haddaway - Topic", "HaddawayVEVO" or "Twice Official" -> the bare artist name.
export function cleanChannelName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\s*[-–]\s*topic$/i, '')
    .replace(/vevo$/i, '')
    .replace(/\b(official|channel|music|records|entertainment)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Picks the result that really is this song, or null. A wrong set of lyrics is worse than none, so the
 * result's track name must appear inside the video title. Many songs share a name ("What Is Love" by
 * Haddaway, Twice, Jennifer Lopez...), so the artist has to show up in the title or the channel name.
 * When several different artists match the track name and none of them is named, there is no safe answer.
 */
export function pickBestMatch(videoTitle: string, results: LrclibTrack[], channel?: string | null): LrclibTrack | null {
  const title = normalizeForMatch(cleanVideoTitle(videoTitle));
  const chan = normalizeForMatch(cleanChannelName(channel));
  const haystack = `${title} ${chan}`.trim();
  const named = (artist: string) => artist.length >= 2 && (` ${haystack} `).includes(` ${artist} `);

  const candidates: { track: LrclibTrack; score: number; artistNamed: boolean; artist: string }[] = [];
  for (const r of results) {
    if (!r.trackName) continue;
    const name = normalizeForMatch(r.trackName);
    if (name.length < 2 || !title.includes(name)) continue;
    if (!r.instrumental && !r.plainLyrics && !r.syncedLyrics) continue;
    const artist = r.artistName ? normalizeForMatch(r.artistName) : '';
    const artistNamed = named(artist);
    let score = 1;
    if (artistNamed) score += 4;
    if (r.syncedLyrics) score += 1;
    if (r.instrumental) score -= 0.5;
    candidates.push({ track: r, score, artistNamed, artist });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (!top.artistNamed) {
    const artists = new Set(candidates.map(c => c.artist));
    if (artists.size > 1) return null;
  }
  return top.track;
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

export async function findLyrics(videoTitle: string, base = DEFAULT_BASE, channel?: string | null): Promise<LyricsResponse> {
  const query = cleanVideoTitle(videoTitle);
  if (!query) return { found: false, reason: 'no_title' };
  const artistHint = cleanChannelName(channel);

  try {
    // Putting the channel name in the query steers LRCLIB to the right artist for common song names.
    let match = pickBestMatch(videoTitle, await search(base, { q: artistHint ? `${query} ${artistHint}` : query }), channel);
    if (!match && artistHint) {
      match = pickBestMatch(videoTitle, await search(base, { track_name: query, artist_name: artistHint }), channel);
    }
    if (!match && artistHint) {
      match = pickBestMatch(videoTitle, await search(base, { q: query }), channel);
    }
    if (!match) {
      const parts = splitArtistTitle(videoTitle);
      if (parts) {
        match = pickBestMatch(videoTitle, await search(base, { track_name: parts.track, artist_name: parts.artist }), channel);
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
