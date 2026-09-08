import { TechniqueSymbolPlacement } from "./../model/InstrumentArticulation";
import { MusicFontSymbol } from "./../model/MusicFontSymbol";
import type { PlaybackInformation } from "./../model/PlaybackInformation";
import type { Track } from "./../model/Track";
/**
 * @internal
 */
export declare class GpifInstrumentSet {
    lineCount: number;
    name: string;
    type: string;
    elements: GpifInstrumentElement[];
    static create(name: string, type: string, lineCount: number, elements: GpifInstrumentElement[]): GpifInstrumentSet;
}
/**
 * @internal
 */
export declare class GpifInstrumentElement {
    name: string;
    type: string;
    soundbankName: string;
    articulations: GpifInstrumentArticulation[];
    constructor(name: string, type: string, soundbankName: string, articulations: GpifInstrumentArticulation[]);
}
/**
 * @internal
 */
export declare class GpifInstrumentArticulation {
    name: string;
    staffLine: number;
    noteHeads: MusicFontSymbol[];
    techniqueSymbol: MusicFontSymbol;
    techniqueSymbolPlacement: TechniqueSymbolPlacement;
    inputMidiNumbers: number[];
    outputMidiNumber: number;
    outputRSESound: string;
    constructor(name: string, staffLine: number, noteHeads: MusicFontSymbol[], techniqueSymbol: MusicFontSymbol, techniqueSymbolPlacement: TechniqueSymbolPlacement, inputMidiNumbers: number[], outputMidiNumber: number, outputRSESound: string);
    static template(name: string, inputMidiNumbers: number[], outputRSESound: string): GpifInstrumentArticulation;
}
/**
 * A helper which provides the RSE Soundbank and MIDI mapping
 * details for exporting Guitar Pro files from the alphaTab model.
 * @internal
 */
export declare class GpifSoundMapper {
    private static _midiProgramInfoLookup;
    private static _drumInstrumentSet;
    private static _elementByArticulation;
    private static _articulationsById;
    private static _initLookups;
    static getIconId(playbackInfo: PlaybackInformation): number;
    static buildInstrumentSet(track: Track): GpifInstrumentSet;
    private static readonly _pitchedElement;
    private static _buildPitchedInstrumentSet;
    private static _buildPercussionInstrumentSet;
}
