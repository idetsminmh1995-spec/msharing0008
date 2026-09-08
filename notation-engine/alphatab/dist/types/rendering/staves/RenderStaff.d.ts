import type { Bar } from "./../../model/Bar";
import type { Staff } from "./../../model/Staff";
import type { ICanvas } from "./../../platform/ICanvas";
import type { BarRendererBase } from "./../BarRendererBase";
import { type BarRendererFactory, type EffectBandInfo } from "./../BarRendererFactory";
import { EffectSystemPlacement } from "./../EffectSystemPlacement";
import { StaffSystemSkyline } from "./../skyline/StaffSystemSkyline";
import type { BarLayoutingInfo } from "./BarLayoutingInfo";
import { type IStaffDisplayContext } from "./StaffDisplayResolver";
import type { StaffSystem } from "./StaffSystem";
import type { StaffTrackGroup } from "./StaffTrackGroup";
/**
 * A Staff represents a single line within a StaffSystem.
 * It stores BarRenderer instances created from a given factory.
 * @internal
 */
export declare class RenderStaff implements IStaffDisplayContext {
    private _factory;
    private _sharedLayoutData;
    staffTrackGroup: StaffTrackGroup;
    system: StaffSystem;
    barRenderers: BarRendererBase[];
    x: number;
    y: number;
    height: number;
    index: number;
    staffIndex: number;
    isVisible: boolean;
    private _emptyBarCount;
    get isFirstInSystem(): boolean;
    topEffectInfos: EffectBandInfo[];
    bottomEffectInfos: EffectBandInfo[];
    /**
     * This is the index of the track being rendered. This is not the index of the track within the model,
     * but the n-th track being rendered. It is the index of the {@link ScoreRenderer.tracks} array defining
     * which tracks should be rendered.
     * For single-track rendering this will always be zero.
     */
    trackIndex: number;
    modelStaff: Staff;
    get staffId(): string;
    get cascadePriority(): number;
    private _isCascadePrimary;
    private _isCascadePrimaryComputed;
    get isCascadePrimary(): boolean;
    get systemIndex(): number;
    get cascadeSiblings(): Iterable<IStaffDisplayContext>;
    /**
     * This is the visual offset from top where the
     * Staff contents actually start. Used for grouping
     * using a accolade
     */
    staffTop: number;
    topPadding: number;
    bottomPadding: number;
    /**
     * This is the visual offset from top where the
     * Staff contents actually ends. Used for grouping
     * using a accolade
     */
    staffBottom: number;
    get contentTop(): number;
    get contentBottom(): number;
    constructor(system: StaffSystem, trackIndex: number, staff: Staff, factory: BarRendererFactory);
    getSharedLayoutData<T>(key: string, def: T): T;
    setSharedLayoutData<T>(key: string, def: T): void;
    registerStaffTop(offset: number): void;
    registerStaffBottom(offset: number): void;
    addBarRenderer(renderer: BarRendererBase): void;
    private _updateVisibility;
    addBar(bar: Bar, layoutingInfo: BarLayoutingInfo, additionalMultiBarsRestBars: Bar[] | null): void;
    revertLastBar(): BarRendererBase;
    resetSharedLayoutData(): void;
    topOverflow: number;
    registerOverflowTop(overflow: number): void;
    bottomOverflow: number;
    registerOverflowBottom(overflow: number): void;
    private _systemSkyline;
    private _effectPlacement;
    get effectPlacement(): EffectSystemPlacement;
    get systemSkyline(): StaffSystemSkyline;
    private _unionBarLocalIntoStaffSkyline;
    /**
     * Performs an early calculation of the expected staff height for the size calculation in the
     * accolade (e.g. for braces). This typically happens after the first bar renderers were created
     * and we can do an early placement of the render staffs.
     */
    calculateHeightForAccolade(): void;
    private _applyStaffPaddings;
    finalizeStaff(): void;
    paint(cx: number, cy: number, canvas: ICanvas, startIndex: number, count: number): void;
}
