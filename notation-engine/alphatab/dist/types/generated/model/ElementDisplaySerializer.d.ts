import { ElementDisplay } from "./../../model/ElementDisplay";
/**
 * @internal
 */
export declare class ElementDisplaySerializer {
    static fromJson(obj: ElementDisplay, m: unknown): void;
    static toJson(obj: ElementDisplay | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: ElementDisplay, property: string, v: unknown): boolean;
}
