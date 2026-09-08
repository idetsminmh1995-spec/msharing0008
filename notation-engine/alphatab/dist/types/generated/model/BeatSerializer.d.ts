import { Beat } from "./../../model/Beat";
/**
 * @internal
 */
export declare class BeatSerializer {
    static fromJson(obj: Beat, m: unknown): void;
    static toJson(obj: Beat | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Beat, property: string, v: unknown): boolean;
}
