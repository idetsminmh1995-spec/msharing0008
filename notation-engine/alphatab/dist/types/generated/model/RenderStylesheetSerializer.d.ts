import { RenderStylesheet } from "./../../model/RenderStylesheet";
/**
 * @internal
 */
export declare class RenderStylesheetSerializer {
    static fromJson(obj: RenderStylesheet, m: unknown): void;
    static toJson(obj: RenderStylesheet | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: RenderStylesheet, property: string, v: unknown): boolean;
}
