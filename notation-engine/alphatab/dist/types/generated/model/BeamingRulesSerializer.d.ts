import { BeamingRules } from "./../../model/MasterBar";
/**
 * @internal
 */
export declare class BeamingRulesSerializer {
    static fromJson(obj: BeamingRules, m: unknown): void;
    static toJson(obj: BeamingRules | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: BeamingRules, property: string, v: unknown): boolean;
}
