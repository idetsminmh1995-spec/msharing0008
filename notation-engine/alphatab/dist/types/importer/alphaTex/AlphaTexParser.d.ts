import { type AlphaTexArgumentList, type AlphaTexAstNode, AlphaTexNodeType, type AlphaTexScoreNode } from "./AlphaTexAst";
import { AlphaTexLexer } from "./AlphaTexLexer";
import { type AlphaTexDiagnostic, AlphaTexDiagnosticBag } from "./AlphaTexShared";
/**
 * The different modes of the alphaTex parser.
 * @public
 */
export declare enum AlphaTexParseMode {
    /**
     * Optimizes the parser for only the model importing.
     * The model importing does not need all details from the AST allowing a more lightweight
     * parsing.
     */
    ForModelImport = 0,
    /**
     * Performs the full AST parsing with all details.
     * This mode is mainly used by the Language Server providing IDE support.
     * All AST information is parsed and filled.
     */
    Full = 1
}
/**
 * A parser for translating a given alphaTex source into an AST for further use
 * in the alphaTex importer, editors etc.
 * @public
 */
export declare class AlphaTexParser {
    readonly lexer: AlphaTexLexer;
    private _scoreNode;
    private _metaDataReader;
    /**
     * The parsing mode.
     */
    mode: AlphaTexParseMode;
    get lexerDiagnostics(): AlphaTexDiagnosticBag;
    readonly parserDiagnostics: AlphaTexDiagnosticBag;
    addParserDiagnostic(diagnostics: AlphaTexDiagnostic): void;
    /**
     * @internal
     */
    unexpectedToken(actual: AlphaTexAstNode | undefined, expected: AlphaTexNodeType[], abort: boolean): void;
    constructor(source: string);
    read(): AlphaTexScoreNode;
    private _score;
    private _bars;
    private _bar;
    private _barMetaData;
    private _barBeats;
    private _beat;
    private _beatDuration;
    private _beatDurationChange;
    private _beatContent;
    private _beatMultiplier;
    private _noteList;
    private _note;
    private static readonly _allowValuesAfterProperties;
    private _metaData;
    private _properties;
    private _property;
    argumentList(): AlphaTexArgumentList | undefined;
}
