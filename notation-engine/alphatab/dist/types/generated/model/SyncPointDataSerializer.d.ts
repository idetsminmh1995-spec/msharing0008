import { SyncPointData } from "./../../model/Automation";
/**
 * @internal
 */
export declare class SyncPointDataSerializer {
    static fromJson(obj: SyncPointData, m: unknown): void;
    static toJson(obj: SyncPointData | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: SyncPointData, property: string, v: unknown): boolean;
}
