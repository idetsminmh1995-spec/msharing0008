import { InstrumentArticulation } from "./InstrumentArticulation";
import type { Note } from "./Note";
/**
 * @internal
 */
export declare class PercussionMapper {
    static instrumentArticulations: Map<string, InstrumentArticulation>;
    private static _instrumentArticulationNames;
    private static _gp6ElementAndVariationToArticulation;
    static articulationFromElementVariation(element: number, variation: number): number;
    static getArticulationName(n: Note): string;
    static getArticulation(n: Note): InstrumentArticulation | null;
    private static _instrumentArticulationsById;
    private static _initArticulationsById;
    static instrumentArticulationIds(): Iterable<number>;
    static getArticulationById(id: number): InstrumentArticulation | null;
    static getElementAndVariation(n: Note): number[];
    static readonly instrumentArticulationNames: Map<string, string>;
    private static _mergeNames;
    private static _articulationsByOutputNumber;
    static tryMatchKnownArticulation(articulation: InstrumentArticulation): number;
    private static _instrumentArticulationsByUniqueId;
    static getInstrumentArticulationByUniqueId(uniqueId: string): InstrumentArticulation | undefined;
}
