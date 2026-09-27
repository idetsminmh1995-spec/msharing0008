/**
 * suggest.ts — [BIN-05, BIN-06] which bass this part wants.
 *
 * Four strings or five is not a preference here, it is a fact about
 * the notes: a line with a B0 in it cannot be played on a four-string
 * at all, and a line that never goes below E1 does not need a fifth
 * string to be in the way. So the engine reads it off the part and
 * the user confirms, rather than the user guessing and the engine
 * silently skipping notes.
 *
 * Every suggestion carries its reason code, because the one thing
 * worse than a wrong suggestion is a wrong suggestion with nothing to
 * argue with.
 */
import type { InstrumentSpec } from '../core/types.js';
import { BASS_TUNINGS, bassInstrument, type BassTuningId } from './instrument.js';

export interface BassSuggestion {
  readonly numStrings: number;
  readonly tuning: readonly number[];
  readonly tuningId: BassTuningId;
  readonly confidence: number;
  readonly reasons: readonly string[];
}

export interface SuggestOptions {
  /** How many frets the neck will have; it decides where the top runs out. */
  readonly numFrets?: number;
  /** [BIN-05] What the file itself said, which beats any guess. */
  readonly stated?: { readonly tuning?: readonly number[]; readonly staffLines?: number };
}

const DEFAULT_FRETS = 22;

/**
 * [BIN-05/06] The instrument this part is for.
 *
 * The file's own `<staff-tuning>` wins outright when it has one:
 * somebody wrote down which strings this was played on, and no range
 * test is better evidence than that.
 */
export function suggestBassInstrument(
  pitches: readonly number[],
  options: SuggestOptions = {},
): BassSuggestion {
  const numFrets = options.numFrets ?? DEFAULT_FRETS;
  const stated = options.stated;
  if (stated?.tuning !== undefined && stated.tuning.length >= 4) {
    const tuning = [...stated.tuning];
    return {
      numStrings: stated.staffLines ?? tuning.length,
      tuning,
      tuningId: matchTuning(tuning),
      confidence: 1,
      reasons: ['FILE_TUNING'],
    };
  }
  if (pitches.length === 0) {
    return named('4-standard', 0.3, ['NO_NOTES']);
  }

  const min = Math.min(...pitches);
  const max = Math.max(...pitches);
  const topOfFour = 43 + numFrets;
  const reasons: string[] = [];
  if (min < 23) reasons.push('BELOW_B0');

  // Drop D before the five-string, because one low D is a tuning
  // change every bassist makes in a second and a fifth string is a
  // different instrument. It only counts when there is no E flat in
  // the part: a D and an E flat together need the B string.
  if (min === 26 && !pitches.includes(27) && max <= topOfFour) {
    return named('4-dropD', 0.85, [...reasons, 'LOW_D_ONLY']);
  }
  if (min < 28 && max > topOfFour) {
    return named('6-standard', 0.8, [...reasons, 'WIDE_RANGE']);
  }
  if (min < 28) {
    return named('5-lowB', 0.9, [...reasons, 'BELOW_E1']);
  }
  if (max > topOfFour) {
    return named('5-highC', 0.75, [...reasons, 'ABOVE_G_STRING']);
  }
  return named('4-standard', 0.95, [...reasons, 'RANGE_FITS_4']);
}

function named(id: BassTuningId, confidence: number, reasons: readonly string[]): BassSuggestion {
  const tuning = BASS_TUNINGS[id];
  return { numStrings: tuning.length, tuning, tuningId: id, confidence, reasons };
}

/** Which preset a stated tuning IS, so the UI can show a name rather than five numbers. */
function matchTuning(tuning: readonly number[]): BassTuningId {
  for (const [id, preset] of Object.entries(BASS_TUNINGS)) {
    if (preset.length === tuning.length && preset.every((p, i) => p === tuning[i])) {
      return id as BassTuningId;
    }
  }
  return tuning.length === 5 ? '5-lowB' : tuning.length === 6 ? '6-standard' : '4-standard';
}

/** The suggestion as an instrument, ready for the solver. */
export function instrumentFromSuggestion(
  suggestion: BassSuggestion,
  options: {
    readonly numFrets?: number;
    readonly scaleLengthMm?: number;
    readonly fretless?: boolean;
  } = {},
): InstrumentSpec {
  return bassInstrument({
    tuning: suggestion.tuning,
    ...(options.numFrets === undefined ? {} : { numFrets: options.numFrets }),
    ...(options.scaleLengthMm === undefined ? {} : { scaleLengthMm: options.scaleLengthMm }),
    ...(options.fretless === undefined ? {} : { fretless: options.fretless }),
  });
}

/**
 * [BIN-13] Which notes the chosen instrument cannot play.
 *
 * Reported, never transposed. A note moved an octave to make it fit
 * is a note the video teaches wrong, and the whole point of choosing
 * the instrument from the part was to make this list empty.
 */
export function outOfRange(
  pitches: readonly number[],
  instrument: InstrumentSpec,
): readonly number[] {
  const low = instrument.tuning[0] ?? 28;
  const top = (instrument.tuning[instrument.tuning.length - 1] ?? 43) + instrument.numFrets;
  return pitches.filter((p) => p < low || p > top);
}
