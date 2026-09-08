import { SlidePlaybackSettings } from "./../PlayerSettings";
/**
 * @internal
 */
export declare class SlidePlaybackSettingsSerializer {
    static fromJson(obj: SlidePlaybackSettings, m: unknown): void;
    static toJson(obj: SlidePlaybackSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: SlidePlaybackSettings, property: string, v: unknown): boolean;
}
