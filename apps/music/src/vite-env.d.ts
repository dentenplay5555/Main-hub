/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the music API Worker, e.g. https://qr-music-api.<account>.workers.dev. Empty = same origin. */
  readonly VITE_MUSIC_API_BASE?: string;
}
