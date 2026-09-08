import { type AlphaTexIdentifier, type AlphaTexMetaDataNode, type AlphaTexNumberLiteral, type AlphaTexPropertiesNode, type AlphaTexPropertyNode, type AlphaTexStringLiteral, type AlphaTexArgumentList, type IAlphaTexArgumentValue } from "./AlphaTexAst";
/**
 * AlphaTexNodeFactory (short name for less code)
 * @internal
 */
export declare class Atnf {
    static ident(text: string): AlphaTexIdentifier;
    static string(text: string): AlphaTexStringLiteral;
    static number(value: number): AlphaTexNumberLiteral;
    static meta(tag: string, args?: AlphaTexArgumentList, properties?: AlphaTexPropertiesNode): AlphaTexMetaDataNode;
    static identMeta(tag: string, value: string): AlphaTexMetaDataNode;
    static numberMeta(tag: string, value: number): AlphaTexMetaDataNode;
    static args(args: (IAlphaTexArgumentValue | undefined)[], parentheses?: boolean | undefined): AlphaTexArgumentList | undefined;
    static stringValue(text: string): AlphaTexArgumentList;
    static identValue(text: string): AlphaTexArgumentList;
    static numberValue(value: number): AlphaTexArgumentList;
    static props(properties: ([string, AlphaTexArgumentList | undefined] | undefined)[]): AlphaTexPropertiesNode;
    static prop(properties: AlphaTexPropertyNode[], identifier: string, args?: AlphaTexArgumentList): void;
}
