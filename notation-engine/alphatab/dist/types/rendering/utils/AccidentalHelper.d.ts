import { AccidentalType } from "./../../model/AccidentalType";
import type { Bar } from "./../../model/Bar";
import type { Beat } from "./../../model/Beat";
import type { Clef } from "./../../model/Clef";
import { type ResolvedSpelling } from "./../../model/ModelUtils";
import type { Note } from "./../../model/Note";
import type { LineBarRenderer } from "./../LineBarRenderer";
/**
 * This small utilty public class allows the assignment of accidentals within a
 * desired scope.
 * @internal
 */
export declare class AccidentalHelper {
    private _bar;
    private _barRenderer;
    /**
     * We always have 7 steps per octave.
     * (by a step the offsets inbetween score lines is meant,
     *      0 steps is on the first line (counting from top)
     *      1 steps is on the space inbetween the first and the second line
     */
    private static readonly _stepsPerOctave;
    /**
     * Those are the amount of steps for the different clefs in case of a note value 0
     * [Neutral, C3, C4, F4, G2]
     */
    private static _octaveSteps;
    /**
     * Diatonic step offsets within an octave.
     */
    private static readonly _diatonicSteps;
    private _registeredAccidentals;
    private _appliedScoreSteps;
    private _appliedScoreStepsByValue;
    private _notesByValue;
    private _beatSteps;
    /**
     * The beat on which the highest note of this helper was added.
     * Used together with beaming helper to calculate overflow.
     */
    maxStepsBeat: Beat | null;
    /**
     * The beat on which the lowest note of this helper was added.
     * Used together with beaming helper to calculate overflow.
     */
    minStepsBeat: Beat | null;
    /**
     * The steps of the highest note added to this helper.
     */
    maxSteps: number;
    /**
     * The steps of the lowest note added to this helper.
     */
    minSteps: number;
    constructor(barRenderer: LineBarRenderer);
    static getPercussionSteps(note: Note): number;
    static getNoteValue(note: Note): number;
    /**
     * Calculates the accidental for the given note and assignes the value to it.
     * The new accidental type is also registered within the current scope
     * @param note
     * @returns
     */
    applyAccidental(note: Note): AccidentalType;
    /**
     * Calculates the accidental for the given note value and assignes the value to it.
     * The new accidental type is also registered within the current scope
     * @param relatedBeat
     * @param noteValue
     * @param quarterBend
     * @param isHelperNote true if the note registered via this call, is a small helper note (e.g. for bends) or false if it is a main note head (e.g. for harmonics)
     * @returns
     */
    applyAccidentalForValue(relatedBeat: Beat, noteValue: number, quarterBend: boolean, isHelperNote: boolean): AccidentalType;
    static computeStepsWithoutAccidentals(bar: Bar, note: Note): number;
    private _getAccidental;
    private _registerSteps;
    getMaxSteps(b: Beat): number;
    getMaxStepsNote(b: Beat): Note | null;
    getMinSteps(b: Beat): number;
    getMinStepsNote(b: Beat): Note | null;
    static calculateNoteSteps(clef: Clef, spelling: ResolvedSpelling): number;
    static calculateRestDisplaySteps(bar: Bar, tone: number, octave: number): number;
    getNoteSteps(n: Note): number;
    getNoteStepsForValue(rawValue: number, searchForNote?: boolean): number;
}
