import type { DurationType } from '../core/duration.js';

/**
 * §9.21's tempo-mark side (`tempoMarkSide`, Phase 31) was placement-only,
 * stated as needing "general multi-glyph/text composition this engine
 * hasn't built yet." Checking the real glyph table first, before
 * assuming that's still true, found SMuFL ships a dedicated `metNote*`
 * family covering every stem direction/duration this engine's own
 * `DurationType` supports -- a real metronome mark ("quarter = 120")
 * needs no text font at all, only glyph assembly this engine already
 * knows how to do (the exact technique Phase 28's tuplet numbers and
 * Phase 41's tab fret digits already use: several glyphs, one shared
 * baseline, advancing by each glyph's own real width).
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
 * The glyph for the "=" in a metronome mark. No metronome-specific equals
 * glyph exists in SMuFL; `timeSigEquals` is a real, symmetric equals-sign
 * shape (confirmed via its own bounding box before reusing it) that
 * other engines commonly reuse here for exactly this reason.
 */
export function metronomeEqualsGlyphName(): string {
  return 'timeSigEquals';
}

/**
 * The BPM number's digit glyphs, most significant digit first. Reuses
 * Phase 41's `fingering0-9` family -- the same "plain digit, no text
 * font available" solution already established for tab fret numbers,
 * for consistency rather than introducing a third digit source.
 */
const BPM_DIGIT_GLYPHS: readonly string[] = [
  'fingering0',
  'fingering1',
  'fingering2',
  'fingering3',
  'fingering4',
  'fingering5',
  'fingering6',
  'fingering7',
  'fingering8',
  'fingering9',
];

export function metronomeBpmDigitGlyphNames(beatsPerMinute: number): readonly string[] {
  if (!Number.isInteger(beatsPerMinute) || beatsPerMinute < 0) {
    throw new Error(`Metronome BPM must be a non-negative integer, got ${beatsPerMinute}.`);
  }
  return String(beatsPerMinute)
    .split('')
    .map((d) => {
      const glyph = BPM_DIGIT_GLYPHS[Number(d)];
      if (glyph === undefined) {
        throw new Error(`No digit glyph for "${d}".`);
      }
      return glyph;
    });
}
