import { CoreSettings } from "./../CoreSettings";
/**
 * @internal
 */
export declare class CoreSettingsSerializer {
    static fromJson(obj: CoreSettings, m: unknown): void;
    static toJson(obj: CoreSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: CoreSettings, property: string, v: unknown): boolean;
}
