/** One `<clef>`'s own sign/line, keyed by staff number in AttributesUpdate.clefsByStaff. */
export interface ClefSpec {
    readonly sign: string;
    readonly line?: number;
}
/**
 * The running per-part state an `<attributes>` element updates. `<attributes>`
 * can legally appear mid-measure (§10.8), not only at a measure's start, so
 * this is applied as a delta merged into whatever was already in effect --
 * never assumed to be the complete state on its own.
 */
export interface AttributesUpdate {
    readonly divisions?: number;
    readonly fifths?: number;
    /**
     * `<key><mode>`, lower-cased: "major", "minor", or one of the church
     * modes MusicXML allows. Kept because `fifths` ALONE cannot name a
     * key -- one sharp is G major and E minor, and the file is the only
     * thing that knows which. Absent when the file does not say.
     */
    readonly mode?: string;
    readonly timeNumerator?: number;
    readonly timeDenominator?: number;
    /**
     * STATUS C3/§9.4: an ADDITIVE meter's own written form ("3+2+2"), when
     * the file writes one. `timeNumerator` stays the numeric total (7),
     * which is what every beat/tick calculation in the engine needs; this
     * is only what gets DRAWN. Phase 12 could already render this; nothing
     * read it from a file until now.
     */
    readonly timeNumeratorDisplay?: string;
    readonly clefSign?: string;
    readonly clefLine?: number;
    /** §9.18/Integration A: how many staves this part has (piano = 2). Absent means one staff. */
    readonly staves?: number;
    /**
     * Each staff's own line count, keyed by staff number, from
     * `<staff-details><staff-lines>`. Absent means the ordinary 5. A guitar
     * tab staff declares 6; some percussion parts declare 1. Read from the
     * file rather than inferred from the clef, since the file is the
     * authority on its own staff and a clef does not imply a line count.
     */
    readonly staffLinesByStaff?: Readonly<Record<number, number>>;
    /**
     * Every `<clef>` in this element, keyed by its `number` attribute (an
     * unnumbered clef is staff 1). A multi-staff part declares one clef per
     * staff -- keeping only the first, as this parser did before Integration A,
     * is exactly what collapsed a piano's bass staff onto its treble staff.
     */
    readonly clefsByStaff?: Readonly<Record<number, ClefSpec>>;
}
/** Parses one `<attributes>` element. Clefs are captured per staff (`clefsByStaff`); `clefSign`/`clefLine` remain as staff 1's own clef, the single-staff case every caller before Integration A assumed. */
export declare function parseAttributesElement(attributesEl: Element): AttributesUpdate;
