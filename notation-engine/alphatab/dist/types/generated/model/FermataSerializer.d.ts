import { Fermata } from "./../../model/Fermata";
/**
 * @internal
 */
export declare class FermataSerializer {
    static fromJson(obj: Fermata, m: unknown): void;
    static toJson(obj: Fermata | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Fermata, property: string, v: unknown): boolean;
}
