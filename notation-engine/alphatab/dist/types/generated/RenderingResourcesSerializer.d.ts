import { RenderingResources } from "./../RenderingResources";
/**
 * @internal
 */
export declare class RenderingResourcesSerializer {
    static fromJson(obj: RenderingResources, m: unknown): void;
    static toJson(obj: RenderingResources | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: RenderingResources, property: string, v: unknown): boolean;
}
