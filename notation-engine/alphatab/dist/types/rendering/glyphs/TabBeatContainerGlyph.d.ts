import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import { BeatContainerGlyph } from "./BeatContainerGlyph";
import type { BeamingHelper } from "./../utils/BeamingHelper";
/**
 * @internal
 */
export declare class TabBeatContainerGlyph extends BeatContainerGlyph {
    private _bend;
    private _effectSlurs;
    constructor(beat: Beat);
    protected drawBeamHelperAsFlags(helper: BeamingHelper): boolean;
    doLayout(): void;
    protected createTies(n: Note): void;
}
