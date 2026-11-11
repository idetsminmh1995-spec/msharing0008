/**
 * §11's byte-stream reader. A thin cursor over the file's bytes -- every
 * read advances `position` and every function below is built on top of
 * this rather than re-deriving offsets by hand, which is exactly the
 * kind of arithmetic that's easy to get subtly wrong in a binary format
 * with variable-length fields (§11.1's VLQ, running status).
 */
export class ByteReader {
  private readonly bytes: Uint8Array;
  position: number;

  constructor(bytes: Uint8Array, position = 0) {
    this.bytes = bytes;
    this.position = position;
  }

  get length(): number {
    return this.bytes.length;
  }

  get remaining(): number {
    return this.bytes.length - this.position;
  }

  atEnd(): boolean {
    return this.position >= this.bytes.length;
  }

  /** Reads `count` bytes without advancing -- for magic-byte checks that shouldn't consume the stream before validating it. */
  peekBytes(count: number): Uint8Array | undefined {
    if (this.remaining < count) return undefined;
    return this.bytes.subarray(this.position, this.position + count);
  }

  readUint8(): number | undefined {
    if (this.remaining < 1) return undefined;
    const value = this.bytes[this.position];
    this.position += 1;
    return value;
  }

  readUint16BE(): number | undefined {
    if (this.remaining < 2) return undefined;
    const hi = this.bytes[this.position];
    const lo = this.bytes[this.position + 1];
    this.position += 2;
    return ((hi ?? 0) << 8) | (lo ?? 0);
  }

  readUint32BE(): number | undefined {
    if (this.remaining < 4) return undefined;
    const b0 = this.bytes[this.position];
    const b1 = this.bytes[this.position + 1];
    const b2 = this.bytes[this.position + 2];
    const b3 = this.bytes[this.position + 3];
    this.position += 4;
    return (((b0 ?? 0) << 24) | ((b1 ?? 0) << 16) | ((b2 ?? 0) << 8) | (b3 ?? 0)) >>> 0;
  }

  /** Reads `count` raw bytes and advances past them -- e.g. a chunk's magic bytes, or a meta event's declared-length payload. */
  readBytes(count: number): Uint8Array | undefined {
    if (this.remaining < count) return undefined;
    const slice = this.bytes.subarray(this.position, this.position + count);
    this.position += count;
    return slice;
  }

  /** Reads `count` bytes as a plain ASCII string -- for chunk magic ("MThd"/"MTrk"). */
  readAscii(count: number): string | undefined {
    const slice = this.readBytes(count);
    if (slice === undefined) return undefined;
    let s = '';
    for (const b of slice) s += String.fromCharCode(b);
    return s;
  }

  /** Advances past `count` bytes without returning them -- for skipping an unknown meta event by its declared length (§11.2's error-conditions rule: length must be respected, never assumed). */
  skip(count: number): boolean {
    if (this.remaining < count) return false;
    this.position += count;
    return true;
  }
}
