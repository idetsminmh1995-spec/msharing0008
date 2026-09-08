import { ScoreImporter } from "./ScoreImporter";
import { Score } from "./../model/Score";
/**
 * @internal
 */
export declare class MusicXmlImporter extends ScoreImporter {
    private _score;
    private _idToTrackInfo;
    private _indexToTrackInfo;
    private _staffToContext;
    private _staffVoicePacking;
    private _currentBarNumberDisplayPart?;
    private _currentBarNumberDisplayBar?;
    private _divisionsPerQuarterNote;
    private _currentDynamics;
    get name(): string;
    readScore(): Score;
    private _extractMusicXml;
    private _parseDom;
    private _parsePartwise;
    private _parseTimewise;
    private _parseCredit;
    private static _sanitizeDisplay;
    private _parseIdentification;
    private _parseEncoding;
    private _parseMovementTitle;
    private _parsePartList;
    private _parseScorePart;
    private _parseScoreInstrument;
    private _parseScorePartMidiInstrument;
    private static _interpolatePercent;
    private static _interpolatePan;
    private static _interpolate;
    private _parsePartDisplayAsText;
    private _parseWork;
    private _parsePartwisePart;
    private _parsePartwiseMeasure;
    private _parseTimewiseMeasure;
    private _getOrCreateMasterBar;
    private _parseTimewisePart;
    /**
     * The current musical position within the bar.
     */
    private _musicalPosition;
    /**
     * The last known beat which was parsed. Might be used
     * to access the current voice/staff (e.g. on rests when we don't have notes)
     */
    private _lastBeat;
    private _parsePartMeasure;
    private _parsePrint;
    private _applySimileMarks;
    private _clearBar;
    private _parseBarLine;
    private _parseRepeat;
    private _nextMasterBarRepeatEnding;
    private _parseEnding;
    private _parseBarStyle;
    private _parseSound;
    private _parseSwing;
    private _nextBeatAutomations;
    private _nextBeatChord;
    private _nextBeatCrescendo;
    private _nextBeatLetRing;
    private _nextBeatPalmMute;
    private _nextBeatOttavia;
    private _nextBeatText;
    private _parseSoundMidiInstrument;
    private _parseHarmony;
    private _parseDegree;
    private _parseHarmonyRoot;
    private _parseHarmonyKind;
    private _parseHarmonyFrame;
    private _parseAttributes;
    private _simileMarkAllStaves;
    private _simileMarkPerStaff;
    private _isBeatSlash;
    private _parseMeasureStyle;
    private _parseTranspose;
    private _parseStaffDetails;
    private _parseStaffTuning;
    private _parseClef;
    private _parseTime;
    private _keyAllStaves;
    private _parseKey;
    private _parseDirection;
    private _parseOctaveShift;
    private _parseMetronome;
    private _hasSameTempo;
    private _parsePedal;
    private _parseDynamics;
    private _parseForward;
    private _parseBackup;
    private _getOrCreateStaff;
    private _getOrCreateBar;
    private _resolveAndPlaceVoice;
    private _parseNote;
    /**
     * Applies note-level post-processing that requires the fully resolved parse context.
     *
     * Purpose:
     * - Set final visibility.
     * - Resolve percussion articulation consistently in one place.
     *
     * Why this is called at the end of _parseNote:
     * - The logic relies on final note context (attached beat/voice/bar/staff), especially
     *   staff percussion state, and on the final display value after transposition.
     * - Running this earlier could use incomplete or wrong context and produce wrong
     *   articulation mapping.
     */
    private _finalizeImportedNote;
    private _parsePlay;
    private static readonly _b4Value;
    private _estimateBeamDirection;
    private _parseNoteHead;
    private _createRestForGap;
    private _insertBeatToVoice;
    private _musicXmlDivisionsToAlphaTabTicks;
    private _parseBeatDuration;
    private static _allDurations;
    private static _allDurationTicks;
    private _applyBeatDurationFromTicks;
    private _parseLyric;
    private _parseNotations;
    private _getStaffContext;
    private _parseGlissando;
    private _parseSlur;
    private _parseArpeggiate;
    private _parseFermata;
    private _parseArticulations;
    private _parseTechnical;
    private _parseBends;
    private _parseFingering;
    private _currentTrillStep;
    private _parseOrnaments;
    private _parseSlide;
    private _parseTied;
    private _parseStem;
    private _parseAccidental;
    private _calculatePitchedNoteValue;
    private _parseDuration;
    private _parseUnpitched;
    private _parsePitch;
    private _applyNoteHead;
}
