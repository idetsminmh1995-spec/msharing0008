import type { AlphaTabApiBase } from "./AlphaTabApiBase";
import type { MidiTickLookupFindBeatResultCursorMode } from "./midi/MidiTickLookup";
import type { BeatBounds } from "./rendering/utils/BeatBounds";
/**
 * Classes implementing this interface can handle the scroll logic
 * as the playback in alphaTab progresses.
 *
 *
 * @public
 */
export interface IScrollHandler extends Disposable {
    /**
     * Requests a instant scrolling to the specified beat.
     * @param currentBeatBounds The bounds and information about the current beat.
     */
    forceScrollTo(currentBeatBounds: BeatBounds): void;
    /**
     * Updates whenever the currently beat cursor is updating its start and end location
     * from which it starts and animates to.
     * @remarks
     * This method is tightly coupled to how alphaTab internally handles the beat cursor display.
     * alphaTab looks up the current and next beat to which the beat cursor needs to transition
     * in a specific amount of time.
     *
     * In some occations the cursor will transition to the end of the bar instead of the next beat.
     *
     * @param startBeat the information about the beat where the cursor is starting its animation.
     * @param endBeat the information about the beat where the cursor is ending its animation.
     * @param cursorMode how the cursor is transitioning (e.g. to end of bar or to the location of the next beat)
     * @param actualBeatCursorStartX the exact start position of the beat cursor animation.
     * Depending on the exact time of the player, this position might be relatively adjusted.
     * @param actualBeatCursorEndX the exact end position of the beat cursor animation.
     * Depending on the exact time of the player and cursor mode,
     * this might be beyond the expected bounds.
     * To ensure a smooth cursor experience (no jumping/flicking back and forth), alphaTab
     * optimizes the used end position and animation durations.
     * @param actualBeatCursorTransitionDuration The duration of the beat cursor transition in milliseconds.
     * Similar to the start and end positions, this duration is adjusted accordingly to ensure
     * that the beat cursor remains smoothly at the expected position for the currently played time.
     *
     */
    onBeatCursorUpdating(startBeat: BeatBounds, endBeat: BeatBounds | undefined, cursorMode: MidiTickLookupFindBeatResultCursorMode, actualBeatCursorStartX: number, actualBeatCursorEndX: number, actualBeatCursorTransitionDuration: number): void;
}
/**
 * Some basic scroll handler checking for changed offsets and scroll if changed.
 * @internal
 */
export declare abstract class BasicScrollHandler<TSettings> implements IScrollHandler {
    protected api: AlphaTabApiBase<TSettings>;
    protected lastScroll: number;
    constructor(api: AlphaTabApiBase<TSettings>);
    [Symbol.dispose](): void;
    forceScrollTo(currentBeatBounds: BeatBounds): void;
    private _scrollToBeat;
    protected abstract calculateLastScroll(currentBeatBounds: BeatBounds): number;
    protected abstract doScroll(currentBeatBounds: BeatBounds): void;
    onBeatCursorUpdating(startBeat: BeatBounds, _endBeat: BeatBounds | undefined, _cursorMode: MidiTickLookupFindBeatResultCursorMode, _actualBeatCursorStartX: number, _actualBeatCursorEndX: number, _actualBeatCursorTransitionDuration: number): void;
}
/**
 * This is the default scroll handler for vertical layouts using {@link ScrollMode.Continuous}.
 * Whenever the system changes, we scroll to the new system position vertically.
 * @internal
 */
export declare class VerticalContinuousScrollHandler<TSettings> extends BasicScrollHandler<TSettings> {
    protected calculateLastScroll(currentBeatBounds: BeatBounds): number;
    protected doScroll(currentBeatBounds: BeatBounds): void;
}
/**
 * This is the default scroll handler for vertical layouts using {@link ScrollMode.OffScreen}.
 * Whenever the system changes, we check if the new system bounds are out-of-screen and if yes, we scroll.
 * @internal
 */
export declare class VerticalOffScreenScrollHandler<TSettings> extends BasicScrollHandler<TSettings> {
    protected calculateLastScroll(currentBeatBounds: BeatBounds): number;
    protected doScroll(currentBeatBounds: BeatBounds): void;
}
/**
 * This is the default scroll handler for vertical layouts using {@link ScrollMode.Smooth}.
 * vertical smooth scrolling aims to place the on-time position
 * at scrollOffsetY **at the time when a system starts**
 * this means when a system starts, it is at scrollOffsetY,
 * then gradually scrolls down the system height reaching the bottom
 * when the system completes.
 * @internal
 */
export declare class VerticalSmoothScrollHandler<TSettings> implements IScrollHandler {
    private _api;
    private _lastScroll;
    private _scrollContainerResizeUnregister;
    constructor(api: AlphaTabApiBase<TSettings>);
    [Symbol.dispose](): void;
    forceScrollTo(currentBeatBounds: BeatBounds): void;
    onBeatCursorUpdating(startBeat: BeatBounds, _endBeat: BeatBounds | undefined, _cursorMode: MidiTickLookupFindBeatResultCursorMode, _actualBeatCursorStartX: number, _actualBeatCursorEndX: number, actualBeatCursorTransitionDuration: number): void;
    private _calculateSystemDuration;
}
/**
 * This is the default scroll handler for horizontal layouts using {@link ScrollMode.Continuous}.
 * Whenever the master bar changes, we scroll to the position horizontally.
 * @internal
 */
export declare class HorizontalContinuousScrollHandler<TSettings> extends BasicScrollHandler<TSettings> {
    protected calculateLastScroll(currentBeatBounds: BeatBounds): number;
    protected doScroll(currentBeatBounds: BeatBounds): void;
}
/**
 * This is the default scroll handler for horizontal layouts using {@link ScrollMode.OffScreen}.
 * Whenever the system changes, we check if the new system bounds are out-of-screen and if yes, we scroll.
 * @internal
 */
export declare class HorizontalOffScreenScrollHandler<TSettings> extends BasicScrollHandler<TSettings> {
    protected calculateLastScroll(currentBeatBounds: BeatBounds): number;
    protected doScroll(currentBeatBounds: BeatBounds): void;
}
/**
 * This is the default scroll handler for horizontal layouts using {@link ScrollMode.Smooth}.
 * horiontal smooth scrolling aims to place the on-time position
 * at scrollOffsetX from a beat-to-beat perspective.
 * This achieves an steady cursor at the same position with rather the music sheet scrolling past it.
 * Due to some animation inconsistencies (e.g. CSS animation vs scrolling) there might be a slight
 * flickering of the cursor.
 *
 * To get a fully steady cursor the beat cursor can simply be visually hidden and a cursor can be placed at
 * `scrollOffsetX` by the integrator.
 * @internal
 */
export declare class HorizontalSmoothScrollHandler<TSettings> implements IScrollHandler {
    private _api;
    private _lastScroll;
    private _scrollContainerResizeUnregister;
    constructor(api: AlphaTabApiBase<TSettings>);
    [Symbol.dispose](): void;
    forceScrollTo(currentBeatBounds: BeatBounds): void;
    onBeatCursorUpdating(_startBeat: BeatBounds, _endBeat: BeatBounds | undefined, _cursorMode: MidiTickLookupFindBeatResultCursorMode, actualBeatCursorStartX: number, actualBeatCursorEndX: number, actualBeatCursorTransitionDuration: number): void;
}
