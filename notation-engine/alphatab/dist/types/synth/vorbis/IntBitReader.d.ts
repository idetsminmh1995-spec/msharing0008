import type { IReadable } from "./../../io/IReadable";
/**
 * @internal
 */
declare class IntBitReaderReadResult {
    value: number;
    bitsRead: number;
}
/**
 * @internal
 */
export declare class IntBitReader {
    private static readonly _byteSize;
    private readonly _source;
    private _bitBucket;
    private _bitCount;
    private _overflowBits;
    constructor(source: IReadable);
    readByte(): number;
    readBit(): boolean;
    readBytes(count: number): Uint8Array;
    readBits(count: number): number;
    tryPeekBits(count: number): IntBitReaderReadResult;
    skipBits(count: number): void;
}
export {};
