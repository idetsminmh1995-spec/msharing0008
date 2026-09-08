import type { Bar } from "./../model/Bar";
import type { Staff } from "./../model/Staff";
import type { Track } from "./../model/Track";
import type { BarRendererBase } from "./BarRendererBase";
import { BarRendererFactory } from "./BarRendererFactory";
import type { ScoreRenderer } from "./ScoreRenderer";
/**
 * This Factory produces NumberedBarRenderer instances
 * @internal
 */
export declare class NumberedBarRendererFactory extends BarRendererFactory {
    get staffId(): string;
    get cascadePriority(): number;
    create(renderer: ScoreRenderer, bar: Bar): BarRendererBase;
    canCreate(track: Track, staff: Staff): boolean;
}
