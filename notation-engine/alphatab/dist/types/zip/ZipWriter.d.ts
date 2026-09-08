import type { IWriteable } from "./../io/IWriteable";
import { ZipEntry } from "./ZipEntry";
/**
 * @internal
 */
export declare class ZipWriter {
    private _data;
    private _centralDirectoryHeaders;
    private _deflater;
    constructor(data: IWriteable);
    writeEntry(entry: ZipEntry): void;
    private _compress;
    end(): void;
    private _writeEndOfCentralDirectoryRecord;
    private _writeCentralDirectoryHeader;
}
