import { Track } from "./../../model/Track";
/**
 * @internal
 */
export declare class TrackSerializer {
    static fromJson(obj: Track, m: unknown): void;
    static toJson(obj: Track | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Track, property: string, v: unknown): boolean;
}
