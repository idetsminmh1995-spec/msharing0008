import { BeatSubElement } from "./../../model/Beat";
import { BeatGlyphBase } from "./BeatGlyphBase";
/**
 * @internal
 */
export declare class TabBeatPreNotesGlyph extends BeatGlyphBase {
    doLayout(): void;
    protected get effectElement(): BeatSubElement;
}
