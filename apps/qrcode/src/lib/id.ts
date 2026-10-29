/**
 * Random id that works on plain-HTTP pages too: crypto.randomUUID() exists only in secure contexts,
 * and this app is often opened over a LAN IP in a classroom.
 */
export function makeId(prefix = 'id'): string {
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `${prefix}-${Date.now().toString(36)}-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}
