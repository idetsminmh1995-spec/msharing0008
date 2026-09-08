import type { MasterBar } from "./../../model/MasterBar";
import type { RenderHints } from "./../IScoreRenderer";
import { ScoreLayout } from "./ScoreLayout";
import type { MasterBarsRenderers } from "./../staves/MasterBarsRenderers";
import type { StaffSystem } from "./../staves/StaffSystem";
/**
 * @internal
 */
export declare class HorizontalScreenLayoutPartialInfo {
    x: number;
    width: number;
    masterBars: MasterBar[];
    results: MasterBarsRenderers[];
}
/**
 * This layout arranges the bars all horizontally
 * @internal
 */
export declare class HorizontalScreenLayout extends ScoreLayout {
    private _system;
    private _systems;
    get systems(): StaffSystem[];
    get name(): string;
    get supportsResize(): boolean;
    get firstBarX(): number;
    doResize(): void;
    doUpdateForBars(_renderHints: RenderHints): boolean;
    protected doLayoutAndRender(renderHints: RenderHints | undefined): void;
    private _scaleBars;
    private _completePartial;
    private _finalizeStaffSystem;
    private _alignRenderers;
}
