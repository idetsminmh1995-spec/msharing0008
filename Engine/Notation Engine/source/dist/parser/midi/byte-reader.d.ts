/**
 * §11's byte-stream reader. A thin cursor over the file's bytes -- every
 * read advances `position` and every function below is built on top of
 * this rather than re-deriving offsets by hand, which is exactly the
 * kind of arithmetic that's easy to get subtly wrong in a binary format
 * with variable-length fields (§11.1's VLQ, running status).
 */
export declare class ByteReader {
    private readonly bytes;
    position: number;
    constructor(bytes: Uint8Array, position?: number);
    get length(): number;
    get remaining(): number;
    atEnd(): boolean;
    /** Reads `count` bytes without advancing -- for magic-byte checks that shouldn't consume the stream before validating it. */
    peekBytes(count: number): Uint8Array | undefined;
    readUint8(): number | undefined;
    readUint16BE(): number | undefined;
    readUint32BE(): number | undefined;
    /** Reads `count` raw bytes and advances past them -- e.g. a chunk's magic bytes, or a meta event's declared-length payload. */
    readBytes(count: number): Uint8Array | undefined;
    /** Reads `count` bytes as a plain ASCII string -- for chunk magic ("MThd"/"MTrk"). */
    readAscii(count: number): string | undefined;
    /** Advances past `count` bytes without returning them -- for skipping an unknown meta event by its declared length (§11.2's error-conditions rule: length must be respected, never assumed). */
    skip(count: number): boolean;
}
