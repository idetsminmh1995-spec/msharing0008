import { MasterBar } from "./../../model/MasterBar";
/**
 * @internal
 */
export declare class MasterBarSerializer {
    static fromJson(obj: MasterBar, m: unknown): void;
    static toJson(obj: MasterBar | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: MasterBar, property: string, v: unknown): boolean;
}
