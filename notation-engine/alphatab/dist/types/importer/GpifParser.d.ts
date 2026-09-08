import { Duration } from "./../model/Duration";
import { TechniqueSymbolPlacement } from "./../model/InstrumentArticulation";
import { MusicFontSymbol } from "./../model/MusicFontSymbol";
import { Score } from "./../model/Score";
import type { Settings } from "./../Settings";
/**
 * This structure represents a duration within a gpif
 * @internal
 */
export declare class GpifRhythm {
    id: string;
    dots: number;
    tupletDenominator: number;
    tupletNumerator: number;
    value: Duration;
}
/**
 * This class can parse a score.gpif xml file into the model structure
 * @internal
 */
export declare class GpifParser {
    private static readonly _invalidId;
    /**
     * GPX range: 0-100
     * Internal range: 0 - 60
     */
    private static readonly _bendPointPositionFactor;
    /**
     * GPIF: 25 per quarternote
     * Internal Range: 1 per quarter note
     */
    private static readonly _bendPointValueFactor;
    private static readonly _sampleRate;
    score: Score;
    private _backingTrackAssetId;
    private _masterTrackAutomations;
    private _automationsPerTrackIdAndBarIndex;
    private _sustainPedalsPerTrackIdAndBarIndex;
    private _tracksMapping;
    private _tracksById;
    private _masterBars;
    private _barsOfMasterBar;
    private _barsById;
    private _voicesOfBar;
    private _voiceById;
    private _beatsOfVoice;
    private _rhythmOfBeat;
    private _beatById;
    private _rhythmById;
    private _noteById;
    private _notesOfBeat;
    private _tappedNotes;
    private _lyricsByTrack;
    private _soundsByTrack;
    private _hasAnacrusis;
    private _articulationByName;
    private _skipApplyLyrics;
    private _backingTrackPadding;
    /** Marks the input as a Guitar Pro 6 file. Also auto-detected from the GPIF header. */
    isGp6: boolean;
    private _doubleBars;
    private _keySignatures;
    loadAsset?: (fileName: string) => Uint8Array | undefined;
    parseXml(xml: string, settings: Settings): void;
    private _parseDom;
    private _parseAssets;
    private _parseBackingTrackAsset;
    private _parseScoreNode;
    private static _parseIntSafe;
    private static _parseFloatSafe;
    private static _splitSafe;
    private _parseBackingTrackNode;
    private _parseMasterTrackNode;
    private _parseAutomations;
    private _parseAutomation;
    private _parseTracksNode;
    private _parseTrack;
    private _parseTrackAutomations;
    private _parseNotationPatch;
    private _parseInstrumentSet;
    private _parseElements;
    private _parseElement;
    private _parseArticulations;
    private _parseArticulation;
    /**
     * @internal
     */
    static parseTechniqueSymbol(txt: string): MusicFontSymbol;
    /**
     * @internal
     */
    static parseTechniqueSymbolPlacement(txt: string): TechniqueSymbolPlacement;
    /**
     * @internal
     */
    static parseNoteHead(txt: string): MusicFontSymbol;
    private _parseStaves;
    private _parseStaff;
    private _parseStaffProperties;
    private _parseStaffProperty;
    private _parseLyrics;
    private _parseLyricsLine;
    private _parseDiagramCollectionForTrack;
    private _parseDiagramCollectionForStaff;
    private _parseDiagramItemForTrack;
    private _parseDiagramItemForStaff;
    private _parseDiagramItemForChord;
    private _parseTrackProperties;
    private _parseTrackProperty;
    private _parseGeneralMidi;
    private _parseSounds;
    private _parseSound;
    private _parseSoundMidi;
    private _parsePartSounding;
    private _transposeKeySignaturePerTrack;
    private _parseTranspose;
    private _parseRSE;
    private _parseChannelStrip;
    private _parseChannelStripParameters;
    private _parseMasterBarsNode;
    private _parseMasterBar;
    private _parseDirections;
    private _parseFermatas;
    private _parseFermata;
    private _parseBars;
    private _parseBar;
    private _parseVoices;
    private _parseVoice;
    private _parseBeats;
    private _parseBeat;
    private _parseBeatLyrics;
    private _parseBeatXProperties;
    private _parseBarXProperties;
    private _parseMasterBarXProperties;
    private _parseBeatProperties;
    private _parseNotes;
    private _parseNote;
    private _parseNoteProperties;
    private _parseConcertPitch;
    private _toBendValue;
    private _toBendOffset;
    private _parseRhythms;
    private _parseRhythm;
    private _keyFor;
    private _equalizeVoiceCount;
    private _attachVoiceToBar;
    private _attachBeatToVoice;
    private _attachNoteToBeat;
    private _assignFingeringForGp6;
    private _buildModel;
}
