import { ScoreBarOverride } from "./../../model/BarOverrides";
/**
 * @internal
 */
export declare class ScoreBarOverrideSerializer {
    static fromJson(obj: ScoreBarOverride, m: unknown): void;
    static toJson(obj: ScoreBarOverride | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: ScoreBarOverride, property: string, v: unknown): boolean;
}
