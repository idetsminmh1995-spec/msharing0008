import { SlashStaffConfig } from "./../../model/StaffConfigs";
/**
 * @internal
 */
export declare class SlashStaffConfigSerializer {
    static fromJson(obj: SlashStaffConfig, m: unknown): void;
    static toJson(obj: SlashStaffConfig | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: SlashStaffConfig, property: string, v: unknown): boolean;
}
