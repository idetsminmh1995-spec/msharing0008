import type { LedgerLine } from '../geometry/ledger-line.js';
export interface RenderLedgerLinesOptions {
    /** X center of the notehead the ledger lines belong to. */
    readonly x: number;
    readonly noteheadWidth: number;
    /** Y-coordinate of the staff's bottom line (Phase 9/10 convention). */
    readonly staffBottomY: number;
    /** How far each line extends beyond the notehead on each side -- typically Phase 5's getEngravingDefault('legerLineExtension'). */
    readonly extension: number;
    /** Typically Phase 5's getEngravingDefault('legerLineThickness'). */
    readonly thickness: number;
    readonly color: string;
}
/** Draws every ledger line in the list, each spanning the notehead's width plus the configured extension on both sides. */
export declare function renderLedgerLines(lines: readonly LedgerLine[], options: RenderLedgerLinesOptions): string;
