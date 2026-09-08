import { ScoreImporter } from "./ScoreImporter";
import { type IReadable } from "./../io/IReadable";
import type { IWriteable } from "./../io/IWriteable";
import { Bar } from "./../model/Bar";
import { Beat } from "./../model/Beat";
import { Color } from "./../model/Color";
import { DynamicValue } from "./../model/DynamicValue";
import { HarmonicType } from "./../model/HarmonicType";
import { Note } from "./../model/Note";
import { Score } from "./../model/Score";
import { Track } from "./../model/Track";
import { Voice } from "./../model/Voice";
/**
 * @internal
 */
export declare class Gp3To5Importer extends ScoreImporter {
    private static readonly _versionString;
    private static readonly _gp5PercussionInstrumentMap;
    private _versionNumber;
    private _score;
    private _globalTripletFeel;
    private _lyricsTrack;
    private _lyrics;
    private _barCount;
    private _trackCount;
    /**
     * For 4 ports, 16 channels of information
     */
    private _midiChannelInfo;
    private _doubleBars;
    private _clefsPerTrack;
    private _keySignatures;
    private _beatTextChunksByTrack;
    private _directionLookup;
    private _initialTempo;
    private _stringEncoding;
    get name(): string;
    readScore(): Score;
    private _readDirection;
    readVersion(): void;
    readScoreInformation(): void;
    private static readonly _maxNoticeLines;
    private static readonly _maxBarCount;
    private static readonly _maxTrackCount;
    private static readonly _maxBeatCount;
    private static readonly _maxBendPointCount;
    private _ensureLoopBoundary;
    readLyrics(): void;
    readPageSetup(): void;
    readPlaybackInfos(): void;
    readMasterBars(): void;
    readMasterBar(): void;
    readTracks(): void;
    /**
     * Guitar Pro 3-6 changes to a bass clef if any string tuning is below B1
     */
    private static readonly _bassClefTuningThreshold;
    readTrack(): void;
    readBars(): void;
    readBar(track: Track): void;
    readVoice(track: Track, bar: Bar): void;
    private _readAndChainVoice;
    /**
     * Attempts to skip a fully empty voice.
     * @returns true if we detected an empty voice, false if the beat was not empty and a full voice has to be read.
     */
    private _skipEmptyVoice;
    readBeat(track: Track, bar: Bar, voice: Voice): void;
    readChord(beat: Beat): void;
    readBeatEffects(beat: Beat): HarmonicType;
    readTremoloBarEffect(beat: Beat): void;
    private static _toStrokeValue;
    private _readRseBank;
    readMixTableChange(beat: Beat): void;
    readNote(track: Track, bar: Bar, voice: Voice, beat: Beat, stringIndex: number): Note;
    toDynamicValue(value: number): DynamicValue;
    readNoteEffects(_track: Track, voice: Voice, beat: Beat, note: Note): void;
    private static readonly _bendStep;
    readBend(note: Note): void;
    readGrace(voice: Voice, note: Note): void;
    readTremoloPicking(beat: Beat): void;
    readSlide(note: Note): void;
    readArtificialHarmonic(note: Note): void;
    readTrill(note: Note): void;
}
/**
 * @internal
 */
export declare class GpBinaryHelpers {
    static gpReadColor(data: IReadable, readAlpha?: boolean): Color;
    static gpReadBool(data: IReadable): boolean;
    /**
     * Skips an integer (4byte) and reads a string using
     * a bytesize
     */
    static gpReadStringIntUnused(data: IReadable, encoding: string, maxDecodingBufferSize: number): string;
    /**
     * Reads an integer as size, and then the string itself
     */
    static gpReadStringInt(data: IReadable, encoding: string, maxDecodingBufferSize: number): string;
    /**
     * Reads an integer as size, skips a byte and reads the string itself
     */
    static gpReadStringIntByte(data: IReadable, encoding: string, maxDecodingBufferSize: number): string;
    static gpReadString(data: IReadable, length: number, encoding: string, maxDecodingBufferSize: number): string;
    static gpWriteString(data: IWriteable, s: string): void;
    /**
     * Reads a byte as size and the string itself.
     * Additionally it is ensured the specified amount of bytes is read.
     * @param data the data to read from.
     * @param length the amount of bytes to read
     * @param encoding The encoding to use to decode the byte into a string
     * @returns
     */
    static gpReadStringByteLength(data: IReadable, length: number, encoding: string): string;
}
