import type { Score } from '../core/index.js';
import type { TempoMarkEvent } from '../parser/musicxml/parse.js';
import { type RepeatMeasureSpec } from './repeats.js';
import type { PlaybackData, PlaybackMeasureLayout, PlaybackMeasurePlacement } from './position.js';
export interface ComputePlaybackDataInput {
    readonly score: Score;
    /** Every measure number in the score's own performance order -- `renderFromMusicXml`'s own `measureNumbersInOrder`. */
    readonly measureNumbersInOrder: readonly number[];
    /** Each measure's own real tick length -- `renderFromMusicXml`'s own `measureTicksByNumber`, already resolved for the rare case where two parts disagree (longest wins). */
    readonly measureTicksByNumber: ReadonlyMap<number, number>;
    readonly timeSignatureByMeasure: ReadonlyMap<number, {
        readonly numerator: number;
        readonly denominator: number;
    }>;
    readonly tempoMarks: readonly TempoMarkEvent[];
    /** `renderFromMusicXml`'s own `measureLayoutsByNumber` -- the SAME object the SVG was drawn from, not a second computation of it. */
    readonly measureLayoutsByNumber: ReadonlyMap<number, PlaybackMeasureLayout>;
    /** `renderFromMusicXml`'s own `placementByMeasureNumber`. */
    readonly placementByMeasureNumber: ReadonlyMap<number, PlaybackMeasurePlacement>;
    readonly measureHeaderAllowance: number;
    /**
     * Each measure's repeat/volta marks, in written order, already
     * resolved from both sides of every shared barline. Omitted means
     * "this score has no repeats", which is what a hand-built `Score`
     * (no MusicXML barlines at all) is.
     */
    readonly repeatMeasures?: readonly RepeatMeasureSpec[];
}
/**
 * PLAN.md §17.1, Phase 48: assembles the full `PlaybackData` a rendered
 * score's `positionToX`/`xToPosition`/`getEventStream`/`resolvePosition`
 * all read. Called once, at the end of `renderFromMusicXml`, from the
 * exact layout maps that produced its SVG -- see each field's own comment
 * on `ComputePlaybackDataInput` for why nothing here is recomputed
 * independently of what was actually drawn.
 */
export declare function computePlaybackData(input: ComputePlaybackDataInput): PlaybackData;
