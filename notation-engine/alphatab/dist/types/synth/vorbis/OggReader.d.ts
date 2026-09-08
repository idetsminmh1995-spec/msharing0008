import type { IReadable } from "./../../io/IReadable";
/**
 * @internal
 */
export declare class OggPacket {
    packetData: Uint8Array;
    isBeginningOfStream: boolean;
    isEndOfStream: boolean;
    granulePosition: number | null;
    constructor(data: Uint8Array, isBeginOfStream: boolean, isEndOfStream: boolean, granulePosition: number | null);
    addData(newData: Uint8Array): void;
}
/**
 * @internal
 */
export declare class OggReader {
    private _readable;
    constructor(readable: IReadable);
    read(): OggPacket[];
    private _findAndReadPage;
    private _seekPageHeader;
    private _readPage;
}
