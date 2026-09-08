import { EngravingSettings } from "./../EngravingSettings";
/**
 * @internal
 */
export declare class EngravingSettingsSerializer {
    static fromJson(obj: EngravingSettings, m: unknown): void;
    static toJson(obj: EngravingSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: EngravingSettings, property: string, v: unknown): boolean;
}
