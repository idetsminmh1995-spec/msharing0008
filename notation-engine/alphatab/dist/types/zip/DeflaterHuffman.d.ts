import type { PendingBuffer } from "./PendingBuffer";
/**
 * @internal
 */
export declare class DeflaterHuffman {
    private static readonly _bufSize;
    private static readonly _literalNum;
    /**
     * Written to Zip file to identify a stored block
     */
    static readonly storedBlock = 0;
    /**
     * Identifies static tree in Zip file
     */
    static readonly staticTrees = 1;
    /**
     * Identifies dynamic tree in Zip file
     */
    static readonly dynTrees = 2;
    private static readonly _distNum;
    private static _staticLCodes;
    private static _staticLLength;
    private static _staticDCodes;
    private static _staticDLength;
    static staticInit(): void;
    private static readonly _blOrder;
    private static readonly _bit4Reverse;
    /**
     * Reverse the bits of a 16 bit value.
     * @param toReverse Value to reverse bits
     * @returns Value with bits reversed
     */
    static bitReverse(toReverse: number): number;
    private static readonly _bitLenNum;
    private static readonly _eofSymbol;
    /**
     * Pending buffer to use
     */
    pending: PendingBuffer;
    private _literalTree;
    private _distTree;
    private _blTree;
    private _dBuf;
    private _lBuf;
    private _lastLit;
    private _extraBits;
    constructor(pending: PendingBuffer);
    isFull(): boolean;
    reset(): void;
    flushStoredBlock(stored: Uint8Array, storedOffset: number, storedLength: number, lastBlock: boolean): void;
    flushBlock(stored: Uint8Array, storedOffset: number, storedLength: number, lastBlock: boolean): void;
    /**
     * Write all trees to pending buffer
     * @param blTreeCodes The number/rank of treecodes to send.
     */
    sendAllTrees(blTreeCodes: number): void;
    /**
     * Compress current buffer writing data to pending buffer
     */
    compressBlock(): void;
    /**
     * Add distance code and length to literal and distance trees
     * @param distance Distance code
     * @param length Length
     * @returns Value indicating if internal buffer is full
     */
    tallyDist(distance: number, length: number): boolean;
    /**
     * Add literal to buffer
     * @param literal Literal value to add to buffer
     * @returns Value indicating internal buffer is full
     */
    tallyLit(literal: number): boolean;
    private static _lCode;
    private static _dCode;
}
