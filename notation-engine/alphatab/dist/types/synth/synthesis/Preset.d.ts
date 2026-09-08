import type { Region } from "./Region";
/**
 * @internal
 */
export declare class Preset {
    name: string;
    presetNumber: number;
    bank: number;
    regions: Region[] | null;
}
