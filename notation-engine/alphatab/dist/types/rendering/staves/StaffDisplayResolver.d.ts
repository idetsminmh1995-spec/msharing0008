import type { ElementDisplay } from "./../../model/ElementDisplay";
import type { Staff } from "./../../model/Staff";
/**
 * Per-staff view required by {@link StaffDisplayResolver} to evaluate
 * placement decisions. Exposed as an interface so unit tests can supply
 * lightweight stand-ins without instantiating a full render pipeline.
 * {@link RenderStaff} implements this directly.
 * @internal
 */
export interface IStaffDisplayContext {
    readonly modelStaff: Staff;
    readonly cascadePriority: number;
    readonly systemIndex: number;
    readonly isCascadePrimary: boolean;
    readonly cascadeSiblings: Iterable<IStaffDisplayContext>;
}
/**
 * Helpers for the staff-placement cascade and the per-axis
 * {@link ElementDisplay} merge. Per-element resolution lives on the
 * renderer subclasses themselves.
 * @internal
 */
export declare class StaffDisplayResolver {
    private static readonly _fallback;
    /**
     * Per-axis fall-through: first defined value walking
     * per-bar → per-staff → score-wide → {@link _fallback}.
     */
    static merge(perBar: ElementDisplay | undefined, perStaff: ElementDisplay | undefined, stylesheet: ElementDisplay | undefined): ElementDisplay;
    static isPrimaryForElement(staff: IStaffDisplayContext, display: ElementDisplay): boolean;
    static computeCascadePrimary(staff: IStaffDisplayContext): boolean;
}
