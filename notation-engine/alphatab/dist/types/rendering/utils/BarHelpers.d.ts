import type { Beat } from "./../../model/Beat";
import { BeamingHelper } from "./BeamingHelper";
import type { BarRendererBase } from "./../BarRendererBase";
import { BarCollisionHelper } from "./BarCollisionHelper";
import type { BeamDirection } from "./BeamDirection";
/**
 * @internal
 */
export declare class BarHelpers {
    private _renderer;
    private _beamHelperLookup;
    beamHelpers: BeamingHelper[][];
    collisionHelper: BarCollisionHelper;
    preferredBeamDirection: BeamDirection | null;
    constructor(renderer: BarRendererBase);
    initialize(): void;
    private static _defaultBeamingRules;
    private static _findOrBuildDefaultBeamingRules;
    getBeamingHelperForBeat(beat: Beat): BeamingHelper | undefined;
}
