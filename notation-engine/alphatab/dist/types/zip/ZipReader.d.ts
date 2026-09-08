import { type IReadable } from "./../io/IReadable";
import { ZipEntry } from "./ZipEntry";
/**
 * @internal
 */
export declare class ZipReader {
    private _readable;
    private _maxDecodingBufferSize;
    constructor(readable: IReadable, maxDecodingBufferSize: number);
    read(): ZipEntry[];
    private _readEntry;
}
