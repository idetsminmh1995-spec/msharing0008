import type { Bar } from "./../model/Bar";
import type { Staff } from "./../model/Staff";
import type { Track } from "./../model/Track";
import type { BarRendererBase } from "./BarRendererBase";
import type { EffectInfo } from "./EffectInfo";
import type { ScoreRenderer } from "./ScoreRenderer";
/**
 * The different modes on how effect bands are applied to bar renderers.
 * @internal
 */
export declare enum EffectBandMode {
    /**
     * The band is owned by the specific renderer.
     * If the owning renderer is not shown, the band will not be shown either.
     * The band is shown on top of the main renderer.
     */
    OwnedTop = 0,
    /**
     * The band is owned by the specific renderer.
     * If the owning renderer is not shown, the band will not be shown either.
     * The band is shown on bottom of the main renderer.
     */
    OwnedBottom = 1,
    /**
     * The band is shared across renderers.
     * If the owning renderer is shown, the band is shown on top the main renderer.
     * If the renderer is not shown, the band is shown on the top of the next renderer which is visible.
     *
     * If no visible render follows, they are added to the bottom of the previous visible renderer.
     */
    SharedTop = 2,
    /**
     * The band is shared across renderers.
     * If the owning renderer is shown, the band is shown on bottom of the main renderer.
     * If the owning renderer is not shown, the band is shown on the **bottom** of the next renderer which is visible.
     *
     * If no visible render follows, they are added to the bottom of the previous visible renderer.
     */
    SharedBottom = 3
}
/**
 * @record
 * @internal
 */
export interface EffectBandInfo {
    mode: EffectBandMode;
    effect: EffectInfo;
    /**
     * Visual-stack position within {@link EffectInfo.placementCategory}.
     * Higher value = closer to staff. Defaults to the declaration index.
     */
    order?: number;
    shouldCreate?: (staff: Staff) => boolean;
}
/**
 * This is the base public class for creating factories providing BarRenderers
 * @internal
 */
export declare abstract class BarRendererFactory {
    hideOnMultiTrack: boolean;
    hideOnPercussionTrack: boolean;
    effectBands: EffectBandInfo[];
    abstract get staffId(): string;
    /**
     * Priority in the staff-display cascade. Lower wins. The lowest-priority
     * render-staff among siblings sharing the same model {@link Staff}
     * is the {@link StaffPlacement.Primary} painter.
     */
    abstract get cascadePriority(): number;
    constructor(effectBands: EffectBandInfo[]);
    canCreate(_track: Track, staff: Staff): boolean;
    abstract create(renderer: ScoreRenderer, bar: Bar): BarRendererBase;
}
