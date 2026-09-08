import { ScoreStaffConfig } from "./../../model/StaffConfigs";
/**
 * @internal
 */
export declare class ScoreStaffConfigSerializer {
    static fromJson(obj: ScoreStaffConfig, m: unknown): void;
    static toJson(obj: ScoreStaffConfig | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: ScoreStaffConfig, property: string, v: unknown): boolean;
}
