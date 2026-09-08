import { TrackStyle } from "./../../model/Track";
/**
 * @internal
 */
export declare class TrackStyleSerializer {
    static fromJson(obj: TrackStyle, m: unknown): void;
    static toJson(obj: TrackStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: TrackStyle, property: string, v: unknown): boolean;
}
