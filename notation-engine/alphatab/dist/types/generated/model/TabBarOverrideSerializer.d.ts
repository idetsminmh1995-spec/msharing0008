import { TabBarOverride } from "./../../model/BarOverrides";
/**
 * @internal
 */
export declare class TabBarOverrideSerializer {
    static fromJson(obj: TabBarOverride, m: unknown): void;
    static toJson(obj: TabBarOverride | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: TabBarOverride, property: string, v: unknown): boolean;
}
