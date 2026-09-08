import { Automation } from "./../../model/Automation";
/**
 * @internal
 */
export declare class AutomationSerializer {
    static fromJson(obj: Automation, m: unknown): void;
    static toJson(obj: Automation | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Automation, property: string, v: unknown): boolean;
}
