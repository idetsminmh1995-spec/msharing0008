import type { Duration } from "./../../model/Duration";
import type { MasterBar } from "./../../model/MasterBar";
/**
 * @internal
 */
export declare class BeamingRuleLookup {
    private _division;
    private _slots;
    private _barDuration;
    constructor(barDuration: number, division: number, slots: number[]);
    calculateGroupIndex(beatStartTime: number): number;
    static build(masterBar: MasterBar, ruleDuration: Duration, ruleGroups: number[]): BeamingRuleLookup;
}
