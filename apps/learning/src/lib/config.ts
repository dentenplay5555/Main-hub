// All three values are public by design (the publishable key only identifies the project).
// Override at build time with VITE_GATEWAY_URL / VITE_SUPABASE_URL / VITE_SUPABASE_KEY.
const env = import.meta.env;

export const GATEWAY_URL = String(env.VITE_GATEWAY_URL ?? 'https://dentenplay-gateway.benten012555.workers.dev').replace(/\/$/, '');
export const SUPABASE_URL = String(env.VITE_SUPABASE_URL ?? 'https://uifwhdshcxhqzjhcgzeg.supabase.co');
export const SUPABASE_KEY = String(env.VITE_SUPABASE_KEY ?? 'sb_publishable__67CqM1dgMO0TQtg0SfD5A_DdbwA7Dl');
/** Which exercise the report reads; empty = every exercise. */
export const EXERCISE_ID = String(env.VITE_EXERCISE_ID ?? '');
