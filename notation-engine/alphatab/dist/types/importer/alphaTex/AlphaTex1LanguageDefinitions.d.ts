import type { AlphaTexNodeType } from "./AlphaTexAst";
import type { ArgumentListParseTypesMode } from "./AlphaTexShared";
/**
 * @record
 * @internal
 */
export interface AlphaTexParameterDefinition {
    expectedTypes: Set<AlphaTexNodeType>;
    parseMode: ArgumentListParseTypesMode;
    allowedValues?: Set<string>;
    reservedIdentifiers?: Set<string>;
}
/**
 * @record
 * @internal
 */
export interface AlphaTexSignatureDefinition {
    isStrict: boolean;
    parameters: AlphaTexParameterDefinition[];
}
/**
 * @internal
 */
export declare class AlphaTex1LanguageDefinitions {
    private static _param;
    private static _simple;
    private static _metaProps;
    private static _props;
    private static _signatures;
    static readonly scoreMetaDataSignatures: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly staffMetaDataSignatures: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly structuralMetaDataSignatures: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly barMetaDataSignatures: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly metaDataProperties: Map<string, Map<string, AlphaTexSignatureDefinition[] | null> | null>;
    static readonly metaDataSignatures: Map<string, AlphaTexSignatureDefinition[] | null>[];
    static readonly durationChangeProperties: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly beatProperties: Map<string, AlphaTexSignatureDefinition[] | null>;
    static readonly noteProperties: Map<string, AlphaTexSignatureDefinition[] | null>;
}
