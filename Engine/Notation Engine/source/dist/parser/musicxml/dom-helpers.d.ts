/** Only the ELEMENT children of a node (skips text/comment nodes). */
export declare function childElements(el: Element): Element[];
/** The first child element with a given tag name, if any. */
export declare function firstChildNamed(el: Element, name: string): Element | undefined;
/** Every child element with a given tag name, in document order. */
export declare function childrenNamed(el: Element, name: string): Element[];
/** Trimmed text content of an element, or undefined if the element itself is undefined. */
export declare function textOf(el: Element | undefined): string | undefined;
/** Text content parsed as an integer, or undefined if missing/unparseable. */
export declare function intOf(el: Element | undefined): number | undefined;
/** Text content parsed as an XML decimal, including fractional semitone values. */
export declare function numberOf(el: Element | undefined): number | undefined;
/** An attribute's value, or undefined if absent. */
export declare function attrOf(el: Element, name: string): string | undefined;
