import { type AlphaTexSignatureDefinition } from "./AlphaTex1LanguageDefinitions";
import { type AlphaTexArgumentList, type AlphaTexMetaDataTagNode, type AlphaTexNumberLiteral, type AlphaTexPropertyNode, type IAlphaTexArgumentValue, type IAlphaTexAstNode } from "./AlphaTexAst";
import { type AlphaTexParser } from "./AlphaTexParser";
import type { IAlphaTexMetaDataReader } from "./IAlphaTexMetaDataReader";
/**
 * @internal
 * @record
 */
export interface SignatureResolutionInfo {
    signature: AlphaTexSignatureDefinition;
    parameterIndex: number;
    parameterHasValues: boolean;
    parameterValueMatches: number;
}
/**
 * @internal
 */
export declare class AlphaTex1MetaDataReader implements IAlphaTexMetaDataReader {
    static readonly instance: AlphaTex1MetaDataReader;
    private static readonly _argumentTypes;
    hasMetaDataArguments(metaData: AlphaTexMetaDataTagNode): boolean;
    readMetaDataArguments(parser: AlphaTexParser, metaData: AlphaTexMetaDataTagNode): AlphaTexArgumentList | undefined;
    readMetaDataPropertyArguments(parser: AlphaTexParser, metaData: AlphaTexMetaDataTagNode, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readBeatPropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readDurationChangePropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readNotePropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    private _readPropertyArguments;
    private _readArguments;
    private _validateArguments;
    private _createArgumentList;
    private _filterCandidates;
    static sortCandidates(allCandidates: [number, SignatureResolutionInfo][]): void;
    private _skipRemainingArguments;
    private static _hasExactMatch;
    static filterIncompleteCandidates(candidates: Map<number, SignatureResolutionInfo>): void;
    static generateSignaturesFromArguments(args: IAlphaTexArgumentValue[] | undefined): string;
    static generateSignatures(signatures: AlphaTexSignatureDefinition[], ambiguousOverloads?: Set<number>): string;
    private static _generateSignature;
    private static _generateSignatureParameter;
    static filterSignatureCandidates(candidates: Map<number, SignatureResolutionInfo>, value: IAlphaTexAstNode, valueCanBeEndOfList: boolean, trackValue: (value: IAlphaTexAstNode, signature: number) => void, extendToFloat?: (value: AlphaTexNumberLiteral) => void): boolean;
    private static _checkArgumentMatch;
    private static _isValueListMatch;
}
