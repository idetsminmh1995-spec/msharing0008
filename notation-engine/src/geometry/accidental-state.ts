import { flatsForCount, sharpsForCount } from './key-signature.js';
import type { PitchStep } from '../core/pitch.js';

/**
 * The alter (semitone offset) the key signature implies for each of the 7
 * steps, before any in-measure accidental changes it. Reuses Phase 11's
 * SHARP_ORDER/FLAT_ORDER-driven `sharpsForCount`/`flatsForCount` rather
 * than re-deriving the circle-of-fifths order a second time.
 */
function keySignatureAlterForStep(fifths: number): Readonly<Record<PitchStep, number>> {
  const map: Record<PitchStep, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (fifths > 0) {
    for (const step of sharpsForCount(Math.min(fifths, 7))) {
      map[step] = 1;
    }
  } else if (fifths < 0) {
    for (const step of flatsForCount(Math.min(-fifths, 7))) {
      map[step] = -1;
    }
  }
  return map;
}

/**
 * Which accidental to draw is a MUSICAL decision, not a rendering one: an
 * accidental is needed when a note's actual `alter` differs from what the
 * key signature (or an earlier note at the same step+octave, earlier in
 * the SAME measure) implies. This state is immutable -- every function
 * here returns a new state rather than mutating one, matching the
 * engine's pure-function style throughout.
 */
export interface AccidentalState {
  readonly keySignatureAlterForStep: Readonly<Record<PitchStep, number>>;
  /** Per-(step+octave) alter currently in effect for the REST of this measure, keyed "<step><octave>" (e.g. "C4"). Cleared every barline. */
  readonly measureOverrides: Readonly<Record<string, number>>;
}

/** Starts a fresh state for a given key signature (MusicXML `<fifths>` convention), with no in-measure overrides yet. */
export function createAccidentalState(fifths: number): AccidentalState {
  return { keySignatureAlterForStep: keySignatureAlterForStep(fifths), measureOverrides: {} };
}

/** Clears in-measure overrides at a barline -- the key signature itself carries over unchanged. */
export function resetMeasure(state: AccidentalState): AccidentalState {
  return { keySignatureAlterForStep: state.keySignatureAlterForStep, measureOverrides: {} };
}

export interface AccidentalDecision {
  readonly shouldDraw: boolean;
  readonly newState: AccidentalState;
}

/**
 * Decides whether THIS note needs a drawn accidental, and returns the
 * state updated to reflect it (so the NEXT note at the same step+octave
 * in this measure compares against the pitch that's now actually
 * sounding, not the key signature again).
 *
 * `hasExplicitAccidental` is the MusicXML complication: a file may supply
 * an explicit `<accidental>` element (a courtesy accidental) that must be
 * honoured even when this state machine alone would not have drawn one.
 * It forces `shouldDraw: true` without changing what alter gets tracked
 * going forward -- the note's own `alter` is what's tracked regardless of
 * whether the draw was courtesy-forced or musically necessary.
 */
export function evaluateAccidental(
  state: AccidentalState,
  step: PitchStep,
  octave: number,
  alter: number,
  hasExplicitAccidental = false,
): AccidentalDecision {
  const key = `${step}${octave}`;
  const impliedAlter = state.measureOverrides[key] ?? state.keySignatureAlterForStep[step] ?? 0;
  const musicallyNeeded = alter !== impliedAlter;

  const newState: AccidentalState = {
    keySignatureAlterForStep: state.keySignatureAlterForStep,
    measureOverrides: { ...state.measureOverrides, [key]: alter },
  };

  return { shouldDraw: musicallyNeeded || hasExplicitAccidental, newState };
}
