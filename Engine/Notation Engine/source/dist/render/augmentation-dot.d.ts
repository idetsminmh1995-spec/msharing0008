import { type DotPlacement } from '../geometry/augmentation-dot.js';
export interface RenderDotsOptions {
    /** The staff's bottom line, which a `DotPlacement.position` is measured from. */
    readonly staffBottomY: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws one note's (or chord's, or rest's) augmentation dots. */
export declare function renderAugmentationDots(placements: readonly DotPlacement[], options: RenderDotsOptions): string;
