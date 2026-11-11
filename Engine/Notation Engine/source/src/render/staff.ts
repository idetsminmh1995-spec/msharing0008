import type { StaffGeometry } from '../geometry/staff.js';
import { svgGroup, svgLine } from './svg-primitives.js';

export interface RenderStaffOptions {
  /** Left edge of the staff, in staff-space units. */
  readonly x: number;
  /** Y-coordinate of the staff's BOTTOM line -- matches StaffGeometry's own y=0 reference, so this one number positions every line. */
  readonly y: number;
  /** How far the staff lines extend horizontally, in staff-space units. */
  readonly width: number;
  readonly color: string;
  /** Typically Phase 5's getEngravingDefault('staffLineThickness'). */
  readonly lineThickness: number;
}

/** Draws every line of a staff (already computed via computeStaffGeometry) as one <g> of <line> elements. */
export function renderStaff(geometry: StaffGeometry, options: RenderStaffOptions): string {
  const { x, y, width, color, lineThickness } = options;
  const lines = geometry.lineYPositions.map((lineY) =>
    svgLine(x, y + lineY, x + width, y + lineY, { stroke: color, 'stroke-width': lineThickness }),
  );
  return svgGroup(lines);
}
