import { PlaybackInformation } from "./../../model/PlaybackInformation";
/**
 * @internal
 */
export declare class PlaybackInformationSerializer {
    static fromJson(obj: PlaybackInformation, m: unknown): void;
    static toJson(obj: PlaybackInformation | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: PlaybackInformation, property: string, v: unknown): boolean;
}
