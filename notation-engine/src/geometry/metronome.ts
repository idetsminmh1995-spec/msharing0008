import type { DurationType } from '../core/duration.js';

/**
 * §9.21's tempo-mark side (`tempoMarkSide`, Phase 31) was placement-only,
 * stated as needing "general multi-glyph/text composition this engine
 * hasn't built yet." SMuFL's dedicated `metNote*` family covers every
 * stem direction/duration this engine's own `DurationType` supports, so
 * the NOTE half of a metronome mark is a plain glyph lookup.
 */
const MET_NOTE_GLYPHS: Readonly<Record<DurationType, string>> = {
  whole: 'metNoteWhole',
  half: 'metNoteHalfUp',
  quarter: 'metNoteQuarterUp',
  eighth: 'metNote8thUp',
  '16th': 'metNote16thUp',
  '32nd': 'metNote32ndUp',
  '64th': 'metNote64thUp',
  '128th': 'metNote128thUp',
  '256th': 'metNote256thUp',
  '512th': 'metNote512thUp',
  '1024th': 'metNote1024thUp',
};

/** The note-value glyph for a metronome mark's beat unit. Stem-up variants throughout -- a metronome mark's note has no real stem-direction meaning of its own (it is a fixed reference symbol), so there is nothing for the usual up/down rule to decide. */
export function metronomeNoteGlyphName(beatUnit: DurationType): string {
  return MET_NOTE_GLYPHS[beatUnit];
}

/** The augmentation dot for a dotted beat unit (e.g. a dotted quarter = 120). SMuFL provides one dedicated glyph, used once per dot. */
export function metronomeDotGlyphName(): string {
  return 'metAugmentationDot';
}

/**
 * The TEXT half of a metronome mark -- "= 120" -- to be set in
 * `config.fonts.textFont`, not in the music font.
 *
 * This replaces an earlier attempt that drew the "=" with SMuFL's
 * `timeSigEquals` and each digit with the `fingering0-9` family, placing
 * them one by one. That was wrong twice over, and visibly so:
 *
 *  - Those glyphs are the wrong SIZE. `fingering1` is about one staff
 *    space tall, because a fingering digit is meant to sit unobtrusively
 *    beside a notehead. Next to a full-size `metNoteQuarterUp` it read
 *    as a footnote rather than as the tempo.
 *  - They were placed by their INK width. Bravura's metadata gives a
 *    glyph's bounding box, never its advance width, and a fingering
 *    digit carries a real left side bearing (0.08sp) that a bounding box
 *    does not include -- so "120" came out with 0.468sp between the "1"
 *    and the "2" where the "1" is itself 0.468sp wide. The digits
 *    touched and overlapped.
 *
 * MuseScore sets this half as ordinary text (its Tempo style: Edwin
 * Bold, 12pt) with the note as an embedded music symbol, and that is
 * what this engine now does too. Spacing digits is then the font's job,
 * which is the only thing that can do it correctly.
 */
export function metronomeTempoText(beatsPerMinute: number): string {
  if (!Number.isInteger(beatsPerMinute) || beatsPerMinute < 0) {
    throw new Error(`Metronome BPM must be a non-negative integer, got ${beatsPerMinute}.`);
  }
  return `= ${String(beatsPerMinute)}`;
}
