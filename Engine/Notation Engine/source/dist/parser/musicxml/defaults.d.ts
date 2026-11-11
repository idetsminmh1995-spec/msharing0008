/**
 * defaults.ts -- `<defaults>` and `<credit>`: what the file says about
 * its own appearance, and what it says about itself.
 *
 * Everything under `<defaults>` is the exporting program stating the
 * engraving it used, in TENTHS. A tenth is a tenth of the distance
 * between two staff lines, which makes the conversion to this engine's
 * own unit a division by ten and nothing else: `<line-width
 * type="staff">1.1</line-width>` is a staff line 0.11 staff spaces
 * thick, and `<staff-distance>65</staff-distance>` is 6.5 of them.
 *
 * `<scaling>` is the one piece that is NOT in tenths -- it is what ties
 * tenths to the physical page ("40 tenths is 7 millimetres"), which is
 * the only number here a renderer drawing to a screen can ignore. It is
 * parsed anyway: a host exporting to PDF at the file's own size needs
 * it, and §10.7's rule is that nothing in the file is dropped silently.
 *
 * None of this overrides the HOST. `config` still wins, because a page
 * the host has themed is the host's decision; the file's own numbers sit
 * between the host's config and the music font's built-in defaults.
 */
/** How many MusicXML tenths make one staff space. Fixed by the format, not by any file. */
export declare const TENTHS_PER_STAFF_SPACE = 10;
/** Tenths to staff spaces. */
export declare function tenthsToStaffSpaces(tenths: number): number;
/**
 * The `<line-width type="...">` values this engine can actually use,
 * mapped to the name it knows them by. A type the engine has no use for
 * is still parsed into `lineWidths` -- this map only names the ones
 * that reach the drawing.
 */
export interface ScoreLineWidths {
    readonly staff?: number;
    readonly stem?: number;
    readonly beam?: number;
    readonly leger?: number;
    readonly lightBarline?: number;
    readonly heavyBarline?: number;
    readonly slurMiddle?: number;
    readonly slurTip?: number;
    readonly tieMiddle?: number;
    readonly tieTip?: number;
    readonly tupletBracket?: number;
    readonly wedge?: number;
    readonly ending?: number;
    readonly bracket?: number;
}
export interface ScoreScaling {
    /** Millimetres on paper that `tenths` tenths measure. */
    readonly millimetres: number;
    readonly tenths: number;
    /** One staff space, in millimetres -- what the two numbers above are actually for. */
    readonly staffSpaceMm: number;
}
/** A `<page-layout>`, in staff spaces. */
export interface ScorePageLayout {
    readonly width?: number;
    readonly height?: number;
    readonly leftMargin?: number;
    readonly rightMargin?: number;
    readonly topMargin?: number;
    readonly bottomMargin?: number;
}
export interface ScoreFont {
    readonly family?: string;
    /** In points, as the file writes it -- a text size, not a staff-space measurement. */
    readonly size?: number;
}
export interface ScoreDefaults {
    readonly scaling?: ScoreScaling;
    readonly pageLayout?: ScorePageLayout;
    /** In staff spaces, converted from the file's tenths. */
    readonly lineWidths: ScoreLineWidths;
    /** `<note-size type="...">`, as a FRACTION of full size (the file writes a percentage). */
    readonly noteSizes: Readonly<Record<string, number>>;
    readonly musicFont?: ScoreFont;
    readonly wordFont?: ScoreFont;
    readonly lyricFont?: ScoreFont;
}
/** What the score calls itself: `<work>` and `<identification><creator>`. */
export interface ScoreIdentity {
    readonly workTitle?: string;
    readonly workNumber?: string;
    readonly movementTitle?: string;
    readonly movementNumber?: string;
    /** `<creator type="composer">` and friends, keyed by that `type` ('composer', 'lyricist', ...). */
    readonly creators: Readonly<Record<string, string>>;
    /** `<rights>`, in document order. */
    readonly rights: readonly string[];
    /** The software that wrote the file, from `<encoding><software>`. */
    readonly software: readonly string[];
}
/**
 * One `<credit>` -- a piece of text the file places on the page itself
 * (its title block, as the exporting program laid it out).
 *
 * Kept with its stated position in staff spaces so a host can place it
 * where the file did, and with its `type` so a host that would rather
 * lay the page out itself can still tell a title from a composer line.
 */
export interface ScoreCredit {
    readonly page: number;
    readonly types: readonly string[];
    readonly words: string;
    readonly x?: number;
    readonly y?: number;
    readonly justify?: string;
    readonly valign?: string;
    readonly fontSize?: number;
}
/** Parses `<defaults>`, or returns undefined when the file has none (most hand-written files do not). */
export declare function parseDefaults(root: Element): ScoreDefaults | undefined;
/** Parses `<work>` and `<identification>` -- what the score calls itself and who wrote it. */
export declare function parseIdentity(root: Element): ScoreIdentity;
/** Parses every `<credit>` -- the text the file places on its own title page. */
export declare function parseCredits(root: Element): readonly ScoreCredit[];
/**
 * The `<system-layout>`/`<staff-layout>` one `<print>` carries, in staff
 * spaces. Returns undefined when it carries neither, which is the common
 * case for a `<print>` that only asks for a system break.
 *
 * A `<staff-layout>`'s `<staff-distance>` is the gap ABOVE that staff,
 * which is why it is keyed by the staff NUMBER rather than returned as
 * one value: on a grand staff only staff 2 states one, and it means the
 * distance from staff 1 down to staff 2.
 */
export declare function parsePrintLayout(printEl: Element): {
    staffDistances?: Readonly<Record<number, number>>;
    systemDistance?: number;
    topSystemDistance?: number;
    systemLeftMargin?: number;
    systemRightMargin?: number;
} | undefined;
