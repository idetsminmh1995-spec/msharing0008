/**
 * @internal
 */
export declare enum XmlNodeType {
    None = 0,
    Element = 1,
    Text = 2,
    CDATA = 3,
    Document = 4,
    DocumentType = 5,
    Comment = 6
}
/**
 * @internal
 */
export declare class XmlNode {
    nodeType: XmlNodeType;
    localName: string | null;
    value: string | null;
    childNodes: XmlNode[];
    attributes: Map<string, string>;
    firstChild: XmlNode | null;
    firstElement: XmlNode | null;
    childElements(): Generator<XmlNode, void, unknown>;
    addChild(node: XmlNode): void;
    getAttribute(name: string, defaultValue?: string): string;
    getElementsByTagName(name: string, recursive?: boolean): XmlNode[];
    private _searchElementsByTagName;
    findChildElement(name: string): XmlNode | null;
    addElement(name: string): XmlNode;
    get innerText(): string;
    set innerText(value: string);
    setCData(s: string): void;
}
