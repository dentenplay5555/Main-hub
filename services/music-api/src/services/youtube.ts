import { YOUTUBE_HOSTS } from '@qr-music/shared';

export function extractVideoId(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    // Allow users who just paste the 11 character video ID directly
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

    let id: string | null = null;

    if (url.hostname === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(embed|shorts)\/([A-Za-z0-9_-]+)\/?$/);
      id = match?.[2] ?? null;
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QR-Music/1.0',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      return data.title?.trim() || null;
    }
    return null;
  } catch {
    return null;
  }
}

export type AutoplayResult =
  | { ok: true; videoId: string; title: string }
  | { ok: false; reason: 'no_key' | 'no_result' | 'quota' | 'bad_key' | 'api_disabled' | 'key_restricted' | 'error'; detail?: string };

/** Maps a Google API error response to a reason the admin can act on. 403 alone is ambiguous. */
async function classifyFailure(res: Response): Promise<AutoplayResult> {
  let reason = '';
  let message = '';
  try {
    const body = (await res.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
    reason = body.error?.errors?.[0]?.reason ?? '';
    message = (body.error?.message ?? '').slice(0, 200);
  } catch { /* body was not JSON */ }
  const detail = `HTTP ${res.status}${reason ? ` ${reason}` : ''}${message ? `: ${message}` : ''}`;
  if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || res.status === 429) return { ok: false, reason: 'quota', detail };
  if (reason === 'keyInvalid' || reason === 'badRequest' && /api key/i.test(message)) return { ok: false, reason: 'bad_key', detail };
  if (reason === 'accessNotConfigured' || reason === 'forbidden' && /not been used|disabled/i.test(message)) return { ok: false, reason: 'api_disabled', detail };
  if (reason === 'ipRefererBlocked' || reason === 'referrerNotAllowed' || /referer|restriction/i.test(message)) return { ok: false, reason: 'key_restricted', detail };
  return { ok: false, reason: 'error', detail };
}

const MAX_AUTOPLAY_SECONDS = 10 * 60;

// "PT3M25S" -> 205
function isoDurationToSeconds(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return Infinity;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

// Drops "(Official Video)", "[MV]", "| Lyrics" and similar noise so the search matches the song, not the upload.
export function cleanTitleForSearch(title: string): string {
  return title
    .replace(/[\(\[【][^\)\]】]*(official|mv|m\/v|lyric|video|audio|hd|4k)[^\)\]】]*[\)\]】]/gi, ' ')
    .replace(/\|.*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

// Finds one embeddable, school-safe, reasonably short video related to `seedTitle`.
// Costs about 101 quota units per call (search 100 + videos 1), so the default
// 10,000 units/day allow roughly 100 lookups.
export async function findAutoplayVideo(
  apiKey: string | undefined,
  seedTitle: string,
  excludeVideoIds: Set<string>,
  apiBase = 'https://www.googleapis.com/youtube/v3'
): Promise<AutoplayResult> {
  if (!apiKey) return { ok: false, reason: 'no_key' };
  const query = cleanTitleForSearch(seedTitle);
  if (!query) return { ok: false, reason: 'no_result' };

  try {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: '15',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      videoCategoryId: '10', // Music
      safeSearch: 'strict',
      key: apiKey,
    });
    const searchRes = await fetch(`${apiBase}/search?${searchParams}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!searchRes.ok) return classifyFailure(searchRes);

    const searchData = (await searchRes.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    const candidates = (searchData.items ?? [])
      .map((i) => ({ id: i.id?.videoId ?? '', title: i.snippet?.title ?? '' }))
      .filter((c) => /^[A-Za-z0-9_-]{11}$/.test(c.id) && !excludeVideoIds.has(c.id));
    if (candidates.length === 0) return { ok: false, reason: 'no_result' };

    const detailParams = new URLSearchParams({
      part: 'contentDetails,status',
      id: candidates.map((c) => c.id).join(','),
      key: apiKey,
    });
    const detailRes = await fetch(`${apiBase}/videos?${detailParams}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!detailRes.ok) return classifyFailure(detailRes);

    const detailData = (await detailRes.json()) as {
      items?: { id: string; contentDetails?: { duration?: string }; status?: { embeddable?: boolean } }[];
    };
    const usable = new Map<string, boolean>();
    for (const v of detailData.items ?? []) {
      const seconds = isoDurationToSeconds(v.contentDetails?.duration ?? '');
      usable.set(v.id, v.status?.embeddable === true && seconds >= 30 && seconds <= MAX_AUTOPLAY_SECONDS);
    }

    // Search results come back in relevance order, so the first usable one is the closest match.
    const pick = candidates.find((c) => usable.get(c.id));
    if (!pick) return { ok: false, reason: 'no_result' };
    return { ok: true, videoId: pick.id, title: pick.title.trim() || pick.id };
  } catch (e) {
    return { ok: false, reason: 'error', detail: e instanceof Error ? e.message.slice(0, 200) : 'network error' };
  }
}
