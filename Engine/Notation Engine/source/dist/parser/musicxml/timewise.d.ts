/**
 * §10.6: `<score-timewise>` is the rarely-used alternative document
 * order -- measures on the outside, parts nested inside each measure
 * (the mirror image of `<score-partwise>`'s part-on-the-outside shape).
 * Converts to partwise on load so the rest of the parser only ever sees
 * one shape -- a mechanical transposition of the nesting, not a musical
 * transformation: every part/measure/note element is preserved exactly,
 * only the grouping changes.
 *
 * Parts are collected in the order their id is FIRST seen (matching
 * their natural left-to-right appearance across the timewise document's
 * measures), since `<score-timewise>` has no single place listing part
 * order the way `<part-list>` does for content -- `<part-list>` itself
 * is copied over unchanged either way.
 */
export declare function convertTimewiseToPartwise(timewiseRoot: Element): Element;
