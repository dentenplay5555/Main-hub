import { Hono } from 'hono';
import { Env, AppVariables } from '../types';
import {
  getRoomByCode,
  sanitizeRoom,
  getQueueSnapshot,
  addSongToQueue,
  advanceQueue,
  recordPlayerHeartbeat,
  parseRoomSettings,
  updateRoomSettings,
} from '../services/queueService';
import { extractVideoId, fetchYouTubeTitle, fetchYouTubeInfo } from '../services/youtube';
import { findLyrics } from '../services/lyrics';
import { AddSongRequest, LyricsResponse } from '@qr-music/shared';
import { playerAuthMiddleware } from '../middleware/auth';

export const publicRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// 1. Get room info
publicRoutes.get('/rooms/:code', async (c) => {
  const code = c.req.param('code');
  const room = await getRoomByCode(c.env.DB, code);
  const requestId = c.get('requestId');

  if (!room) {
    return c.json(
      {
        ok: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' },
        requestId,
      },
      404
    );
  }

  return c.json({
    ok: true,
    data: {
      room: sanitizeRoom(room),
      publicUrl: c.env.PUBLIC_URL || undefined,
    },
    requestId,
  });
});

// 2. Get full queue snapshot
publicRoutes.get('/rooms/:code/queue', async (c) => {
  const code = c.req.param('code');
  const requestId = c.get('requestId');
  const snapshot = await getQueueSnapshot(c.env.DB, code, c.env.PUBLIC_URL);

  if (!snapshot) {
    return c.json(
      {
        ok: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' },
        requestId,
      },
      404
    );
  }

  return c.json({
    ok: true,
    data: snapshot,
    requestId,
  });
});

// 3. Post a song to queue
publicRoutes.post('/rooms/:code/songs', async (c) => {
  const code = c.req.param('code');
  const requestId = c.get('requestId');

  let body: AddSongRequest;
  try {
    body = await c.req.json<AddSongRequest>();
  } catch {
    return c.json(
      {
        ok: false,
        error: { code: 'INVALID_JSON', message: 'รูปแบบข้อมูลไม่ถูกต้อง' },
        requestId,
      },
      400
    );
  }

  if (!body.youtubeUrl || typeof body.youtubeUrl !== 'string') {
    return c.json(
      {
        ok: false,
        error: { code: 'MISSING_URL', message: 'กรุณาระบุ YouTube URL' },
        requestId,
      },
      400
    );
  }

  // Validate and truncate requestId to prevent DB injection / oversized values
  const rawReqId = body.requestId;
  const safeRequestId =
    typeof rawReqId === 'string' && rawReqId.trim().length > 0 && rawReqId.trim().length <= 64
      ? rawReqId.trim()
      : requestId;

  const videoId = extractVideoId(body.youtubeUrl);
  if (!videoId) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'INVALID_YOUTUBE_URL',
          message: 'ลิงก์ YouTube ไม่ถูกต้อง กรุณาใช้ URL ของ YouTube เช่น https://youtu.be/... หรือ https://www.youtube.com/watch?v=...',
        },
        requestId,
      },
      422
    );
  }

  const title = await fetchYouTubeTitle(videoId);

  try {
    const result = await addSongToQueue(
      c.env,
      code,
      videoId,
      title,
      safeRequestId
    );

    return c.json(
      {
        ok: true,
        data: result,
        requestId,
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const [codeStr, ...msgParts] = message.split(': ');
    return c.json(
      {
        ok: false,
        error: {
          code: codeStr || 'QUEUE_ERROR',
          message: msgParts.join(': ') || message,
        },
        requestId,
      },
      400
    );
  }
});

// 4. Query events since version (Recovery)
publicRoutes.get('/rooms/:code/events', async (c) => {
  const code = c.req.param('code');
  const sinceVersion = Number(c.req.query('since') || '0');
  const requestId = c.get('requestId');

  const room = await getRoomByCode(c.env.DB, code);
  if (!room) {
    return c.json(
      {
        ok: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' },
        requestId,
      },
      404
    );
  }

  const events = await c.env.DB
    .prepare('SELECT * FROM room_events WHERE room_id = ? AND version > ? ORDER BY version ASC LIMIT 50')
    .bind(room.id, sinceVersion)
    .all();

  return c.json({
    ok: true,
    data: {
      roomCode: room.code,
      latestVersion: room.queue_version,
      events: events.results ?? [],
    },
    requestId,
  });
});

// 4.1 Lyrics for one song of the room. The title comes from our own database, never from the client,
//     so this cannot be used as an open proxy to LRCLIB. Results are cached at the edge, not stored.
publicRoutes.get('/rooms/:code/songs/:songId/lyrics', async (c) => {
  const requestId = c.get('requestId');
  const room = await getRoomByCode(c.env.DB, c.req.param('code'));
  if (!room) {
    return c.json({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' }, requestId }, 404);
  }
  const song = await c.env.DB
    .prepare('SELECT video_id, title FROM songs WHERE id = ? AND room_id = ?')
    .bind(c.req.param('songId'), room.id)
    .first<{ video_id: string; title: string | null }>();
  if (!song) {
    return c.json({ ok: false, error: { code: 'SONG_NOT_FOUND', message: 'ไม่พบเพลงนี้ในห้อง' }, requestId }, 404);
  }
  if (!song.title) {
    return c.json({ ok: true, data: { found: false, reason: 'no_title' }, requestId });
  }

  // Cache by video id: the same song is requested in many rooms and replayed often.
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const cacheKey = new Request(`https://lyrics.cache.invalid/v2/${song.video_id}`);
  try {
    const hit = await cache?.match(cacheKey);
    if (hit) {
      const cached = (await hit.json()) as LyricsResponse;
      return c.json({ ok: true, data: cached, requestId });
    }
  } catch {
    // cache unavailable: fall through to a live lookup
  }

  // The channel name is usually the artist, which tells apart songs that share a title.
  const info = await fetchYouTubeInfo(song.video_id);
  const data = await findLyrics(song.title, c.env.LYRICS_API_BASE || undefined, info?.author);
  // Do not cache upstream failures for long; real "not found" answers can wait an hour, hits a day.
  const ttl = data.found ? 86400 : data.reason === 'unavailable' ? 0 : 3600;
  if (cache && ttl > 0) {
    try {
      await cache.put(cacheKey, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } }));
    } catch {
      // best effort
    }
  }
  return c.json({ ok: true, data, requestId });
});

// 5. Player reports song ended / requests next song
//    Requires player token — prevents spectators from spamming skip via QR code
publicRoutes.post('/rooms/:code/player/next', playerAuthMiddleware, async (c) => {
  const code = c.req.param('code');
  const requestId = c.get('requestId');
  const room = await getRoomByCode(c.env.DB, code);

  if (!room) {
    return c.json(
      {
        ok: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' },
        requestId,
      },
      404
    );
  }

  const result = await advanceQueue(c.env, room.id, 'finished');
  return c.json({
    ok: true,
    data: result,
    requestId,
  });
});

// 5.0 Autoplay switch for the player screen. Same player-token rule as skip, so spectators cannot change it.
publicRoutes.get('/rooms/:code/player/autoplay', playerAuthMiddleware, async (c) => {
  const room = await getRoomByCode(c.env.DB, c.req.param('code'));
  const requestId = c.get('requestId');
  if (!room) return c.json({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' }, requestId }, 404);
  return c.json({ ok: true, data: { autoplay: parseRoomSettings(room.settings_json).autoplay, available: Boolean(c.env.YOUTUBE_API_KEY) }, requestId });
});

publicRoutes.put('/rooms/:code/player/autoplay', playerAuthMiddleware, async (c) => {
  const room = await getRoomByCode(c.env.DB, c.req.param('code'));
  const requestId = c.get('requestId');
  if (!room) return c.json({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'ไม่พบห้องที่ระบุ' }, requestId }, 404);
  let enabled: unknown;
  try {
    enabled = ((await c.req.json()) as { enabled?: unknown }).enabled;
  } catch {
    enabled = undefined;
  }
  if (typeof enabled !== 'boolean') {
    return c.json({ ok: false, error: { code: 'INVALID_JSON', message: 'ต้องส่ง enabled เป็น true หรือ false' }, requestId }, 400);
  }
  try {
    const settings = await updateRoomSettings(c.env, room.id, { autoplay: enabled });
    return c.json({ ok: true, data: { autoplay: settings.autoplay, available: Boolean(c.env.YOUTUBE_API_KEY) }, requestId });
  } catch (err: unknown) {
    return c.json({ ok: false, error: { code: 'SETTINGS_ERROR', message: err instanceof Error ? err.message : String(err) }, requestId }, 400);
  }
});

// 5.1 Player Heartbeat — requires player token
publicRoutes.post('/rooms/:code/player/heartbeat', playerAuthMiddleware, async (c) => {
  const code = c.req.param('code');
  const requestId = c.get('requestId');
  let status = 'idle';
  try {
    const body = await c.req.json<{ status?: string }>();
    if (body.status && typeof body.status === 'string' && body.status.length <= 32) {
      status = body.status;
    }
  } catch {
    // ignore malformed body, use default status
  }

  await recordPlayerHeartbeat(c.env, code, status);
  return c.json({ ok: true, data: { status, success: true }, requestId });
});

// 6. WebSocket Upgrade Route
publicRoutes.get('/rooms/:code/ws', async (c) => {
  const code = c.req.param('code').toUpperCase();
  const room = await getRoomByCode(c.env.DB, code);

  if (!room) {
    return c.text('Room not found', 404);
  }

  // Forward WebSocket connection directly to RoomCoordinator Durable Object
  const doId = c.env.ROOM_COORDINATOR.idFromName(room.code);
  const stub = c.env.ROOM_COORDINATOR.get(doId);

  const url = new URL(c.req.url);
  url.searchParams.set('roomCode', room.code);

  const response = await stub.fetch(url.toString(), c.req.raw as any);
  return response as unknown as Response;
});
