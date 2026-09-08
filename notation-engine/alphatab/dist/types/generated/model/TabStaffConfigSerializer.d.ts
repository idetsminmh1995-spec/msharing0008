import { TabStaffConfig } from "./../../model/StaffConfigs";
/**
 * @internal
 */
export declare class TabStaffConfigSerializer {
    static fromJson(obj: TabStaffConfig, m: unknown): void;
    static toJson(obj: TabStaffConfig | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: TabStaffConfig, property: string, v: unknown): boolean;
}
