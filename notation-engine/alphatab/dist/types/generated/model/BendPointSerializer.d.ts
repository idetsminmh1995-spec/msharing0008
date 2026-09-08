import { BendPoint } from "./../../model/BendPoint";
/**
 * @internal
 */
export declare class BendPointSerializer {
    static fromJson(obj: BendPoint, m: unknown): void;
    static toJson(obj: BendPoint | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: BendPoint, property: string, v: unknown): boolean;
}
