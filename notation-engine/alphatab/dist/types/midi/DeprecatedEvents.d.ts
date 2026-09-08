import type { IWriteable } from "./../io/IWriteable";
import { MidiEvent } from "./MidiEvent";
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class DeprecatedMidiEvent extends MidiEvent {
    constructor();
    writeTo(_s: IWriteable): void;
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare enum MetaEventType {
    SequenceNumber = 0,
    TextEvent = 1,
    CopyrightNotice = 2,
    SequenceOrTrackName = 3,
    InstrumentName = 4,
    LyricText = 5,
    MarkerText = 6,
    CuePoint = 7,
    PatchName = 8,
    PortName = 9,
    MidiChannel = 32,
    MidiPort = 33,
    EndOfTrack = 47,
    Tempo = 81,
    SmpteOffset = 84,
    TimeSignature = 88,
    KeySignature = 89,
    SequencerSpecific = 127
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class MetaEvent extends DeprecatedMidiEvent {
    get metaStatus(): MetaEventType;
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class MetaDataEvent extends MetaEvent {
    data: Uint8Array;
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class MetaNumberEvent extends MetaEvent {
    value: number;
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class Midi20PerNotePitchBendEvent extends DeprecatedMidiEvent {
    noteKey: number;
    pitch: number;
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare enum SystemCommonType {
    SystemExclusive = 240,
    MtcQuarterFrame = 241,
    SongPosition = 242,
    SongSelect = 243,
    TuneRequest = 246,
    SystemExclusive2 = 247
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class SystemCommonEvent extends DeprecatedMidiEvent {
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare enum AlphaTabSystemExclusiveEvents {
    MetronomeTick = 0,
    Rest = 1
}
/**
 * @deprecated Move to the new concrete Midi Event Types.
 * @public
 */
export declare class SystemExclusiveEvent extends SystemCommonEvent {
    static readonly AlphaTabManufacturerId = 125;
    data: Uint8Array;
    get isMetronome(): boolean;
    get metronomeNumerator(): number;
    get metronomeDurationInTicks(): number;
    get metronomeDurationInMilliseconds(): number;
    get isRest(): boolean;
    get manufacturerId(): number;
}
