import { ImporterSettings } from "./../ImporterSettings";
/**
 * @internal
 */
export declare class ImporterSettingsSerializer {
    static fromJson(obj: ImporterSettings, m: unknown): void;
    static toJson(obj: ImporterSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: ImporterSettings, property: string, v: unknown): boolean;
}
