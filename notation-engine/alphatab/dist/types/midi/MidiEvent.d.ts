import type { IWriteable } from "./../io/IWriteable";
import type { ControllerType } from "./ControllerType";
/**
 * Lists all midi event types. Based on the type the instance is a specific subclass.
 * @public
 */
export declare enum MidiEventType {
    TimeSignature = 88,// 0xFF _0x58_ in Midi 1.0
    NoteOn = 128,// Aligned with Midi 1.0
    NoteOff = 144,// Aligned with Midi 1.0
    ControlChange = 176,// Aligned with Midi 1.0
    ProgramChange = 192,// Aligned with Midi 1.0
    TempoChange = 81,// 0xFF _0x51_ in Midi 1.0
    PitchBend = 224,// Aligned with Midi 1.0
    PerNotePitchBend = 96,// Aligned with Midi 2.0
    EndOfTrack = 47,// 0xFF _0x2F_ in Midi 1.0
    AlphaTabRest = 241,// SystemExclusive + 1
    AlphaTabMetronome = 242,// SystemExclusive + 2
    /**
     * @deprecated Not used anymore internally. move to the other concrete types.
     */
    SystemExclusive = 240,// Aligned with Midi 1.0
    /**
     * @deprecated Not used anymore internally. move to the other concrete types.
     */
    SystemExclusive2 = 247,// Aligned with Midi 1.0
    /**
     * @deprecated Not used anymore internally. move to the other concrete types.
     */
    Meta = 255
}
/**
 * Represents a midi event.
 * @public
 */
export declare abstract class MidiEvent {
    /**
     * Gets or sets the track to which the midi event belongs.
     */
    track: number;
    /**
     * Gets or sets the absolute tick of this midi event.
     */
    tick: number;
    /**
     * Gets or sets the midi command (type) of this event.
     */
    type: MidiEventType;
    /**
     * Initializes a new instance of the {@link MidiEvent} class.
     * @param track The track this event belongs to.
     * @param tick The absolute midi ticks of this event.
     * @param command The type of this event.
     */
    constructor(track: number, tick: number, command: MidiEventType);
    /**
     * @deprecated Change to `type`
     */
    get command(): MidiEventType;
    /**
     * The 32-bit encoded raw midi message. Deprecated {@since 1.3.0}. Use the properties of the subclasses instead.
     * @deprecated Use individual properties to access data.
     */
    get message(): number;
    /**
     * The first data byte. Meaning depends on midi event type. (Deprecated {@since 1.3.0}, use the specific properties of the midi event depending on type)
     * @deprecated Use individual properties to access data.
     */
    get data1(): number;
    /**
     * The second data byte Meaning depends on midi event type. (Deprecated {@since 1.3.0}, use the specific properties of the midi event depending on type)
     * @deprecated Use individual properties to access data.
     */
    get data2(): number;
    /**
     * Writes the midi event as binary into the given stream.
     * @param s The stream to write to.
     */
    abstract writeTo(s: IWriteable): void;
}
/**
 * Represents a time signature change event.
 * @public
 */
export declare class TimeSignatureEvent extends MidiEvent {
    /**
     * The time signature numerator.
     */
    numerator: number;
    /**
     * The denominator index is a negative power of two: 2 represents a quarter-note, 3 represents an eighth-note, etc.
     * Denominator = 2^(index)
     */
    denominatorIndex: number;
    /**
     * The number of MIDI clocks in a metronome click
     */
    midiClocksPerMetronomeClick: number;
    /**
     * The number of notated 32nd-notes in what MIDI thinks of as a quarter-note (24 MIDI Clocks).
     */
    thirtySecondNodesInQuarter: number;
    constructor(track: number, tick: number, numerator: number, denominatorIndex: number, midiClocksPerMetronomeClick: number, thirtySecondNodesInQuarter: number);
    writeTo(s: IWriteable): void;
}
/**
 * The base class for alphaTab specific midi events (like metronomes and rests).
 * @public
 */
export declare abstract class AlphaTabSysExEvent extends MidiEvent {
    static readonly AlphaTabManufacturerId = 125;
    static readonly MetronomeEventId = 0;
    static readonly RestEventId = 1;
    writeTo(s: IWriteable): void;
    protected abstract writeEventData(s: IWriteable): void;
}
/**
 * Represents a metronome event. This event is emitted by the synthesizer only during playback and
 * is typically not part of the midi file itself.
 * @public
 */
export declare class AlphaTabMetronomeEvent extends AlphaTabSysExEvent {
    /**
     * The metronome counter as per current time signature.
     */
    metronomeNumerator: number;
    /**
     * The duration of the metronome tick in MIDI ticks.
     */
    metronomeDurationInTicks: number;
    /**
     * The duration of the metronome tick in milliseconds.
     */
    metronomeDurationInMilliseconds: number;
    /**
     * Gets a value indicating whether the current event is a metronome event.
     */
    readonly isMetronome: boolean;
    constructor(track: number, tick: number, counter: number, durationInTicks: number, durationInMillis: number);
    protected writeEventData(s: IWriteable): void;
}
/**
 * Represents a REST beat being 'played'. This event supports alphaTab in placing the cursor.
 * @public
 */
export declare class AlphaTabRestEvent extends AlphaTabSysExEvent {
    channel: number;
    constructor(track: number, tick: number, channel: number);
    protected writeEventData(s: IWriteable): void;
}
/**
 * The base class for note related events.
 * @public
 */
export declare abstract class NoteEvent extends MidiEvent {
    /**
     * The channel on which the note is played.
     */
    channel: number;
    /**
     * The key of the note being played (aka. the note height).
     */
    noteKey: number;
    /**
     * The velocity in which the 'key' of the note is pressed (aka. the loudness/intensity of the note).
     */
    noteVelocity: number;
    constructor(track: number, tick: number, type: MidiEventType, channel: number, noteKey: number, noteVelocity: number);
    get data1(): number;
    get data2(): number;
}
/**
 * Represents a note being played
 * @public
 */
export declare class NoteOnEvent extends NoteEvent {
    constructor(track: number, tick: number, channel: number, noteKey: number, noteVelocity: number);
    writeTo(s: IWriteable): void;
}
/**
 * Represents a note stop being played.
 * @public
 */
export declare class NoteOffEvent extends NoteEvent {
    constructor(track: number, tick: number, channel: number, noteKey: number, noteVelocity: number);
    writeTo(s: IWriteable): void;
}
/**
 * Represents the change of a value on a midi controller.
 * @public
 */
export declare class ControlChangeEvent extends MidiEvent {
    /**
     * The channel for which the controller is changing.
     */
    channel: number;
    /**
     * The type of the controller which is changing.
     */
    controller: ControllerType;
    /**
     * The new value of the controller. The meaning is depending on the controller type.
     */
    value: number;
    constructor(track: number, tick: number, channel: number, controller: ControllerType, value: number);
    writeTo(s: IWriteable): void;
    get data1(): number;
    get data2(): number;
}
/**
 * Represents the change of the midi program on a channel.
 * @public
 */
export declare class ProgramChangeEvent extends MidiEvent {
    /**
     * The midi channel for which the program changes.
     */
    channel: number;
    /**
     * The numeric value of the program indicating the instrument bank to choose.
     */
    program: number;
    constructor(track: number, tick: number, channel: number, program: number);
    writeTo(s: IWriteable): void;
    get data1(): number;
}
/**
 * Represents a change of the tempo in the song.
 * @public
 */
export declare class TempoChangeEvent extends MidiEvent {
    /**
     * The tempo in microseconds per quarter note (aka USQ). A time format typically for midi.
     */
    get microSecondsPerQuarterNote(): number;
    /**
         * The tempo in microseconds per quarter note (aka USQ). A time format typically for midi.
         */
    set microSecondsPerQuarterNote(value: number);
    /**
     * The tempo in beats per minute
     */
    beatsPerMinute: number;
    constructor(tick: number, microSecondsPerQuarterNote: number);
    writeTo(s: IWriteable): void;
}
/**
 * Represents a change of the pitch bend (aka. pitch wheel) on a specific channel.
 * @public
 */
export declare class PitchBendEvent extends MidiEvent {
    /**
     * The channel for which the pitch bend changes.
     */
    channel: number;
    /**
     * The value to which the pitch changes. This value is according to the MIDI specification.
     */
    value: number;
    constructor(track: number, tick: number, channel: number, value: number);
    writeTo(s: IWriteable): void;
    get data1(): number;
    get data2(): number;
}
/**
 * Represents a single note pitch bend change.
 * @public
 */
export declare class NoteBendEvent extends MidiEvent {
    /**
     * The channel on which the note is played for which the pitch changes.
     */
    channel: number;
    /**
     * The key of the note for which the pitch changes.
     */
    noteKey: number;
    /**
     * The value to which the pitch changes. This value is according to the MIDI specification.
     */
    value: number;
    constructor(track: number, tick: number, channel: number, noteKey: number, value: number);
    writeTo(_s: IWriteable): void;
}
/**
 * Represents the end of the track indicating that no more events for this track follow.
 * @public
 */
export declare class EndOfTrackEvent extends MidiEvent {
    constructor(track: number, tick: number);
    writeTo(s: IWriteable): void;
}
