import { type AlphaTexAstNode, type AlphaTexAstNodeLocation, type AlphaTexNumberLiteral } from "./AlphaTexAst";
import { AlphaTexDiagnosticBag } from "./AlphaTexShared";
/**
 * @public
 */
export declare class AlphaTexLexer {
    private static readonly _eof;
    private readonly _codepoints;
    private _codepoint;
    private _offset;
    private _line;
    private _col;
    fatalError: boolean;
    private _tokenStart;
    private _leadingComments;
    private _trailingCommentNode;
    private _previousToken;
    private _peekedToken;
    readonly lexerDiagnostics: AlphaTexDiagnosticBag;
    constructor(input: string);
    peekToken(): AlphaTexAstNode | undefined;
    extendToFloat(peekedNode: AlphaTexNumberLiteral): AlphaTexNumberLiteral;
    advance(): void;
    private _nextCodepoint;
    previousTokenEndLocation(): AlphaTexAstNodeLocation;
    currentTokenLocation(): AlphaTexAstNodeLocation;
    private _currentLexerLocation;
    private _readToken;
    private _comment;
    private static _terminalTokens;
    private _metaCommand;
    private _token;
    private _string;
    private _multiLineComment;
    private _numberOrIdentifier;
    private _singleLineComment;
    private _whitespace;
    private static _isDigit;
    private static _buildNonIdentifierChars;
    private static readonly _nonIdentifierChars;
    private static _isIdentifierCharacter;
    private static _isWhiteSpace;
}
