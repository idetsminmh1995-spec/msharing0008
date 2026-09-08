import { type Beat } from "./../../model/Beat";
import { Duration } from "./../../model/Duration";
import { GraceType } from "./../../model/GraceType";
import type { Note } from "./../../model/Note";
import type { Staff } from "./../../model/Staff";
import type { Voice } from "./../../model/Voice";
import type { BarRendererBase } from "./../BarRendererBase";
import { BeamDirection } from "./BeamDirection";
import type { BeamingRuleLookup } from "./BeamingRuleLookup";
/**
 * @internal
 */
export declare class BeamingHelperDrawInfo {
    startBeat: Beat | null;
    startX: number;
    startY: number;
    endBeat: Beat | null;
    endX: number;
    endY: number;
    /**
     * calculates the Y-position given a X-pos using the current start end point
     * @param x
     */
    calcY(x: number): number;
}
/**
 * This public class helps drawing beams and bars for notes.
 * @internal
 */
export declare class BeamingHelper {
    private _staff;
    private _renderer;
    private _beamingRuleLookup;
    voice: Voice | null;
    beats: Beat[];
    shortestDuration: Duration;
    /**
     * an indicator whether any beat has a tuplet on it.
     */
    hasTuplet: boolean;
    slashBeats: Beat[];
    restBeats: Beat[];
    lowestNoteInHelper: Note | null;
    private _lowestNoteCompareValueInHelper;
    highestNoteInHelper: Note | null;
    private _highestNoteCompareValueInHelper;
    invertBeamDirection: boolean;
    preferredBeamDirection: BeamDirection | null;
    graceType: GraceType;
    get isRestBeamHelper(): boolean;
    hasStem(forceFlagOnSingleBeat: boolean, beat?: Beat): boolean;
    static beatHasStem(beat: Beat): boolean;
    hasFlag(forceFlagOnSingleBeat: boolean, beat?: Beat): boolean;
    static beatHasFlag(beat: Beat): boolean;
    constructor(staff: Staff, renderer: BarRendererBase, beamingRuleLookup: BeamingRuleLookup);
    /**
     * Invalidates cached drawing infos. The emit path (`emitHelperSkyline` →
     * `_computeBeamingBounds` → `ensureBeamDrawingInfo`) repopulates them
     * with post-spring X.
     */
    invalidateDrawingInfos(): void;
    finish(): void;
    static computeLineHeightsForRest(duration: Duration): number[];
    checkBeat(beat: Beat): boolean;
    private _checkNote;
    private _canJoin;
    private static _canJoinDuration;
    static isFullBarJoin(a: Beat, b: Beat, barIndex: number): boolean;
    get beatOfLowestNote(): Beat;
    get beatOfHighestNote(): Beat;
    /**
     * Per-direction beam drawing info cache. BeamDirection is a 2-value enum
     * (Up=0, Down=1) so we use two pre-allocated `BeamingHelperDrawInfo`
     * instances plus paired `*Valid: boolean` flags. The slot is reused
     * across cycles; `*Valid=false` means callers must re-initialize before
     * reading. This avoids the per-cycle Map allocation and lookup cost on
     * the hot beam-paint path. The "paired Valid + non-null T" pattern
     * follows {@link BarTempoGlyph} — `T | null` does not transpile cleanly
     * to C# (nullable struct/class semantics diverge), but plain fields plus
     * a boolean do.
     */
    private readonly _drawingInfoUp;
    private readonly _drawingInfoDown;
    private _drawingInfoUpValid;
    private _drawingInfoDownValid;
    getDrawingInfo(direction: BeamDirection): BeamingHelperDrawInfo;
    hasDrawingInfo(direction: BeamDirection): boolean;
    markDrawingInfoValid(direction: BeamDirection): void;
}
