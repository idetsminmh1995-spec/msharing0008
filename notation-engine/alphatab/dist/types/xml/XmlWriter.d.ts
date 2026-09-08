import { type XmlNode } from "./XmlNode";
/**
 * @internal
 */
export declare class XmlWriter {
    private _result;
    private _indention;
    private _xmlHeader;
    private _isStartOfLine;
    private _currentIndention;
    constructor(indention: string, xmlHeader: boolean);
    writeNode(xml: XmlNode): void;
    private _unindend;
    private _indent;
    private _writeAttributeValue;
    static write(xml: XmlNode, indention: string, xmlHeader: boolean): string;
    private _write;
    private _writeLine;
    toString(): string;
}
