import { NumberedStaffConfig } from "./../../model/StaffConfigs";
/**
 * @internal
 */
export declare class NumberedStaffConfigSerializer {
    static fromJson(obj: NumberedStaffConfig, m: unknown): void;
    static toJson(obj: NumberedStaffConfig | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: NumberedStaffConfig, property: string, v: unknown): boolean;
}
