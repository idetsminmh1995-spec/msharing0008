import { ExporterSettings } from "./../ExporterSettings";
/**
 * @internal
 */
export declare class ExporterSettingsSerializer {
    static fromJson(obj: ExporterSettings, m: unknown): void;
    static toJson(obj: ExporterSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: ExporterSettings, property: string, v: unknown): boolean;
}
