/**
 * overrides.ts — room for the kit the owner actually uses.
 *
 * MuseScore's standard drumset is a default, and the owner's own
 * MuseScore may not be using it: a drum palette edited in MuseScore,
 * or a custom drumset file, moves instruments to other lines and gives
 * them other noteheads, and the exported MusicXML carries the MIDI
 * pitches without a word about any of it.
 *
 * So the tables in this folder are never edited to match one person's
 * MuseScore. A difference goes HERE instead, as an override with a note
 * saying where it came from -- a screenshot, a .drm file, a bar of a
 * real score -- and the standard table stays a faithful record of what
 * MuseScore ships. Both questions then have an answer: what MuseScore
 * does by default, and what this owner's MuseScore does.
 */

import type { MuseScoreDrum } from './drumset.js';

/** One drum's worth of difference from MuseScore's standard drumset. */
export interface DrumOverride {
  readonly pitch: number;
  readonly name?: string;
  /** MuseScore's own line convention: 0 = top staff line, +1 = half a space down. */
  readonly line?: number;
  /** A `NoteHeadGroup` name, as in `noteheads.ts`. */
  readonly notehead?: string;
  /** A SMuFL glyph, where no group describes it. */
  readonly customNotehead?: string;
  readonly stemDirection?: 'up' | 'down';
  readonly voice?: number;
  /**
   * Where this came from, in a few words -- "screenshot 2026-10-03,
   * bar 5", "Lesson5.drm". Required, because an override with no
   * evidence behind it is the guess this layer exists to avoid.
   */
  readonly evidence: string;
}

export interface MuseScoreOverrides {
  /** A name for the kit these describe, for diagnostics. */
  readonly name?: string;
  readonly drums?: readonly DrumOverride[];
}

/**
 * MuseScore's drumset with a set of overrides folded in.
 *
 * An override for a pitch MuseScore does not define ADDS that drum
 * rather than being dropped -- a custom kit may well use a pitch the
 * standard one leaves empty -- and such an entry must therefore carry
 * everything a drum needs. One that does not is skipped, so a
 * half-filled override can never produce a drum sitting on line 0 with
 * a normal notehead by accident.
 */
export function applyDrumOverrides(
  base: readonly MuseScoreDrum[],
  overrides?: MuseScoreOverrides,
): readonly MuseScoreDrum[] {
  const list = overrides?.drums;
  if (list === undefined || list.length === 0) return base;

  const byPitch = new Map(base.map((d) => [d.pitch, d]));
  for (const over of list) {
    const existing = byPitch.get(over.pitch);
    if (existing === undefined) {
      if (over.line === undefined || over.notehead === undefined) continue;
      byPitch.set(over.pitch, {
        pitch: over.pitch,
        name: over.name ?? `Drum ${over.pitch}`,
        notehead: over.notehead,
        ...(over.customNotehead === undefined ? {} : { customNotehead: over.customNotehead }),
        line: over.line,
        stemDirection: over.stemDirection ?? 'up',
        voice: over.voice ?? 0,
      });
      continue;
    }
    byPitch.set(over.pitch, {
      ...existing,
      ...(over.name === undefined ? {} : { name: over.name }),
      ...(over.notehead === undefined ? {} : { notehead: over.notehead }),
      ...(over.customNotehead === undefined ? {} : { customNotehead: over.customNotehead }),
      ...(over.line === undefined ? {} : { line: over.line }),
      ...(over.stemDirection === undefined ? {} : { stemDirection: over.stemDirection }),
      ...(over.voice === undefined ? {} : { voice: over.voice }),
    });
  }
  return [...byPitch.values()].sort((a, b) => a.pitch - b.pitch);
}
