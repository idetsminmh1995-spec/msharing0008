import type { SlideKind } from '../core/note.js';
export type { SlideKind } from '../core/note.js';
export interface SlideShape {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly kind: SlideKind;
}
/** Straight guitar slide or lightly wavy glissando; coordinates are SVG staff-space coordinates. */
export function computeSlideShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  kind: SlideKind,
): SlideShape {
  if (![startX, startY, endX, endY].every(Number.isFinite))
    throw new Error('slide coordinates must be finite');
  if (endX < startX) throw new Error('slide endpoint must not precede start');
  return { startX, startY, endX, endY, kind };
}
