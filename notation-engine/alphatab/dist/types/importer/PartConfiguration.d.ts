import type { Score } from "./../model/Score";
/**
 * @internal
 */
declare class PartConfigurationScoreView {
    isMultiRest: boolean;
    trackViewGroups: PartConfigurationTrackViewGroup[];
}
/**
 * @internal
 */
declare class PartConfigurationTrackViewGroup {
    showNumbered: boolean;
    showSlash: boolean;
    showStandardNotation: boolean;
    showTablature: boolean;
}
/**
 * @internal
 */
export declare class PartConfiguration {
    scoreViews: PartConfigurationScoreView[];
    apply(score: Score): void;
    constructor(partConfigurationData: Uint8Array);
    static writeForScore(score: Score): Uint8Array;
}
export {};
