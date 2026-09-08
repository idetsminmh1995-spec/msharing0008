import type { MidiEvent } from "./MidiEvent";
import type { IWriteable } from "./../io/IWriteable";
/**
 * Lists the different midi file formats which are supported for export.
 * @public
 */
export declare enum MidiFileFormat {
    /**
     * A single track multi channel file (SMF Type 0)
     */
    SingleTrackMultiChannel = 0,
    /**
     * A multi track file (SMF Type 1)
     */
    MultiTrack = 1
}
/**
 * @public
 */
export declare class MidiTrack {
    /**
     * Gets a list of midi events sorted by time.
     */
    readonly events: MidiEvent[];
    /**
     * Adds the given midi event a the correct time position into the file.
     */
    addEvent(e: MidiEvent): void;
    /**
     * Writes the midi track as binary into the given stream.
     * @returns The stream to write to.
     */
    writeTo(s: IWriteable): void;
}
/**
 * Represents a midi file with a single track that can be played via {@link AlphaSynth}
 * @public
 */
export declare class MidiFile {
    /**
     * Gets or sets the midi file format to use.
     */
    format: MidiFileFormat;
    /**
     * Gets or sets the division per quarter notes.
     */
    division: number;
    /**
     * An indicator by how many midi-ticks the song contents are shifted.
     * Grace beats at start might require a shift for the first beat to start at 0.
     * This information can be used to translate back the player time axis to the music notation.
     */
    tickShift: number;
    /**
     * Gets a list of midi events sorted by time.
     */
    get events(): MidiEvent[];
    /**
     * Gets a list of midi tracks.
     */
    readonly tracks: MidiTrack[];
    private _ensureTracks;
    /**
     * Adds the given midi event a the correct time position into the file.
     */
    addEvent(e: MidiEvent): void;
    /**
     * Writes the midi file into a binary format.
     * @returns The binary midi file.
     */
    toBinary(): Uint8Array;
    /**
     * Writes the midi file as binary into the given stream.
     * @returns The stream to write to.
     */
    writeTo(s: IWriteable): void;
    static writeVariableInt(s: IWriteable, value: number): void;
}
