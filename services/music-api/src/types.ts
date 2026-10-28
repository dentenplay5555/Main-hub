import { DurableObjectNamespace, D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ROOM_COORDINATOR: DurableObjectNamespace;
  ADMIN_PASSWORD?: string;
  /** YouTube Data API v3 key. Optional: without it the Autoplay toggle cannot be turned on. */
  YOUTUBE_API_KEY?: string;
  /** Test hook: replaces https://www.googleapis.com/youtube/v3 so tests can use a fake. */
  YOUTUBE_API_BASE?: string;
  PUBLIC_URL?: string;
  ALLOWED_ORIGINS?: string;
}

export interface AppVariables {
  requestId: string;
}
