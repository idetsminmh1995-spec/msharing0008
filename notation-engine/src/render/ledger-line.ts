import type { LedgerLine } from '../geometry/ledger-line.js';
import { svgGroup, svgLine } from './svg-primitives.js';

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
export function renderLedgerLines(
  lines: readonly LedgerLine[],
  options: RenderLedgerLinesOptions,
): string {
  const { x, noteheadWidth, staffBottomY, extension, thickness, color } = options;
  const x1 = x - noteheadWidth / 2 - extension;
  const x2 = x + noteheadWidth / 2 + extension;
  return svgGroup(
    lines.map((line) =>
      svgLine(x1, staffBottomY + line.y, x2, staffBottomY + line.y, {
        stroke: color,
        'stroke-width': thickness,
      }),
    ),
  );
}
