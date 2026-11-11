export interface RenderMetronomeMarkOptions {
    readonly x: number;
    /** The shared baseline. The note glyph straddles it (its notehead sits half above, half below) and the "= 120" sits ON it, exactly as a music symbol embedded in a line of text does. */
    readonly y: number;
    readonly color: string;
    /** The SMuFL font the note glyph (and its dot) is drawn in. */
    readonly musicFont: string;
    /** The ordinary text font the "= 120" is set in -- `config.fonts.textFont`. */
    readonly textFont: string;
    /** The text's size in staff spaces -- `config.fonts.sizes.tempo`. */
    readonly fontSize: number;
    /** A small horizontal gap inserted after the note glyph (and its dot, if any), before the "=" -- real engraving leaves visible space here rather than crowding the two together. */
    readonly noteToEqualsGap: number;
}
/**
 * The full metronome mark's total rendered width -- note glyph (+dot, if
 * any), the gap, then the "= 120" text. Exposed so a caller (Phase
 * 43/44's measure-width computation) can make the measure holding a
 * tempo mark wide enough for it, which the notes' own widths alone don't
 * guarantee: a narrow pickup measure with only a rest is otherwise not
 * wide enough to hold "quarter = 120" without the mark overrunning into
 * the next measure or a following barline.
 *
 * The text half is an ESTIMATE (`estimateTextWidth`) -- there is no font
 * to measure here -- and a deliberately generous one, since reserving a
 * little too much room is invisible and reserving too little is a
 * collision. Nothing is POSITIONED from it: see `renderMetronomeMark`.
 */
export declare function metronomeMarkWidth(noteGlyphName: string, dotGlyphName: string | undefined, beatsPerMinute: number, fontSize: number, noteToEqualsGap: number): number;
/**
 * Draws a full metronome mark: the note glyph (plus an augmentation dot
 * for a dotted beat unit) from the music font, then "= 120" as ordinary
 * text, all on one shared baseline.
 *
 * The number is ONE `<text>` element, not a digit per element. That is
 * the whole point of setting it in a text font: the font spaces its own
 * digits, so "= 115" cannot come out with its digits touching the way it
 * did while this was assembled out of SMuFL `fingering` glyphs advanced
 * by their ink widths (see `metronomeTempoText`).
 */
export declare function renderMetronomeMark(noteGlyphName: string, dotGlyphName: string | undefined, beatsPerMinute: number, options: RenderMetronomeMarkOptions): string;
