import { XmlNode } from "./XmlNode";
/**
 * @internal
 */
export declare class XmlDocument extends XmlNode {
    constructor();
    parse(xml: string): void;
    toString(): string;
    toFormattedString(indention?: string, xmlHeader?: boolean): string;
}
