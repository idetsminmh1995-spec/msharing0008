import { AlphaTabError } from "./../AlphaTabError";
import { type AlphaTexScoreNode } from "./alphaTex/AlphaTexAst";
import { type AlphaTexParseMode, AlphaTexParser } from "./alphaTex/AlphaTexParser";
import { type AlphaTexDiagnostic, AlphaTexDiagnosticBag, type IAlphaTexImporter, type IAlphaTexImporterState, AlphaTexStaffNoteKind } from "./alphaTex/AlphaTexShared";
import { ScoreImporter } from "./ScoreImporter";
import { Score } from "./../model/Score";
import type { Staff } from "./../model/Staff";
import { Track } from "./../model/Track";
import type { Settings } from "./../Settings";
/**
 * @public
 */
export declare class AlphaTexErrorWithDiagnostics extends AlphaTabError {
    lexerDiagnostics?: AlphaTexDiagnosticBag;
    parserDiagnostics?: AlphaTexDiagnosticBag;
    semanticDiagnostics?: AlphaTexDiagnosticBag;
    iterateDiagnostics(): Generator<AlphaTexDiagnostic, void, unknown>;
    constructor(message: string, lexerDiagnostics?: AlphaTexDiagnosticBag, parserDiagnostics?: AlphaTexDiagnosticBag, semanticDiagnostics?: AlphaTexDiagnosticBag);
    toString(): string;
    private static _diagnosticsToString;
    private static _locationToString;
}
/**
 * @public
 */
export declare class AlphaTexImporter extends ScoreImporter implements IAlphaTexImporter {
    private _parser?;
    private _handler;
    private _state;
    get state(): IAlphaTexImporterState;
    get scoreNode(): AlphaTexScoreNode | undefined;
    get name(): string;
    get lexerDiagnostics(): AlphaTexDiagnosticBag;
    get parserDiagnostics(): AlphaTexDiagnosticBag;
    /**
     * The underlying parser used for parsing the AST. Available after initialization of the importer.
     */
    get parser(): AlphaTexParser | undefined;
    get parseMode(): AlphaTexParseMode;
    logErrors: boolean;
    readonly semanticDiagnostics: AlphaTexDiagnosticBag;
    addSemanticDiagnostic(diagnostic: AlphaTexDiagnostic): void;
    initFromString(tex: string, settings: Settings): void;
    readScore(): Score;
    private _createDefaultScore;
    private _newTrack;
    private _beginStaff;
    private _bars;
    private _bar;
    private _beat;
    private _beatEffects;
    private _beatDuration;
    private _parseDuration;
    private _note;
    /**
     * @internal
     */
    getStaffNoteKind(staff: Staff): AlphaTexStaffNoteKind | undefined;
    applyStaffNoteKind(staff: Staff, staffNoteKind: AlphaTexStaffNoteKind): void;
    private _noteEffects;
    private _handleTransposition;
    private _detectTuningForStaff;
    private _barMeta;
    private _getBar;
    startNewStaff(): Staff;
    applyPercussionStaff(staff: Staff): void;
    startNewTrack(): Track;
    startNewVoice(): void;
}
