import { NumberedBarOverride } from "./../../model/BarOverrides";
/**
 * @internal
 */
export declare class NumberedBarOverrideSerializer {
    static fromJson(obj: NumberedBarOverride, m: unknown): void;
    static toJson(obj: NumberedBarOverride | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: NumberedBarOverride, property: string, v: unknown): boolean;
}
