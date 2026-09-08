import { BarStyle } from "./../../model/Bar";
/**
 * @internal
 */
export declare class BarStyleSerializer {
    static fromJson(obj: BarStyle, m: unknown): void;
    static toJson(obj: BarStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: BarStyle, property: string, v: unknown): boolean;
}
