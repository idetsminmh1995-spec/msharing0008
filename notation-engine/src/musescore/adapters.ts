/**
 * adapters.ts — the one place MuseScore's numbers meet this engine's.
 *
 * Everything else in this folder is MuseScore's data in MuseScore's own
 * terms. This file turns it into the shapes this engine already takes,
 * so a host can say "render this the way MuseScore would" by passing
 * one config object rather than by rewriting a renderer.
 *
 * It is opt-in, and that is deliberate. Nothing in the engine imports
 * this file; nothing changes for anyone who does not call it. The
 * engine's own defaults remain the engine's own.
 */

import type { DrumMapEntryOverride } from '../config/config.js';
import { MUSESCORE_DRUMSET, type MuseScoreDrum } from './drumset.js';
import { museScoreNoteheadGlyph } from './noteheads.js';
import { staffPositionFromLine } from './staff-position.js';
import { applyDrumOverrides, type MuseScoreOverrides } from './overrides.js';

/**
 * MuseScore's notehead groups, in this engine's own shape-family names.
 *
 * Only the groups a drumset or a MusicXML file can produce. A group
 * with no family of its own here is left out rather than approximated:
 * `drumMappingFromMuseScore` falls back to the glyph itself for those,
 * which is exact.
 */
export const NOTEHEAD_GROUP_TO_SHAPE: Readonly<Record<string, string>> = {
  HEAD_NORMAL: 'normal',
  HEAD_CROSS: 'x',
  HEAD_PLUS: 'plus',
  HEAD_XCIRCLE: 'circle-x',
  HEAD_TRIANGLE_UP: 'triangle',
  HEAD_TRIANGLE_DOWN: 'inverted-triangle',
  HEAD_SLASHED1: 'slashed',
  HEAD_SLASHED2: 'back-slashed',
  HEAD_DIAMOND: 'diamond',
  HEAD_CIRCLED: 'circled',
  HEAD_LARGE_ARROW: 'arrow-up',
  HEAD_SLASH: 'slash',
  HEAD_DO: 'do',
  HEAD_RE: 're',
  HEAD_MI: 'mi',
  HEAD_FA: 'fa',
  HEAD_SOL: 'so',
  HEAD_LA: 'la',
  HEAD_TI: 'ti',
};

/**
 * The notehead this engine should draw for one MuseScore drum.
 *
 * A HEAD_CUSTOM drum names a SMuFL glyph outright -- MuseScore's slap,
 * china cymbal, muted conga and muted surdo all do -- and that glyph is
 * returned as-is, because a shape family that does not contain it would
 * be a worse answer than the real one.
 */
export function noteheadForDrum(drum: MuseScoreDrum): string {
  if (drum.customNotehead !== undefined) return drum.customNotehead;
  const shape = NOTEHEAD_GROUP_TO_SHAPE[drum.notehead];
  if (shape !== undefined) return shape;
  return museScoreNoteheadGlyph(drum.notehead, 'quarter') ?? 'normal';
}

/**
 * MuseScore's standard drumset, as `config.drums.mapping`.
 *
 * Staff positions are converted out of MuseScore's top-down lines into
 * this engine's bottom-up ones for a staff of `staffLines` -- five
 * unless a caller says otherwise, since that is what a drum part is.
 *
 * Pass `overrides` to fold in a kit of your own on top: see
 * `overrides.ts`. The owner's own MuseScore customisations belong
 * there, not in an edit to the table this is built from.
 */
export function drumMappingFromMuseScore(
  overrides?: MuseScoreOverrides,
  staffLines = 5,
): Readonly<Record<number, DrumMapEntryOverride>> {
  const mapping: Record<number, DrumMapEntryOverride> = {};
  for (const drum of applyDrumOverrides(MUSESCORE_DRUMSET, overrides)) {
    mapping[drum.pitch] = {
      name: drum.name,
      staffPosition: staffPositionFromLine(drum.line, staffLines),
      noteheadShape: noteheadForDrum(drum),
      stemDirection: drum.stemDirection,
    };
  }
  return mapping;
}

/**
 * Which voice MuseScore puts each drum in, by MIDI pitch.
 *
 * Separate from the mapping above because this engine's drum config has
 * no voice field: voice is decided by the file, not by the kit. It is
 * exposed so a host that BUILDS a drum part (rather than reading one)
 * can put the feet in voice 2 the way MuseScore does -- which is what
 * gives a drum chart its stems-down kick line.
 */
export function drumVoicesFromMuseScore(): Readonly<Record<number, number>> {
  const voices: Record<number, number> = {};
  for (const drum of MUSESCORE_DRUMSET) voices[drum.pitch] = drum.voice;
  return voices;
}
