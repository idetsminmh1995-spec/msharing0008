import { BeatStyle } from "./../../model/Beat";
/**
 * @internal
 */
export declare class BeatStyleSerializer {
    static fromJson(obj: BeatStyle, m: unknown): void;
    static toJson(obj: BeatStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: BeatStyle, property: string, v: unknown): boolean;
}
