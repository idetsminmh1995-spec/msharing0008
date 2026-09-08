import { MidiTickLookupFindBeatResultCursorMode } from "./midi/MidiTickLookup";
import type { Cursors } from "./platform/Cursors";
import type { IContainer } from "./platform/IContainer";
import type { BeatBounds } from "./rendering/_barrel";
/**
 * Classes implementing this interface can handle the cursor placement logic
 * as the playback in alphaTab progresses.
 *
 * @public
 */
export interface ICursorHandler {
    /**
     * Called when this handler activates. This can be on dynamic cursor creation
     * or when setting a custom handler with cursors already created.
     * @param cursors  A container holding information about the cursor elements.
     */
    onAttach(cursors: Cursors): void;
    /**
     * Called when this handler deactivates. This can be on dynamic cursor destroy
     * or when setting a new custom handler.
     * @param cursors A container holding information about the cursor elements.
     */
    onDetach(cursors: Cursors): void;
    /**
     * Instructs the handler to place the bar cursor for the given beat bounds instantly .
     * @param barCursor The bar cursor.
     * @param beatBounds The bounds of the currently active beat.
     */
    placeBarCursor(barCursor: IContainer, beatBounds: BeatBounds): void;
    /**
     * Instructs the handler to place the beat cursor for the given beat bounds instantly.
     * @param barCursor The beat cursor.
     * @param beatBounds The bounds of the currently active beat.
     */
    placeBeatCursor(beatCursor: IContainer, beatBounds: BeatBounds, startBeatX: number): void;
    /**
     * Instructs the handler to initiate a transition of the beat cursor (e.g. for dynamic animation).
     * @param beatCursor The beat cursor
     * @param beatBounds The bounds of the currently active beat.
     * @param startBeatX The X-position where the transition of the beat cursor should start.
     * @param nextBeatX The X-position where the transition of the beat cursor should end
     * (typically the next beat or end of bar depending on the cursor mode and seeks)
     * @param duration The duration in milliseconds on how long the transition should take.
     * @param cursorMode The active cursor mode for the cursor placement.
     */
    transitionBeatCursor(beatCursor: IContainer, beatBounds: BeatBounds, startBeatX: number, nextBeatX: number, duration: number, cursorMode: MidiTickLookupFindBeatResultCursorMode): void;
}
/**
 * A cursor handler which animates the beat cursor to the next beat or end of the beat bounds
 * depending on the cursor mode.
 * @internal
 */
export declare class ToNextBeatAnimatingCursorHandler implements ICursorHandler {
    onAttach(_cursors: Cursors): void;
    onDetach(_cursors: Cursors): void;
    placeBeatCursor(beatCursor: IContainer, beatBounds: BeatBounds, startBeatX: number): void;
    placeBarCursor(barCursor: IContainer, beatBounds: BeatBounds): void;
    transitionBeatCursor(beatCursor: IContainer, _beatBounds: BeatBounds, startBeatX: number, nextBeatX: number, duration: number, cursorMode: MidiTickLookupFindBeatResultCursorMode): void;
}
/**
 * A cursor handler which just places the bar and beat cursor without any animations applied.
 * @internal
 */
export declare class NonAnimatingCursorHandler implements ICursorHandler {
    onAttach(_cursors: Cursors): void;
    onDetach(_cursors: Cursors): void;
    placeBeatCursor(beatCursor: IContainer, beatBounds: BeatBounds, _startBeatX: number): void;
    placeBarCursor(barCursor: IContainer, beatBounds: BeatBounds): void;
    transitionBeatCursor(beatCursor: IContainer, beatBounds: BeatBounds, startBeatX: number, _nextBeatX: number, _duration: number, _cursorMode: MidiTickLookupFindBeatResultCursorMode): void;
}
