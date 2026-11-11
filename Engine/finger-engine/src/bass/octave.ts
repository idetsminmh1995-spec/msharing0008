/**
 * octave.ts — [BIN-03, BIN-04] which octave the file is actually in.
 *
 * Bass is written an octave ABOVE the pitch it sounds, and files say
 * so in at least four different ways: a `<transpose>` with an
 * `<octave-change>`, a transposing clef, tab that quietly contradicts
 * the printed pitch, or nothing at all. Programs disagree about which
 * to use, so a bass part can arrive here an octave out and nothing
 * about it looks wrong.
 *
 * It matters because every later decision is made from pitch. A part
 * read an octave high has no notes on the E string at all, and the
 * engine will cheerfully write a fingering for it.
 */
import { BASS_DEFAULTS } from './defaults.js';

export type OctaveSource = 'engine' | 'transpose' | 'tab' | 'range' | 'override';

export interface OctaveDecision {
  /** Semitones to add to every written pitch: -12, 0 or +12. */
  readonly shift: number;
  readonly source: OctaveSource;
  readonly confidence: number;
  readonly info: readonly string[];
}

export interface TabbedNote {
  readonly pitch: number;
  /** [DM-01] 1 = lowest string. */
  readonly string: number;
  readonly fret: number;
}

/**
 * [BIN-04a] The octave a TABBED part is really in.
 *
 * Tab is the one part of a bass file that cannot be ambiguous: a
 * string and a fret name exactly one pitch. So where tab and printed
 * pitch disagree by an octave for nearly every note, the tab is right
 * and the pitches move.
 *
 * "Nearly every" rather than "every": a real part has the odd note
 * typed wrong, and one bad bar should not stop the correction. A
 * mismatch that is NOT a clean octave is a different problem and is
 * reported rather than corrected -- see the guitar's IN-X13.
 */
export function octaveFromTab(
  notes: readonly TabbedNote[],
  tuning: readonly number[],
): OctaveDecision | null {
  if (notes.length === 0) return null;
  let asIs = 0;
  let down = 0;
  let up = 0;
  for (const note of notes) {
    const open = tuning[note.string - 1];
    if (open === undefined) continue;
    const expected = open + note.fret;
    if (expected === note.pitch) asIs += 1;
    else if (expected === note.pitch - 12) down += 1;
    else if (expected === note.pitch + 12) up += 1;
  }
  const agreement = BASS_DEFAULTS.input.tabOctaveAgreement;
  const total = notes.length;
  if (asIs / total >= agreement) {
    return { shift: 0, source: 'tab', confidence: asIs / total, info: [] };
  }
  if (down / total >= agreement) {
    return { shift: -12, source: 'tab', confidence: down / total, info: ['OCTAVE_CORRECTED'] };
  }
  if (up / total >= agreement) {
    return { shift: 12, source: 'tab', confidence: up / total, info: ['OCTAVE_CORRECTED'] };
  }
  return {
    shift: 0,
    source: 'tab',
    confidence: asIs / total,
    info: ['PITCH_TAB_MISMATCH'],
  };
}

export interface RangeOptions {
  /** The instrument the part will be played on. */
  readonly lowestPitch: number;
  readonly highestPitch: number;
  /** MIDI carries sounding pitch already, so -12 has to win by more. */
  readonly fromMidi?: boolean;
}

/**
 * [BIN-04b] The octave an UNTABBED part is probably in.
 *
 * Two hypotheses, scored the same way: how much of the part the
 * instrument can actually play, and how much of it lands where bass
 * lines live. The first asks whether the reading is possible; the
 * second whether it is likely -- a part written an octave high is
 * usually still playable on a bass, just entirely up the dusty end,
 * which is why possibility alone does not settle it.
 *
 * When the two readings score within a whisker of each other, nothing
 * is changed and the uncertainty is reported: a coin-flip applied
 * silently is the worst of the three outcomes.
 */
export function octaveFromRange(
  pitches: readonly number[],
  options: RangeOptions,
): OctaveDecision | null {
  if (pitches.length === 0) return null;
  const score = (shift: number): number => {
    const moved = pitches.map((p) => p + shift);
    const inRange =
      moved.filter((p) => p >= options.lowestPitch && p <= options.highestPitch).length /
      moved.length;
    const [low, high] = BASS_DEFAULTS.input.typicalRegister;
    const typical = moved.filter((p) => p >= low && p <= high).length / moved.length;
    return (
      inRange * BASS_DEFAULTS.input.octaveInRangeWeight +
      typical * BASS_DEFAULTS.input.octaveTypicalRegisterWeight
    );
  };
  const asIs = score(0);
  const down = score(-12);
  const margin =
    options.fromMidi === true
      ? BASS_DEFAULTS.input.octaveMarginMidi
      : BASS_DEFAULTS.input.octaveMargin;
  if (down - asIs >= margin) {
    return { shift: -12, source: 'range', confidence: down, info: ['OCTAVE_CORRECTED'] };
  }
  if (Math.abs(down - asIs) < margin) {
    return { shift: 0, source: 'range', confidence: asIs, info: ['OCTAVE_UNCERTAIN'] };
  }
  return { shift: 0, source: 'range', confidence: asIs, info: [] };
}

export interface OctaveInput {
  /** (1) The Notation Engine's own sounding pitch, when it has one. */
  readonly soundingFromEngine?: boolean;
  /** (2) `<transpose>`: chromatic semitones and whole octaves. */
  readonly transpose?: { readonly chromatic?: number; readonly octaveChange?: number };
  /** (3) Tabbed notes, if the part has tab. */
  readonly tabbed?: readonly TabbedNote[];
  /** (4) Every sounding-candidate pitch in the part. */
  readonly pitches: readonly number[];
  readonly tuning: readonly number[];
  readonly range: RangeOptions;
  /** [BIN-04c] The user's own answer, which beats all four. */
  readonly override?: number;
}

/**
 * [BIN-03] The octave, decided once, by the best evidence available.
 *
 * Strictly in priority order rather than by combining the sources: a
 * file that states its transposition is not made more trustworthy by
 * a range test agreeing with it, and it is not made less trustworthy
 * by one disagreeing.
 */
export function decideOctave(input: OctaveInput): OctaveDecision {
  if (input.override !== undefined) {
    return { shift: input.override, source: 'override', confidence: 1, info: [] };
  }
  if (input.soundingFromEngine === true) {
    return { shift: 0, source: 'engine', confidence: 1, info: [] };
  }
  const transpose = input.transpose;
  if (
    transpose !== undefined &&
    (transpose.chromatic !== undefined || transpose.octaveChange !== undefined)
  ) {
    const shift = (transpose.chromatic ?? 0) + 12 * (transpose.octaveChange ?? 0);
    return { shift, source: 'transpose', confidence: 0.95, info: [] };
  }
  const tab = input.tabbed === undefined ? null : octaveFromTab(input.tabbed, input.tuning);
  if (tab !== null && !tab.info.includes('PITCH_TAB_MISMATCH')) return tab;
  const range = octaveFromRange(input.pitches, input.range);
  if (range !== null) {
    return tab === null ? range : { ...range, info: [...tab.info, ...range.info] };
  }
  return tab ?? { shift: 0, source: 'range', confidence: 0, info: [] };
}
