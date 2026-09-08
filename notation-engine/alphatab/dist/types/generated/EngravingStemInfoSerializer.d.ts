import { EngravingStemInfo } from "./../EngravingSettings";
/**
 * @internal
 */
export declare class EngravingStemInfoSerializer {
    static fromJson(obj: EngravingStemInfo, m: unknown): void;
    static toJson(obj: EngravingStemInfo | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: EngravingStemInfo, property: string, v: unknown): boolean;
}
