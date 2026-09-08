import { AlphaTabError } from "./../AlphaTabError";
/**
 * Represents a stream of binary data that can be read from.
 * @public
 */
export interface IReadable {
    /**
     * Gets or sets the current read position relative in the stream.
     */
    position: number;
    /**
     * Gets the total number of bytes contained in the stream.
     */
    readonly length: number;
    /**
     * Resets the stream for reading the data from the beginning.
     */
    reset(): void;
    /**
     * Skip the given number of bytes.
     * @param offset The number of bytes to skip.
     */
    skip(offset: number): void;
    /**
     * Read a single byte from the data stream.
     * @returns The value of the next byte or -1 if there is no more data.
     */
    readByte(): number;
    /**
     * Reads the given number of bytes from the stream into the given buffer.
     * @param buffer The buffer to fill.
     * @param offset The offset in the buffer where to start writing.
     * @param count The number of bytes to read.
     * @returns
     */
    read(buffer: Uint8Array, offset: number, count: number): number;
    /**
     * Reads the remaining data.
     * @returns
     */
    readAll(): Uint8Array;
}
/**
 * Thrown whenever we hit the end of input data unexpectedly.
 * @public
 */
export declare class EndOfReaderError extends AlphaTabError {
    constructor();
}
/**
 * Thrown whenever an overflow in data or buffer sizes is detected.
 * @public
 */
export declare class OverflowError extends AlphaTabError {
    constructor(message: string);
}
/**
 * An {@see IReadable} implementation throwing when the end of stream is reached guarding against
 * corrupted or maliciously crafted files leading to endless reading
 * @internal
 */
export declare class ThrowingReadable implements IReadable {
    private _readable;
    constructor(readable: IReadable);
    get position(): number;
    set position(value: number);
    get length(): number;
    reset(): void;
    skip(offset: number): void;
    private _requireBytes;
    readByte(): number;
    read(buffer: Uint8Array, offset: number, count: number): number;
    readAll(): Uint8Array;
}
