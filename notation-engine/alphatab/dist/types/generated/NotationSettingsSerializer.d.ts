import { NotationSettings } from "./../NotationSettings";
/**
 * @internal
 */
export declare class NotationSettingsSerializer {
    static fromJson(obj: NotationSettings, m: unknown): void;
    static toJson(obj: NotationSettings | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: NotationSettings, property: string, v: unknown): boolean;
}
