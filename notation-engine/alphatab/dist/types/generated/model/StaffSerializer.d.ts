import { Staff } from "./../../model/Staff";
/**
 * @internal
 */
export declare class StaffSerializer {
    static fromJson(obj: Staff, m: unknown): void;
    static toJson(obj: Staff | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Staff, property: string, v: unknown): boolean;
}
