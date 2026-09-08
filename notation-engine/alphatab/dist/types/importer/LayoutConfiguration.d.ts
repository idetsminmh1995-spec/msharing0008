import type { Score } from "./../model/Score";
import type { PartConfiguration } from "./PartConfiguration";
/**
 * @internal
 */
declare class LayoutConfigurationScoreView {
    trackViewGroups: LayoutConfigurationTrackViewGroup[];
}
/**
 * @internal
 */
declare class LayoutConfigurationTrackViewGroup {
    isVisible: boolean;
}
/**
 * @internal
 */
declare enum GuitarProView {
    PageVertical = 0,
    PageGrid = 1,
    PageParchment = 2,
    ScreenVertical = 3,
    ScreenHorizontal = 4,
    PageHorizontal = 5
}
/**
 * @internal
 */
export declare class LayoutConfiguration {
    zoomLevel: number;
    view: GuitarProView;
    muiltiVoiceCursor: boolean;
    scoreViews: LayoutConfigurationScoreView[];
    constructor(partConfiguration: PartConfiguration, layoutConfigurationData: Uint8Array);
    apply(score: Score): void;
    static writeForScore(score: Score): Uint8Array;
}
export {};
