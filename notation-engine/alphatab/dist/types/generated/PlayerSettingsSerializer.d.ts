import { PlayerSettings } from "./../PlayerSettings";
/**
 * @internal
 */
export declare class PlayerSettingsSerializer {
    static fromJson(obj: PlayerSettings, m: unknown): void;
    static toJson(obj: PlayerSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: PlayerSettings, property: string, v: unknown): boolean;
}
