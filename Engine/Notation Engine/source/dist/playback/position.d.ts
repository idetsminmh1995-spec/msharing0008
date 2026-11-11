import type { MusicalPosition } from '../timing/measure-position.js';
import type { TempoMap } from '../timing/tempo-map.js';
import type { NotationEvent } from './event-stream.js';
import type { RepeatDiagnostic, RepeatPlan } from './repeats.js';
export interface PlaybackPosition {
    readonly tick: number;
    readonly seconds: number;
    readonly position: MusicalPosition;
}
/** The one piece of a measure's rendered layout `positionToX`/`xToPosition` need -- the exact same shape `renderFromMusicXml`'s own internal `computeMeasureLayout` already produces. */
export interface PlaybackMeasureLayout {
    readonly width: number;
    readonly positionsByTick: ReadonlyMap<number, number>;
    /**
     * How much of this measure's own width its HEADER takes -- the clef,
     * key signature and time signature it actually draws, which is not the
     * same for every measure (a system start restates all three; an
     * ordinary measure draws none) and not a constant across scores (a
     * four-sharp key signature is four units wider than no key signature).
     *
     * `positionsByTick`'s values are relative to just past this, not to the
     * measure's bare x -- so a note's real x is
     * `placement.x + headerWidth + positionsByTick.get(tick)`.
     *
     * Added in the final end-to-end review: this used to be one score-wide
     * constant (6.0), which the RENDERER already overrode per staff when a
     * real header was wider. The cursor did not, so on the user's own
     * E-major score `positionToX` reported x=6.00 for a note drawn at
     * x=10.5 -- four and a half staff spaces of playback drift, on every
     * measure with a header wider than the constant.
     */
    readonly headerWidth: number;
}
/** Where one measure sits on the page -- the playback-relevant slice of `renderFromMusicXml`'s own internal `MeasurePlacement`. */
export interface PlaybackMeasurePlacement {
    readonly x: number;
    /** This measure's own drawn width -- what `playheadX` interpolates across, and (in page mode) the JUSTIFIED width, not the pre-justification one. */
    readonly width: number;
    readonly systemIndex: number;
    readonly pageIndex: number;
    /** That system's own vertical origin, in the same staff-space coordinates the SVG uses -- what Phase 49's cursor needs to draw its marker on the right system in page mode. */
    readonly systemY: number;
}
export interface EventPosition {
    readonly x: number;
    readonly systemIndex: number;
    readonly pageIndex: number;
    /** The vertical origin of the system this x belongs to -- 0 in scroll mode, the system's own offset in page mode. */
    readonly systemY: number;
}
/** One score part exposed as a named playback track for host-side selection and routing. */
export interface PlaybackTrack {
    readonly id: string;
    readonly name?: string;
}
/**
 * PLAN.md §17.1's full "what the engine provides" for one rendered score,
 * computed ONCE by `computePlaybackData` (called from `renderFromMusicXml`
 * itself, from the exact layout maps that produced the SVG) -- never a
 * second, independently-computed layout that could drift from what was
 * actually drawn. `positionToX`, `xToPosition`, `resolvePosition` and
 * `getEventStream` are all pure functions of this data, matching this
 * codebase's own established `geometry/`-style shape (explicit data in,
 * explicit data out) rather than closures with hidden state.
 */
export interface PlaybackData {
    readonly measureNumbersInOrder: readonly number[];
    readonly globalTickOffsetByMeasure: ReadonlyMap<number, number>;
    readonly timeSignatureByMeasure: ReadonlyMap<number, {
        readonly numerator: number;
        readonly denominator: number;
    }>;
    readonly measureLayoutsByNumber: ReadonlyMap<number, PlaybackMeasureLayout>;
    readonly placementByMeasureNumber: ReadonlyMap<number, PlaybackMeasurePlacement>;
    /**
     * The floor every measure's header is at least this wide -- what a
     * measure that draws no header at all still reserves. The REAL
     * per-measure width is `measureLayoutsByNumber.get(n).headerWidth`,
     * which is what `positionToX` uses; this is only the fallback for a
     * measure with no layout entry.
     */
    readonly measureHeaderAllowance: number;
    readonly tempoMap: TempoMap;
    readonly events: readonly NotationEvent[];
    /** Every MusicXML part, in score order, with its stable ID and optional display name. */
    readonly tracks: readonly PlaybackTrack[];
    /**
     * The score's repeats, unfolded into the order it is actually played
     * (`playback/repeats.ts`). For a score with no repeat marks this is
     * the written order, once through, and `performance.hasRepeats` is
     * false -- so a host can drive the cursor through it unconditionally
     * and get identical behaviour either way.
     */
    readonly performance: RepeatPlan;
    /** Anything the repeat resolver could not make sense of. Also surfaced in the render's own `diagnostics`. */
    readonly repeatDiagnostics: readonly RepeatDiagnostic[];
}
/** §17.1's `PlaybackPosition` for an arbitrary tick -- tick, real seconds (§12's tempo map) and measure+beat, all three views of the same instant. */
export declare function resolvePosition(playback: PlaybackData, tick: number): PlaybackPosition;
/** §17.1: time -> where on the page. The x of the note currently sounding at `tick` (see `floorEntry`), in the same coordinate space the rendered SVG itself uses. */
export declare function positionToX(playback: PlaybackData, tick: number): EventPosition;
/**
 * §17.1, for a MOVING playhead: where the music is at `tick`, as a
 * continuous position rather than the last note's own x.
 *
 * `positionToX` answers "where is the note sounding right now", which is
 * what note-highlighting and `xToPosition` need -- and it is a STEP
 * function, holding still between one note and the next. A playback line
 * driven by it freezes on each note and jumps, and on a measure with no
 * notes at all (a whole rest) it does not move for the entire measure.
 * The user reported exactly that: "even if there is no note, in 4/4 it
 * should still travel four beats".
 *
 * So this interpolates between the surrounding positions instead:
 * between two notes, proportionally to the tick; after a measure's last
 * note, on toward that measure's own right edge. At a note's exact tick
 * it returns exactly what `positionToX` does, so the two never disagree
 * about where a note IS -- only about what happens in between.
 */
export declare function playheadX(playback: PlaybackData, tick: number): EventPosition;
/** §17.1: where on the page -> time, for click-to-seek in a host app. The exact inverse of `positionToX` at a real event's own x (floor-by-x within the chosen measure mirrors `positionToX`'s own floor-by-tick). `systemIndex` narrows the search to one system, since the same x can legitimately appear in several (one per system/page). */
export declare function xToPosition(playback: PlaybackData, x: number, systemIndex: number): number;
