import type { StaffGeometry } from '../geometry/staff.js';
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
export declare function renderStaff(geometry: StaffGeometry, options: RenderStaffOptions): string;
