import { VibratoPlaybackSettings } from "./../PlayerSettings";
/**
 * @internal
 */
export declare class VibratoPlaybackSettingsSerializer {
    static fromJson(obj: VibratoPlaybackSettings, m: unknown): void;
    static toJson(obj: VibratoPlaybackSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: VibratoPlaybackSettings, property: string, v: unknown): boolean;
}
