import type { AlphaTexArgumentList, AlphaTexMetaDataTagNode, AlphaTexPropertyNode } from "./AlphaTexAst";
import type { AlphaTexParser } from "./AlphaTexParser";
/**
 * @internal
 */
export interface IAlphaTexMetaDataReader {
    hasMetaDataArguments(metaData: AlphaTexMetaDataTagNode): boolean;
    readMetaDataArguments(parser: AlphaTexParser, metaData: AlphaTexMetaDataTagNode): AlphaTexArgumentList | undefined;
    readMetaDataPropertyArguments(parser: AlphaTexParser, metaData: AlphaTexMetaDataTagNode, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readBeatPropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readDurationChangePropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
    readNotePropertyArguments(parser: AlphaTexParser, property: AlphaTexPropertyNode): AlphaTexArgumentList | undefined;
}
