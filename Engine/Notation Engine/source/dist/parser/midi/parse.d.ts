import { type MidiDiagnostic } from './diagnostic.js';
import type { MidiFile } from './midi-file.js';
export interface ParseMidiResult {
    readonly midiFile: MidiFile | undefined;
    readonly diagnostics: readonly MidiDiagnostic[];
}
/**
 * §11: turns a `.mid` byte stream into a note list plus a tempo/meta
 * timeline. Never throws (§11.2, mirroring §10.7's own discipline for
 * the MusicXML side) -- every real failure mode (bad magic, truncated
 * chunk, SMPTE division, format 2) returns `midiFile: undefined` plus a
 * diagnostic explaining why, rather than an exception.
 */
export declare function parseMidiFile(bytes: Uint8Array): ParseMidiResult;
