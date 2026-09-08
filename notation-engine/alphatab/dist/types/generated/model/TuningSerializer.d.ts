import { Tuning } from "./../../model/Tuning";
/**
 * @internal
 */
export declare class TuningSerializer {
    static fromJson(obj: Tuning, m: unknown): void;
    static toJson(obj: Tuning | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Tuning, property: string, v: unknown): boolean;
}
