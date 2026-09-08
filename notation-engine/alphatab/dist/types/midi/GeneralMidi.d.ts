/**
 * This public class provides names for all general midi instruments.
 * @internal
 */
export declare class GeneralMidi {
    private static _values;
    static getValue(name: string): number;
    static getName(input: number): string;
    static isPiano(program: number): boolean;
    static isGuitar(program: number): boolean;
    static isBass(program: number): boolean;
    static bankToLsbMsb(bank: number): [number, number];
}
