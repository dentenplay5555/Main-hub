import type { ErrorCorrectionLevel } from '@/types';

/** Maximum bytes a version-40 QR code holds in byte mode, per error correction level. */
export const BYTE_CAPACITY: Record<ErrorCorrectionLevel, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

export interface CapacityCheck {
  bytes: number;
  limit: number;
  /** Over the hard limit: the code cannot be generated. */
  tooLong: boolean;
  /** Over roughly 600 bytes the modules get small and phone cameras struggle. */
  dense: boolean;
}

export function checkCapacity(payload: string, ec: ErrorCorrectionLevel): CapacityCheck {
  const bytes = utf8Length(payload);
  const limit = BYTE_CAPACITY[ec];
  return { bytes, limit, tooLong: bytes > limit, dense: bytes > 600 };
}
