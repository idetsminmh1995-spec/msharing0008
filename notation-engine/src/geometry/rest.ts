import type { DurationType } from '../core/duration.js';
import { middleLineY } from './stem.js';

/**
 * The real SMuFL rest glyph for each duration -- verified against
 * glyphnames.json before writing this. Like flags and time-signature
 * digits, quarter/half/whole use spelled words while everything shorter
 * uses the numeral ("rest8th", not "restEighth").
 */
export function restGlyphName(durationType: DurationType): string {
  switch (durationType) {
    case 'whole':
      return 'restWhole';
    case 'half':
      return 'restHalf';
    case 'quarter':
      return 'restQuarter';
    case 'eighth':
      return 'rest8th';
    case '16th':
      return 'rest16th';
    case '32nd':
      return 'rest32nd';
    case '64th':
      return 'rest64th';
    case '128th':
      return 'rest128th';
    case '256th':
      return 'rest256th';
    case '512th':
      return 'rest512th';
    case '1024th':
      return 'rest1024th';
  }
}

/** The glyph for a multi-measure rest (a horizontal bar spanning several measures) -- separate from the per-duration glyphs above since it isn't tied to a DurationType at all. */
export function multiMeasureRestGlyphName(): string {
  return 'restHBar';
}

/**
 * §9.10's default/special-case vertical placement, before any per-voice
 * offset: quarter-and-shorter center on the middle line; **whole and half
 * are special-cased**, per real engraving convention (confirmed against
 * Bravura's own glyph bounding boxes before writing this -- restWhole's
 * shape sits almost entirely BELOW its own baseline, so placing that
 * baseline one staff-space above the middle line makes it hang from the
 * line above; restHalf's shape sits almost entirely ABOVE its baseline,
 * so placing that baseline AT the middle line makes it sit on top of it
 * -- which is also exactly the plain default, so half rest doesn't
 * actually need a numeric exception, only whole does).
 */
export function defaultRestY(durationType: DurationType, numLines: number): number {
  const middle = middleLineY(numLines);
  if (durationType === 'whole') {
    return middle - 1;
  }
  return middle;
}

/**
 * The full rest Y position including an optional per-voice offset.
 * `voiceOffset` exists so a future multi-voice layout (Phase 25, §13)
 * can keep two voices' rests from landing on the same Y -- a bug already
 * hit once in the pre-Phase-1 prototype (two voices' rests both
 * defaulting to the shared middle line and colliding), now prevented by
 * making the offset a first-class parameter here rather than leaving
 * every future caller to remember to separate them by hand.
 */
export function restY(durationType: DurationType, numLines: number, voiceOffset = 0): number {
  return defaultRestY(durationType, numLines) + voiceOffset;
}
