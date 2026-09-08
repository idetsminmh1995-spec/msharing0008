import type { IMidiFileHandler } from "./IMidiFileHandler";
import { MidiTickLookup } from "./MidiTickLookup";
import { type Automation } from "./../model/Automation";
import type { Beat } from "./../model/Beat";
import type { Note } from "./../model/Note";
import type { Score } from "./../model/Score";
import { Settings } from "./../Settings";
import { BackingTrackSyncPoint } from "./../synth/IAlphaSynth";
/**
 * This generator creates a midi file using a score.
 * @public
 */
export declare class MidiFileGenerator {
    private static readonly _defaultDurationDead;
    private static readonly _defaultDurationPalmMute;
    private readonly _score;
    private _settings;
    private _handler;
    private _programsPerChannel;
    private _currentTime;
    private _calculatedBeatTimers;
    /**
     * Gets a lookup object which can be used to quickly find beats and bars
     * at a given midi tick position.
     */
    readonly tickLookup: MidiTickLookup;
    /**
     * Gets or sets whether transposition pitches should be applied to the individual midi events or not.
     */
    applyTranspositionPitches: boolean;
    /**
     * The computed sync points for synchronizing the midi file with an external backing track.
     */
    syncPoints: BackingTrackSyncPoint[];
    /**
     * Gets the transposition pitches for the individual midi channels.
     */
    readonly transpositionPitches: Map<number, number>;
    /**
     * Initializes a new instance of the {@link MidiFileGenerator} class.
     * @param score The score for which the midi file should be generated.
     * @param settings The settings ot use for generation.
     * @param handler The handler that should be used for generating midi events.
     */
    constructor(score: Score, settings: Settings | null, handler: IMidiFileHandler);
    /**
     * Starts the generation of the midi file.
     */
    generate(): void;
    private _detectTickShift;
    private _generateTrack;
    private _addProgramChange;
    private _addBankChange;
    static buildTranspositionPitches(score: Score, settings: Settings): Map<number, number>;
    private _generateChannel;
    /**
     * Generates the sync points for the given score without re-generating the midi itself.
     * @remarks
     * Use this method if a re-generation of the sync points after modification is required.
     * It correctly handles repeats and places sync points accoridng to their absolute midi tick when they
     * need to be considered for synchronization.
     * @param score The song for which to regenerate the sync points.
     * @param createNew Whether a new set of sync points should be generated for the sync (start, stop and tempo changes).
     * @returns The generated sync points for usage in the backing track playback.
     */
    static generateSyncPoints(score: Score, createNew?: boolean): BackingTrackSyncPoint[];
    /**
     * @internal
     */
    static buildModifiedTempoLookup(score: Score): Map<Automation, BackingTrackSyncPoint>;
    private static _playThroughSong;
    private static _processBarTime;
    private static _processBarTimeWithNewSyncPoints;
    private static _processBarTimeWithSyncPoints;
    private static _processBarTimeNoSyncPoints;
    private static _toChannelShort;
    private _generateMasterBar;
    private _generateBar;
    private _getPlaybackBar;
    private _generateVoice;
    private _currentTripletFeel;
    private _generateBeat;
    private static _calculateTripletFeelInfo;
    private _generateDeadSlap;
    private _needsSecondaryChannel;
    private _determineChannel;
    private _generateNote;
    /**
     * For every note within the octave, the number of keys to go up when playing ornaments.
     * For white keys this is the next white key,
     * For black keys it is either the next black or white key depending on the distance.
     *
     * Ornaments are not really a strictly defined element, alphaTab is using shipping some default.
     */
    private static readonly _ornamentKeysUp;
    /**
     * For every note within the octave, the number of keys to go down when playing ornaments.
     * This is typically only a key down.
     *
     * Ornaments are not really a strictly defined element, alphaTab is using shipping some default.
     */
    static readonly ornamentKeysDown: number[];
    private _generateOrnament;
    private _getNoteDuration;
    private _applyStaticDuration;
    private static _getNoteVelocity;
    private _generateFade;
    private _generateFadeSteps;
    private _generateVibrato;
    vibratoResolution: number;
    private _generateVibratorWithParams;
    /**
     * Maximum semitones that are supported in bends in one direction (up or down)
     * GP has 8 full tones on whammys.
     */
    private static readonly _pitchBendRangeInSemitones;
    /**
     * The value on how many pitch-values are used for one semitone
     */
    private static readonly _pitchValuePerSemitone;
    /**
     * The minimum number of breakpoints generated per semitone bend.
     */
    private static readonly _minBreakpointsPerSemitone;
    /**
     * How long until a new breakpoint is generated for a bend.
     */
    private static readonly _millisecondsPerBreakpoint;
    /**
     * Calculates the midi pitch wheel value for the give bend value.
     */
    static getPitchWheel(bendValue: number): number;
    private _generateSlide;
    private _generateBend;
    private _generateSongBookWhammyOrBend;
    private _generateWhammy;
    private _generateWhammyOrBend;
    private _generateBendValues;
    private _generateRasgueado;
    private _generateTrill;
    private _generateTremoloPicking;
    private static readonly _rasgueadoDirections;
    private static readonly _rasgueadoDurations;
    private _getRasgueadoInfo;
    private _getBrushInfo;
    private _fillBrushInfo;
    private _generateNonTempoAutomation;
    prepareSingleBeat(beat: Beat): number;
    generateSingleBeat(beat: Beat): void;
    generateSingleNote(note: Note): void;
}
