import type { IReadable } from "./IReadable";
import type { IWriteable } from "./IWriteable";
/**
 * @public
 */
export declare class ByteBuffer implements IWriteable, IReadable {
    private _buffer;
    length: number;
    position: number;
    get bytesWritten(): number;
    getBuffer(): Uint8Array;
    static empty(): ByteBuffer;
    static withCapacity(capacity: number): ByteBuffer;
    static fromBuffer(data: Uint8Array): ByteBuffer;
    static fromString(contents: string): ByteBuffer;
    reset(): void;
    skip(offset: number): void;
    readByte(): number;
    read(buffer: Uint8Array, offset: number, count: number): number;
    writeByte(value: number): void;
    write(buffer: Uint8Array, offset: number, count: number): void;
    private _ensureCapacity;
    readAll(): Uint8Array;
    toArray(): Uint8Array;
    copyTo(destination: IWriteable): void;
}
