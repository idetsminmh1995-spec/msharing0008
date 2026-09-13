import { TICKS_PER_QUARTER } from '../../core/duration-math.js';
import type { Part } from '../../core/part.js';
import type { PitchStep } from '../../core/pitch.js';
import type { MeasureAttributes } from '../../parser/musicxml/parse.js';

/** §13.2's own "coreNoteId": a structural reference into a Part, not a field carried on Note itself -- core/'s Note type stays exactly as minimal as §4.1 wants it, and this module supplies its own stable identifier from the outside. */
export interface CoreNoteRef {
  readonly measureNumber: number;
  readonly voiceId: number;
  readonly eventIndex: number;
}

/** A stable string key for a CoreNoteRef, since JS Map keys need equality-by-value, not by object identity -- the same reasoning behind every other string-keyed lookup already in this codebase (e.g. Phase 15's noteheadMappingKey). */
export function coreNoteRefKey(ref: CoreNoteRef): string {
  return `${ref.measureNumber}:${ref.voiceId}:${ref.eventIndex}`;
}

export interface FlatCoreNote {
  readonly ref: CoreNoteRef;
  /** This note's own absolute tick, summed from every earlier measure's real length (via its own resolved time signature) plus its own position within its voice -- never derived from wall-clock time. */
  readonly tick: number;
  /**
   * A single MIDI-note-number-space value for matching purposes: a
   * pitched note's real chromatic value (§13.2 doesn't distinguish
   * "pitch" by instrument type, so unifying both into the same number
   * space is what lets one matching algorithm serve both cases), or an
   * unpitched note's already-resolved GM number (Phase 41) when known.
   * `undefined` when neither is available -- such a note can still be
   * matched via §13.2's ordinal fallback, just not tiers 1/2.
   */
  readonly noteNumber: number | undefined;
}

const STEP_SEMITONE: Readonly<Record<PitchStep, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Standard MIDI chromatic convention: middle C (C4) is 60. */
export function chromaticNoteNumber(step: PitchStep, alter: number, octave: number): number {
  return (octave + 1) * 12 + STEP_SEMITONE[step] + alter;
}

/** One measure's length in ticks under its own resolved time signature. */
function measureLengthTicks(attrs: MeasureAttributes): number {
  return attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER;
}

/**
 * §13.2: flattens every Note in `part` into a `FlatCoreNote`, in score
 * order, with a real absolute tick computed from each measure's own
 * resolved time signature (via `measureAttributes`) rather than assuming
 * a single constant measure length -- a piece with a time-signature
 * change partway through still gets correct absolute ticks for every
 * measure after that point.
 */
export function flattenPartNotes(
  part: Part,
  measureAttributes: readonly MeasureAttributes[],
  gmByInstrumentId: ReadonlyMap<string, number> | undefined,
): readonly FlatCoreNote[] {
  const flat: FlatCoreNote[] = [];
  let measureStartTick = 0;

  for (const measure of part.measures) {
    const attrs = measureAttributes.find(
      (a) => a.partId === part.id && a.measureNumber === measure.number,
    );
    for (const v of measure.voices) {
      let tickWithinVoice = 0;
      v.events.forEach((event, eventIndex) => {
        if (event.kind === 'note') {
          const noteNumber =
            event.pitch.kind === 'pitched'
              ? chromaticNoteNumber(event.pitch.step, event.pitch.alter, event.pitch.octave)
              : event.instrumentId !== undefined
                ? gmByInstrumentId?.get(event.instrumentId)
                : undefined;
          flat.push({
            ref: { measureNumber: measure.number, voiceId: v.id, eventIndex },
            tick: measureStartTick + tickWithinVoice,
            noteNumber,
          });
        }
        tickWithinVoice += event.duration.ticks;
      });
    }
    measureStartTick += attrs !== undefined ? measureLengthTicks(attrs) : 0;
  }

  return flat;
}
