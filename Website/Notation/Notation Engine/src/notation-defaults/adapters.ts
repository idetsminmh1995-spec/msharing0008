/**
 * adapters.ts — the one place the data layer meets the engine's config
 * shapes.
 *
 * Everything else in this folder is data in the engine's own terms. This
 * file turns it into the shapes the renderer already takes, so a host can
 * build a drum mapping (or a staff-position table) without rewriting a
 * renderer.
 */

import type { DrumMapEntryOverride } from '../config/config.js';
import { STANDARD_DRUM_KIT, applyDrumOverrides, type DrumKitOverrides } from './drum-kit.js';
import { staffPositionFromLine } from './staff-position.js';

/**
 * The standard drum kit, as `config.drums.mapping`.
 *
 * Staff positions are converted out of this engine's top-down lines into
 * its bottom-up staff positions for a staff of `staffLines` — five unless
 * a caller says otherwise, since that is what a drum part is.
 *
 * Pass `overrides` to fold in a kit of your own on top: see `drum-kit.ts`.
 * A customised kit belongs there, not in an edit to the standard table.
 */
export function drumMapping(
  overrides?: DrumKitOverrides,
  staffLines = 5,
): Readonly<Record<number, DrumMapEntryOverride>> {
  const mapping: Record<number, DrumMapEntryOverride> = {};
  for (const drum of applyDrumOverrides(STANDARD_DRUM_KIT, overrides)) {
    mapping[drum.pitch] = {
      name: drum.name,
      staffPosition: staffPositionFromLine(drum.line, staffLines),
      noteheadShape: drum.notehead,
      stemDirection: drum.stemDirection,
    };
  }
  return mapping;
}
