import type { Score } from "./../model/Score";
/**
 * This class can write a score.gpif XML from a given score model.
 * @internal
 */
export declare class GpifWriter {
    private static readonly _sampleRate;
    private _rhythmIdLookup;
    private _tuningByStaff;
    writeXml(score: Score): string;
    private _writeDom;
    private _writeAssets;
    private _backingTrackAssetId?;
    private _backingTrackFramePadding?;
    backingTrackAssetFileName?: string;
    private _writeBackingTrackNode;
    private _writeNoteNode;
    private _writeNoteProperties;
    private _writeTransposedPitch;
    private _writeConcertPitch;
    private static readonly _defaultSteps;
    private _writePitchForValue;
    private _writePitch;
    private _writeBend;
    private _writeStandardBend;
    private _toBendValue;
    private _toBendOffset;
    private _writeBeatNode;
    private _writeBeatLyrics;
    private _writeBeatXProperties;
    private _writeBeatProperties;
    private _writeRhythm;
    private _writeWhammyNode;
    private _writeStandardWhammy;
    private _writeScoreNode;
    private _writeMasterTrackNode;
    private _writeAudioTracksNode;
    private _writeTracksNode;
    private _writeTrackNode;
    private _writeSoundAndAutomation;
    private _writeSoundsAndAutomations;
    private _writeMidiConnectionNode;
    private _writeRseNode;
    private _writeStavesNode;
    private _writeStaffNode;
    private _writeDiagramCollection;
    private _writeSimplePropertyNode;
    private _writeSimpleXPropertyNode;
    private _writeLyricsNode;
    private _writeTransposeNode;
    private _writeInstrumentSetNode;
    private _mapMusicSymbol;
    private _writeMasterBarsNode;
    private _writeMasterBarNode;
    private _writeBarXProperties;
    private _writeFermatas;
    private _writeFermata;
    private _writeBarNode;
    private _writeVoiceNode;
}
