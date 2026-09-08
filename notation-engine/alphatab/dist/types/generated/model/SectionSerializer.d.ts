import { Section } from "./../../model/Section";
/**
 * @internal
 */
export declare class SectionSerializer {
    static fromJson(obj: Section, m: unknown): void;
    static toJson(obj: Section | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Section, property: string, v: unknown): boolean;
}
