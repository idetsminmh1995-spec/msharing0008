import { HeaderFooterStyle } from "./../../model/Score";
/**
 * @internal
 */
export declare class HeaderFooterStyleSerializer {
    static fromJson(obj: HeaderFooterStyle, m: unknown): void;
    static toJson(obj: HeaderFooterStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: HeaderFooterStyle, property: string, v: unknown): boolean;
}
