import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import { EffectInfo } from "./../EffectInfo";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare abstract class NoteEffectInfoBase extends EffectInfo {
    protected lastCreateInfo: Note[] | null;
    shouldCreateGlyph(_settings: Settings, beat: Beat): boolean;
    protected abstract shouldCreateGlyphForNote(note: Note): boolean;
    get hideOnMultiTrack(): boolean;
    canExpand(_from: Beat, _to: Beat): boolean;
}
