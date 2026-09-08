import { type MidiEvent } from "./../midi/MidiEvent";
import { MidiFile } from "./../midi/MidiFile";
import { Score } from "./Score";
import { Settings } from "./../Settings";
/**
 * This class can convert a full {@link Score} instance to a simple JavaScript object and back for further
 * JSON serialization.
 * @public
 */
export declare class JsonConverter {
    /**
     * @target web
     */
    private static _jsonReplacer;
    /**
     * Converts the given score into a JSON encoded string.
     * @param score The score to serialize.
     * @returns A JSON encoded string.
     * @target web
     */
    static scoreToJson(score: Score): string;
    /**
     * Converts the given JSON string back to a {@link Score} object.
     * @param json The JSON string
     * @param settings The settings to use during conversion.
     * @returns The converted score object.
     * @target web
     */
    static jsonToScore(json: string, settings?: Settings): Score;
    /**
     * Converts the score into a JavaScript object without circular dependencies.
     * @param score The score object to serialize
     * @returns A serialized score object without ciruclar dependencies that can be used for further serializations.
     */
    static scoreToJsObject(score: Score): Map<string, unknown> | null;
    /**
     * Converts the given JavaScript object into a score object.
     * @param jsObject The javascript object created via {@link Score}
     * @param settings The settings to use during conversion.
     * @returns The converted score object.
     */
    static jsObjectToScore(jsObject: unknown, settings?: Settings): Score;
    /**
     * Converts the given settings into a JSON encoded string.
     * @param settings The settings to serialize.
     * @returns A JSON encoded string.
     * @target web
     */
    static settingsToJson(settings: Settings): string;
    /**
     * Converts the given JSON string back to a {@link Score} object.
     * @param json The JSON string
     * @returns The converted settings object.
     * @target web
     */
    static jsonToSettings(json: string): Settings;
    /**
     * Converts the settings object into a JavaScript object for transmission between components or saving purposes.
     * @param settings The settings object to serialize
     * @returns A serialized settings object without ciruclar dependencies that can be used for further serializations.
     */
    static settingsToJsObject(settings: Settings): Map<string, unknown> | null;
    /**
     * Converts the given JavaScript object into a settings object.
     * @param jsObject The javascript object created via {@link Settings}
     * @returns The converted Settings object.
     */
    static jsObjectToSettings(jsObject: unknown): Settings;
    /**
     * Converts the given JavaScript object into a MidiFile object.
     * @param jsObject The javascript object to deserialize.
     * @returns The converted MidiFile.
     */
    static jsObjectToMidiFile(jsObject: unknown): MidiFile;
    private static _jsObjectToMidiTrack;
    /**
     * Converts the given JavaScript object into a MidiEvent object.
     * @param jsObject The javascript object to deserialize.
     * @returns The converted MidiEvent.
     */
    static jsObjectToMidiEvent(midiEvent: unknown): MidiEvent;
    /**
     * Converts the given MidiFile object into a serialized JavaScript object.
     * @param midi The midi file to convert.
     * @returns A serialized MidiFile object without ciruclar dependencies that can be used for further serializations.
     */
    static midiFileToJsObject(midi: MidiFile): Map<string, unknown>;
    private static _midiTrackToJsObject;
    /**
     * Converts the given MidiEvent object into a serialized JavaScript object.
     * @param midi The midi file to convert.
     * @returns A serialized MidiEvent object without ciruclar dependencies that can be used for further serializations.
     */
    static midiEventToJsObject(midiEvent: MidiEvent): Map<string, unknown>;
}
