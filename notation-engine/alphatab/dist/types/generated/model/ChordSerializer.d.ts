import { Chord } from "./../../model/Chord";
/**
 * @internal
 */
export declare class ChordSerializer {
    static fromJson(obj: Chord, m: unknown): void;
    static toJson(obj: Chord | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Chord, property: string, v: unknown): boolean;
}
