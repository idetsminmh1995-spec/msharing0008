import { InstrumentArticulation } from "./../../model/InstrumentArticulation";
/**
 * @internal
 */
export declare class InstrumentArticulationSerializer {
    static fromJson(obj: InstrumentArticulation, m: unknown): void;
    static toJson(obj: InstrumentArticulation | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: InstrumentArticulation, property: string, v: unknown): boolean;
}
