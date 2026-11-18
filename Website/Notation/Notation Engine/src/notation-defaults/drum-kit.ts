/**
 * drum-kit.ts — where each drum of a standard kit is drawn.
 *
 * A MusicXML drum note carries a General MIDI key number and nothing
 * else: no staff line, no notehead, no stem. Two programs reading the
 * same file therefore draw two different charts unless they agree on the
 * table behind it. This is that table, stated once.
 *
 * ## Where the two halves of each row come from
 *
 *   - The KEY NUMBER and the NAME are the General MIDI 1 percussion key
 *     map (`gm1`), which is public and fixed: key 38 is Acoustic Snare
 *     in every GM file ever written.
 *   - The STAFF LINE and NOTEHEAD are standard drum-kit notation
 *     (`drum-notation`): the kick below the staff with a normal head,
 *     the snare on the middle line, the hi-hat above with an x, the
 *     ride as an x on the top line, the crash with a circled x. These
 *     are settled engraving conventions rather than one program's
 *     choice, which is why a reader from any tradition recognises the
 *     chart.
 *
 * `line` is this engine's own convention, stated here once: staff lines
 * counted from the TOP, 0 = top line, +1 = half a staff space DOWNWARD.
 * `staff-position.ts` converts it into the engine's bottom-up y units.
 *
 * ## Overridable, deliberately
 *
 * Notators genuinely vary, and a kit may be customised. Nothing here is
 * ever edited to match one person's setup: a difference goes in
 * `config.drums.mapping`, or through `drumMapping({ overrides })` below,
 * with a note saying where it came from. The table stays a faithful
 * record of the standard kit.
 */

import type { DefaultsSource } from './sources.js';

export const DRUM_KIT_SOURCE: DefaultsSource = {
  source: 'gm1',
  symbol: 'Percussion Key Map',
  what: 'the MIDI key number and English name of each standard percussion sound',
};

export const DRUM_NOTATION_SOURCE: DefaultsSource = {
  source: 'drumNotation',
  symbol: 'standard drum kit staff positions',
  what: 'which staff line and notehead each drum of a standard kit uses',
};

/** Which way a drum stem points. */
export type StemDirection = 'up' | 'down';

export interface DrumKitEntry {
  /** General MIDI key number. */
  readonly pitch: number;
  /** The General MIDI name for the sound. */
  readonly name: string;
  /**
   * A notehead shape family this engine draws (see `geometry/notehead.ts`
   * `SHAPE_GLYPHS`: 'normal', 'x', 'diamond', 'triangle', 'slash', ...),
   * OR one exact SMuFL glyph name where no family contains it.
   */
  readonly notehead: string;
  /** Staff line, our convention: 0 = top line, +1 = half a space down. */
  readonly line: number;
  readonly stemDirection: StemDirection;
}

/**
 * The standard 61-instrument General MIDI drum kit, by key number.
 *
 * Keys the GM map leaves to silence are simply absent: an empty key has
 * no conventional notation, and inventing one would be the guess this
 * layer refuses to make.
 */
export const STANDARD_DRUM_KIT: readonly DrumKitEntry[] = [
  { pitch: 27, name: 'High Q', notehead: 'slash', line: 8, stemDirection: 'up' },
  { pitch: 28, name: 'Slap', notehead: 'noteheadSlashX', line: 4, stemDirection: 'up' },
  { pitch: 29, name: 'Scratch Push', notehead: 'slash', line: 6, stemDirection: 'up' },
  { pitch: 30, name: 'Scratch Pull', notehead: 'slash', line: 6, stemDirection: 'up' },
  { pitch: 31, name: 'Sticks', notehead: 'plus', line: -1, stemDirection: 'up' },
  { pitch: 32, name: 'Square Click', notehead: 'plus', line: 10, stemDirection: 'up' },
  { pitch: 33, name: 'Metronome Click', notehead: 'cross', line: 10, stemDirection: 'up' },
  { pitch: 34, name: 'Metronome Bell', notehead: 'triangle', line: 10, stemDirection: 'up' },
  { pitch: 35, name: 'Acoustic Bass Drum', notehead: 'normal', line: 8, stemDirection: 'up' },
  { pitch: 36, name: 'Bass Drum 1', notehead: 'normal', line: 7, stemDirection: 'down' },
  { pitch: 37, name: 'Side Stick', notehead: 'slashed', line: 3, stemDirection: 'up' },
  { pitch: 38, name: 'Acoustic Snare', notehead: 'normal', line: 3, stemDirection: 'up' },
  { pitch: 39, name: 'Hand Clap', notehead: 'plus', line: -2, stemDirection: 'up' },
  { pitch: 40, name: 'Electric Snare', notehead: 'slash', line: 3, stemDirection: 'up' },
  { pitch: 41, name: 'Low Floor Tom', notehead: 'normal', line: 6, stemDirection: 'up' },
  { pitch: 42, name: 'Closed Hi-Hat', notehead: 'cross', line: -1, stemDirection: 'up' },
  { pitch: 43, name: 'High Floor Tom', notehead: 'normal', line: 5, stemDirection: 'up' },
  { pitch: 44, name: 'Pedal Hi-Hat', notehead: 'cross', line: 9, stemDirection: 'up' },
  { pitch: 45, name: 'Low Tom', notehead: 'normal', line: 4, stemDirection: 'up' },
  { pitch: 46, name: 'Open Hi-Hat', notehead: 'circle-x', line: -1, stemDirection: 'up' },
  { pitch: 47, name: 'Low-Mid Tom', notehead: 'normal', line: 2, stemDirection: 'up' },
  { pitch: 48, name: 'Hi-Mid Tom', notehead: 'normal', line: 1, stemDirection: 'up' },
  { pitch: 49, name: 'Crash Cymbal 1', notehead: 'cross', line: -2, stemDirection: 'up' },
  { pitch: 50, name: 'High Tom', notehead: 'normal', line: 0, stemDirection: 'up' },
  { pitch: 51, name: 'Ride Cymbal 1', notehead: 'cross', line: 0, stemDirection: 'up' },
  {
    pitch: 52,
    name: 'Chinese Cymbal',
    notehead: 'noteheadHeavyXHat',
    line: -3,
    stemDirection: 'up',
  },
  { pitch: 53, name: 'Ride Bell', notehead: 'diamond', line: 0, stemDirection: 'up' },
  { pitch: 54, name: 'Tambourine', notehead: 'diamond', line: 6, stemDirection: 'up' },
  { pitch: 55, name: 'Splash Cymbal', notehead: 'cross', line: -4, stemDirection: 'up' },
  { pitch: 56, name: 'Cowbell', notehead: 'inverted-triangle', line: 0, stemDirection: 'up' },
  { pitch: 57, name: 'Crash Cymbal 2', notehead: 'cross', line: -3, stemDirection: 'up' },
  { pitch: 58, name: 'Vibraslap', notehead: 'ti', line: 0, stemDirection: 'up' },
  { pitch: 59, name: 'Ride Cymbal 2', notehead: 'cross', line: 2, stemDirection: 'up' },
  { pitch: 60, name: 'Hi Bongo', notehead: 'normal', line: -1, stemDirection: 'up' },
  { pitch: 61, name: 'Low Bongo', notehead: 'normal', line: 0, stemDirection: 'up' },
  { pitch: 62, name: 'Mute Hi Conga', notehead: 'noteheadXOrnate', line: 1, stemDirection: 'up' },
  { pitch: 63, name: 'Open Hi Conga', notehead: 'normal', line: 1, stemDirection: 'up' },
  { pitch: 64, name: 'Low Conga', notehead: 'normal', line: 2, stemDirection: 'up' },
  { pitch: 65, name: 'High Timbale', notehead: 'normal', line: 5, stemDirection: 'up' },
  { pitch: 66, name: 'Low Timbale', notehead: 'normal', line: 7, stemDirection: 'up' },
  { pitch: 67, name: 'High Agogo', notehead: 'inverted-triangle', line: -2, stemDirection: 'up' },
  { pitch: 68, name: 'Low Agogo', notehead: 'inverted-triangle', line: -1, stemDirection: 'up' },
  { pitch: 69, name: 'Cabasa', notehead: 'diamond', line: 2, stemDirection: 'up' },
  { pitch: 70, name: 'Maracas', notehead: 'diamond', line: 4, stemDirection: 'up' },
  { pitch: 71, name: 'Short Whistle', notehead: 'cross', line: -3, stemDirection: 'up' },
  { pitch: 72, name: 'Long Whistle', notehead: 'ti', line: -3, stemDirection: 'up' },
  { pitch: 73, name: 'Short Guiro', notehead: 'cross', line: -1, stemDirection: 'up' },
  { pitch: 74, name: 'Long Guiro', notehead: 'slashed', line: -1, stemDirection: 'up' },
  { pitch: 75, name: 'Claves', notehead: 'la', line: 0, stemDirection: 'up' },
  { pitch: 76, name: 'Hi Wood Block', notehead: 'la', line: 5, stemDirection: 'up' },
  { pitch: 77, name: 'Low Wood Block', notehead: 'la', line: 7, stemDirection: 'up' },
  { pitch: 78, name: 'Mute Cuica', notehead: 'cross', line: 8, stemDirection: 'up' },
  { pitch: 79, name: 'Open Cuica', notehead: 'back-slashed', line: 8, stemDirection: 'up' },
  { pitch: 80, name: 'Mute Triangle', notehead: 'cross', line: 0, stemDirection: 'up' },
  { pitch: 81, name: 'Open Triangle', notehead: 'triangle', line: 0, stemDirection: 'up' },
  { pitch: 82, name: 'Shaker', notehead: 'diamond', line: 5, stemDirection: 'up' },
  { pitch: 83, name: 'Sleigh Bell', notehead: 'inverted-triangle', line: 3, stemDirection: 'up' },
  { pitch: 84, name: 'Mark Tree', notehead: 'ti', line: 2, stemDirection: 'up' },
  { pitch: 85, name: 'Castanets', notehead: 'la', line: 2, stemDirection: 'up' },
  { pitch: 86, name: 'Mute Surdo', notehead: 'noteheadSlashX', line: 4, stemDirection: 'up' },
  { pitch: 87, name: 'Open Surdo', notehead: 'slash', line: 4, stemDirection: 'up' },
];

const BY_PITCH = new Map(STANDARD_DRUM_KIT.map((d) => [d.pitch, d]));

/** One drum by MIDI key number, or undefined where the GM map defines none. */
export function drumKitEntry(pitch: number): DrumKitEntry | undefined {
  return BY_PITCH.get(pitch);
}

/** One drum's worth of difference from the standard kit. */
export interface DrumKitOverride {
  readonly pitch: number;
  readonly name?: string;
  /** Our line convention: 0 = top line, +1 = half a space down. */
  readonly line?: number;
  /** A shape family name, or one exact SMuFL glyph. */
  readonly notehead?: string;
  readonly stemDirection?: StemDirection;
  /**
   * Where this came from, in a few words -- "screenshot 2026-10-03, bar
   * 5", "Lesson5.drm". Required, because an override with no evidence
   * behind it is the guess this layer exists to avoid.
   */
  readonly evidence: string;
}

export interface DrumKitOverrides {
  /** A name for the kit these describe, for diagnostics. */
  readonly name?: string;
  readonly drums?: readonly DrumKitOverride[];
}

/**
 * The standard kit with a set of overrides folded in.
 *
 * An override for a key the standard kit does not define ADDS that drum
 * rather than being dropped -- a custom kit may well use a key the
 * standard one leaves empty -- and such an entry must therefore carry
 * both a line and a notehead. One that does not is skipped, so a
 * half-filled override can never produce a drum sitting on line 0 with a
 * normal head by accident.
 */
export function applyDrumOverrides(
  base: readonly DrumKitEntry[],
  overrides?: DrumKitOverrides,
): readonly DrumKitEntry[] {
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
        line: over.line,
        stemDirection: over.stemDirection ?? 'up',
      });
      continue;
    }
    byPitch.set(over.pitch, {
      ...existing,
      ...(over.name === undefined ? {} : { name: over.name }),
      ...(over.notehead === undefined ? {} : { notehead: over.notehead }),
      ...(over.line === undefined ? {} : { line: over.line }),
      ...(over.stemDirection === undefined ? {} : { stemDirection: over.stemDirection }),
    });
  }
  return [...byPitch.values()].sort((a, b) => a.pitch - b.pitch);
}
