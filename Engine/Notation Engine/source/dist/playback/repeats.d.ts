import type { TempoMap } from '../timing/tempo-map.js';
export type RepeatDiagnosticSeverity = 'error' | 'warning' | 'info';
/**
 * A repeat structure this engine could not resolve exactly.
 *
 * Its own type rather than the MusicXML parser's `Diagnostic`, for the
 * same reason `timing/diagnostic.ts` is its own: repeat resolution
 * consumes barline DATA from a parser but has no business depending on
 * that parser's reporting shape. `renderParsedMusicXml` translates
 * these into the render's diagnostics, so a caller still sees one list.
 */
export interface RepeatDiagnostic {
    readonly severity: RepeatDiagnosticSeverity;
    readonly code: string;
    readonly message: string;
}
export declare function repeatDiagnostic(severity: RepeatDiagnosticSeverity, code: string, message: string): RepeatDiagnostic;
/**
 * One written measure, as the repeat resolver needs it: its number, its
 * length, and whatever repeat/volta marks sit on its two edges.
 *
 * `repeatStart`/`repeatEndTimes` are already resolved from BOTH sides of
 * each barline by the caller. A barline is shared between two measures
 * and either may declare it (`<barline location="left">` on the measure
 * after, or `location="right"` on the measure before), so reading only
 * one side puts a real file's repeat a whole measure out of place --
 * the same trap Integration Q hit when drawing them.
 */
export interface RepeatMeasureSpec {
    readonly measureNumber: number;
    readonly ticks: number;
    /** A repeat-begin barline at this measure's LEFT edge: the section repeats from here. */
    readonly repeatStart: boolean;
    /**
     * A repeat-end barline at this measure's RIGHT edge, and how many
     * times the section is played IN TOTAL. `undefined` means no repeat
     * end here. MusicXML's own default when `<repeat>` carries no `times`
     * is 2, applied by the caller, so `1` here really does mean "written
     * as times=1", i.e. play once and move on.
     */
    readonly repeatEndTimes?: number;
    /** The volta numbers this measure OPENS (`<ending type="start">`), if any. */
    readonly endingStart?: readonly number[];
    /** Whether a volta CLOSES at this measure's right edge (`<ending type="stop"|"discontinue">`). */
    readonly endingStop: boolean;
    /**
     * True when that close was MusicXML's `discontinue` rather than
     * `stop`. Identical for playback -- the volta ends either way -- and
     * different on the page: a `discontinue` bracket has no down-hook at
     * its right end, which is how an ending that simply runs on is
     * written.
     */
    readonly endingDiscontinue?: boolean;
}
/** One measure, one time through: where it sits in written time and where it sits in performance time. */
export interface PerformanceEntry {
    readonly measureNumber: number;
    readonly ticks: number;
    /** Tick offset of this measure in PERFORMANCE order -- strictly increasing across the plan. */
    readonly performanceTick: number;
    /** Tick offset of the same measure in the WRITTEN score -- what `playheadX`/`positionToX` take. */
    readonly writtenTick: number;
    /** Seconds from the start of the performance to this measure's downbeat. */
    readonly startSeconds: number;
    /** Seconds from the start of the WRITTEN score to the same downbeat -- how `startSeconds` is turned back into a written tick. */
    readonly writtenStartSeconds: number;
    /** 1-based: the how-many-th time through this measure this entry is. */
    readonly pass: number;
}
/**
 * The written score unfolded into the order it is actually played.
 *
 * §17.2 used to say the engine never simulates playback order, and that
 * a host wanting the marker to jump back at a repeat must supply the
 * tick it jumped to. That is a defensible boundary for a D.S. or a
 * manual seek -- but it left every ordinary two-bar drum repeat with a
 * cursor that simply stopped at the repeat barline, which a reader
 * reported as exactly the bug it is. A repeat is written IN THE FILE;
 * reading what the file says is this engine's job. The boundary stays
 * where it belongs: the engine says where the music goes, the host still
 * decides what to draw and when.
 */
export interface RepeatPlan {
    readonly entries: readonly PerformanceEntry[];
    /** Total length of the performance, in ticks -- longer than the written score whenever anything repeats. */
    readonly totalTicks: number;
    /** Total length of the performance, in seconds. */
    readonly totalSeconds: number;
    /** False when the score has no repeat marks at all, in which case performance time and written time are the same thing. */
    readonly hasRepeats: boolean;
}
/** MusicXML's own default for `<repeat direction="backward">` with no `times`: play the section twice. */
export declare const DEFAULT_REPEAT_TIMES = 2;
export interface BuildRepeatPlanInput {
    readonly measures: readonly RepeatMeasureSpec[];
    /** Each measure's own tick offset in the WRITTEN score -- `PlaybackData.globalTickOffsetByMeasure`. */
    readonly writtenTickByMeasure: ReadonlyMap<number, number>;
    readonly tempoMap: TempoMap;
}
/**
 * Unfolds a score's repeats into a `RepeatPlan`: for every measure, every
 * time it is played, where that playing sits in performance time and
 * which written measure it is.
 */
export declare function buildRepeatPlan(input: BuildRepeatPlanInput): {
    readonly plan: RepeatPlan;
    readonly diagnostics: readonly RepeatDiagnostic[];
};
/** Where one moment of the performance is: which written tick it plays, and which time through. */
export interface PerformancePoint {
    /** The WRITTEN tick -- pass this to `playheadX`/`positionToX`, which know nothing of repeats. */
    readonly writtenTick: number;
    readonly performanceTick: number;
    readonly measureNumber: number;
    /** 1-based: the how-many-th time through that measure. A host showing "2 of 4" reads this. */
    readonly pass: number;
}
/** Maps a tick in performance order onto the written tick it plays. */
export declare function performanceTickToWritten(plan: RepeatPlan, performanceTick: number): PerformancePoint;
/**
 * Maps a moment of audio playback (seconds from the start of the
 * performance) onto the written tick sounding then.
 *
 * Goes through the WRITTEN tempo map deliberately: the same measure
 * played twice has one tempo curve, written once, and re-deriving it
 * per pass would be a second source of truth that could drift from the
 * first.
 */
export declare function performanceSecondsToWritten(plan: RepeatPlan, tempoMap: TempoMap, seconds: number): PerformancePoint;
/**
 * Every performance tick at which `writtenTick` is played -- the inverse
 * of `performanceTickToWritten`, which is one-to-many exactly because a
 * repeated bar is played more than once.
 */
export declare function writtenTickToPerformanceTicks(plan: RepeatPlan, writtenTick: number): readonly number[];
