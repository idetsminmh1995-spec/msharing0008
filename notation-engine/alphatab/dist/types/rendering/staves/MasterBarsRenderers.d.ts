import type { MasterBar } from "./../../model/MasterBar";
import type { BarRendererBase } from "./../BarRendererBase";
import type { BarLayoutingInfo } from "./BarLayoutingInfo";
/**
 * This container represents a single column of bar renderers independent from any staves.
 * This container can be used to reorganize renderers into a new staves.
 * @internal
 */
export declare class MasterBarsRenderers {
    width: number;
    isLinkedToPrevious: boolean;
    canWrap: boolean;
    masterBar: MasterBar;
    additionalMultiBarRestIndexes: number[] | null;
    /**
     * Max fixed overhead (prefix + postfix glyph width) across all staves of this bar.
     * Used by the layout-mode horizontal scaling pass to carve out the fixed-overhead bucket
     * before distributing staff width across bars.
     */
    maxFixedOverhead: number;
    /**
     * Max natural content width (computedWidth - fixedOverhead) across all staves of this bar.
     * Used as the bar weight when the layout ignores {@link MasterBar.displayScale} (e.g.
     * Page layout with `SystemsLayoutMode.Automatic`).
     */
    maxContentWidth: number;
    get lastMasterBarIndex(): number;
    renderers: BarRendererBase[];
    layoutingInfo: BarLayoutingInfo;
}
