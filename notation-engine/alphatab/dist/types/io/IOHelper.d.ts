import type { IReadable } from "./IReadable";
import type { IWriteable } from "./IWriteable";
/**
 * @public
 */
export declare class IOHelper {
    static readInt32BE(input: IReadable): number;
    static readFloat32BE(readable: IReadable): number;
    static readFloat64BE(readable: IReadable): number;
    static readInt32LE(input: IReadable): number;
    static readInt64LE(input: IReadable): number;
    static readUInt32LE(input: IReadable): number;
    static decodeUInt32LE(data: Uint8Array, index: number): number;
    static readUInt16LE(input: IReadable): number;
    static readInt16LE(input: IReadable): number;
    static readUInt32BE(input: IReadable): number;
    static readUInt16BE(input: IReadable): number;
    static readInt16BE(input: IReadable): number;
    static readByteArray(input: IReadable, length: number): Uint8Array;
    static read8BitChars(input: IReadable, length: number): string;
    static read8BitString(input: IReadable): string;
    static read8BitStringLength(input: IReadable, length: number): string;
    static readSInt8(input: IReadable): number;
    static readInt24(input: Uint8Array, index: number): number;
    static readInt16(input: Uint8Array, index: number): number;
    static toString(data: Uint8Array, encoding: string): string;
    private static _detectEncoding;
    static stringToBytes(str: string): Uint8Array;
    static writeInt32BE(o: IWriteable, v: number): void;
    static writeInt32LE(o: IWriteable, v: number): void;
    static writeUInt16LE(o: IWriteable, v: number): void;
    static writeInt16LE(o: IWriteable, v: number): void;
    static writeInt16BE(o: IWriteable, v: number): void;
    static writeFloat32BE(o: IWriteable, v: number): void;
    static iterateCodepoints(input: string): Generator<number, void, unknown>;
    static isLeadingSurrogate(charCode: number): boolean;
    static isTrailingSurrogate(charCode: number): boolean;
}
