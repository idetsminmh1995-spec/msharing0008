import type { PitchStep } from '../core/pitch.js';
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
export declare function createAccidentalState(fifths: number): AccidentalState;
/** Clears in-measure overrides at a barline -- the key signature itself carries over unchanged. */
export declare function resetMeasure(state: AccidentalState): AccidentalState;
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
export declare function evaluateAccidental(state: AccidentalState, step: PitchStep, octave: number, alter: number, hasExplicitAccidental?: boolean): AccidentalDecision;
