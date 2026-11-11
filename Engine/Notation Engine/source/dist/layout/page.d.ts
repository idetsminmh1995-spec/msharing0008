import type { PageConfig, SpacingConfig } from '../config/config.js';
/**
 * §16.2: "Measures are packed into systems until the next measure would
 * exceed the usable width, then a system break occurs and the
 * completed system is justified (§14.3). Systems are packed onto pages
 * until the next system would exceed usable height, then a page break
 * occurs." Also: "Respects explicit `<print new-system="yes">`/
 * `new-page="yes">` from MusicXML."
 */
export interface PageMeasureInput {
    readonly measureNumber: number;
    readonly width: number;
    /** From `<print new-system="yes">` on this measure -- forces a system break BEFORE this measure, regardless of remaining width. */
    readonly forceNewSystem?: boolean;
    /** From `<print new-page="yes">` on this measure -- forces a page break BEFORE this measure (which also forces a system break). */
    readonly forceNewPage?: boolean;
}
export interface PageSystemMeasureLayout {
    readonly measureNumber: number;
    readonly x: number;
    readonly width: number;
}
export interface PageSystem {
    readonly measures: readonly PageSystemMeasureLayout[];
}
export interface Page {
    readonly systems: readonly PageSystem[];
}
export interface PageLayout {
    readonly pages: readonly Page[];
    readonly usableWidth: number;
    readonly usableHeight: number;
}
/**
 * §16.2's full algorithm. `systemHeight` is a single fixed value applied
 * to every system -- a stated simplification; a real score with a grand
 * staff on some systems and a single staff on others would need a
 * per-system height, not yet computed here.
 *
 * `§14.3`'s own policy that "the final system of a piece is not
 * stretched (ragged-right)" is applied to the literal last system of
 * the whole piece (the last system on the last page), not the last
 * system of each individual page -- a page break is not the end of the
 * piece.
 */
export declare function computePageLayout(measures: readonly PageMeasureInput[], systemHeight: number, config: PageConfig, spacingConfig: SpacingConfig): PageLayout;
