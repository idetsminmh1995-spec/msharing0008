import { TremoloPickingEffect } from "./../../model/TremoloPickingEffect";
/**
 * @internal
 */
export declare class TremoloPickingEffectSerializer {
    static fromJson(obj: TremoloPickingEffect, m: unknown): void;
    static toJson(obj: TremoloPickingEffect | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: TremoloPickingEffect, property: string, v: unknown): boolean;
}
