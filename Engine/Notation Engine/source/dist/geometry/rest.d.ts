import type { DurationType } from '../core/duration.js';
/**
 * The real SMuFL rest glyph for each duration -- verified against
 * glyphnames.json before writing this. Like flags and time-signature
 * digits, quarter/half/whole use spelled words while everything shorter
 * uses the numeral ("rest8th", not "restEighth").
 */
export declare function restGlyphName(durationType: DurationType): string;
/** The glyph for a multi-measure rest (a horizontal bar spanning several measures) -- separate from the per-duration glyphs above since it isn't tied to a DurationType at all. */
export declare function multiMeasureRestGlyphName(): string;
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
export declare function defaultRestY(durationType: DurationType, numLines: number): number;
/**
 * The full rest Y position including an optional per-voice offset.
 * `voiceOffset` exists so a future multi-voice layout (Phase 25, §13)
 * can keep two voices' rests from landing on the same Y -- a bug already
 * hit once in the pre-Phase-1 prototype (two voices' rests both
 * defaulting to the shared middle line and colliding), now prevented by
 * making the offset a first-class parameter here rather than leaving
 * every future caller to remember to separate them by hand.
 */
export declare function restY(durationType: DurationType, numLines: number, voiceOffset?: number): number;
