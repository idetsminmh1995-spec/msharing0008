import { type IReadable } from "./IReadable";
/**
 * This utility public class allows bitwise reading of a stream
 * @internal
 */
export declare class BitReader {
    private static readonly _byteSize;
    private _currentByte;
    private _position;
    private _source;
    constructor(source: IReadable);
    readByte(): number;
    readBytes(count: number): Uint8Array;
    readBits(count: number): number;
    readBitsReversed(count: number): number;
    readBit(): number;
    readAll(): Uint8Array;
}
