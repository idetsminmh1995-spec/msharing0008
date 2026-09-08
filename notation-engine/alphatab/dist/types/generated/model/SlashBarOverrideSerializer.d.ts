import { SlashBarOverride } from "./../../model/BarOverrides";
/**
 * @internal
 */
export declare class SlashBarOverrideSerializer {
    static fromJson(obj: SlashBarOverride, m: unknown): void;
    static toJson(obj: SlashBarOverride | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: SlashBarOverride, property: string, v: unknown): boolean;
}
