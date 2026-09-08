import { Duration } from "./Duration";
import { MusicFontSymbol } from "./MusicFontSymbol";
/**
 * This public enum lists all base line modes
 * @public
 */
export declare enum TechniqueSymbolPlacement {
    /**
     * Symbol is shown above
     */
    Above = 0,
    /**
     * Symbol is shown inside.
     */
    Inside = 1,
    /**
     * Symbol is shown below.
     */
    Below = 2,
    /**
     * Symbol is shown outside.
     */
    Outside = 3
}
/**
 * Describes an instrument articulation which is used for percussions.
 * @json
 * @json_strict
 * @public
 */
export declare class InstrumentArticulation {
    /**
     * An internal ID to identify this articulation for purposes like
     * mapping during exports.The exact meaning of the ID is not defined and dependes on the
     * importer source.
     */
    id: number;
    /**
     * A unique id for this articulation.
     */
    get uniqueId(): string;
    /**
     * Gets or sets the type of the element for which this articulation is for.
     */
    elementType: string;
    /**
     * The line the note head should be shown for standard notation.
     *
     * @remarks
     * This value is a bit special and its semantics are adopted from Guitar Pro:
     * Staff lines are actually "steps" including lines and spaces on the staff.
     * 1 means the note is on the top line of the staff and from there its counting downwards.
     */
    staffLine: number;
    /**
     * Gets or sets the note head to display by default.
     */
    noteHeadDefault: MusicFontSymbol;
    /**
     * Gets or sets the note head to display for half duration notes.
     */
    noteHeadHalf: MusicFontSymbol;
    /**
     * Gets or sets the note head to display for whole duration notes.
     */
    noteHeadWhole: MusicFontSymbol;
    /**
     * Gets or sets which additional technique symbol should be placed for the note head.
     */
    techniqueSymbol: MusicFontSymbol;
    /**
     * Gets or sets where the technique symbol should be placed.
     */
    techniqueSymbolPlacement: TechniqueSymbolPlacement;
    /**
     * Gets or sets which midi key to use when playing the note.
     */
    outputMidiNumber: number;
    constructor(elementType?: string, staffLine?: number, outputMidiNumber?: number, noteHeadDefault?: MusicFontSymbol, noteHeadHalf?: MusicFontSymbol, noteHeadWhole?: MusicFontSymbol, techniqueSymbol?: MusicFontSymbol, techniqueSymbolPlacement?: TechniqueSymbolPlacement, id?: number);
    /**
     * @internal
     */
    static create(id?: number, elementType?: string, staffLine?: number, outputMidiNumber?: number, noteHeadDefault?: MusicFontSymbol, noteHeadHalf?: MusicFontSymbol, noteHeadWhole?: MusicFontSymbol, techniqueSymbol?: MusicFontSymbol, techniqueSymbolPlacement?: TechniqueSymbolPlacement): InstrumentArticulation;
    getSymbol(duration: Duration): MusicFontSymbol;
}
