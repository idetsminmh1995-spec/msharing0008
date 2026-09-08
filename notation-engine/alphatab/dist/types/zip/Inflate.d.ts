import type { IReadable } from "./../io/IReadable";
/**
 * @internal
 */
export declare class Inflate {
    private static _lenExtraBitsTbl;
    private static _lenBaseValTbl;
    private static _distExtraBitsTbl;
    private static _distBaseValTbl;
    private static _codeLengthsPos;
    private static _fixedHuffman;
    private static _buildFixedHuffman;
    private _nbits;
    private _bits;
    private _state;
    private _isFinal;
    private _huffman;
    private _huffdist;
    private _len;
    private _dist;
    private _needed;
    private _output;
    private _outpos;
    private _input;
    private _lengths;
    private _window;
    constructor(readable: IReadable);
    readBytes(b: Uint8Array, pos: number, len: number): number;
    private _inflateLoop;
    private _addDistOne;
    private _addByte;
    private _addDist;
    private _getBit;
    private _getBits;
    private _getRevBits;
    private _resetBits;
    private _addBytes;
    private _inflateLengths;
    private _applyHuffman;
}
