import { type Score } from "./../model/Score";
import type { IWriteable } from "./../io/IWriteable";
/**
 * @internal
 */
declare enum DataType {
    Boolean = 0,
    Integer = 1,
    Float = 2,
    String = 3,
    Point = 4,
    Size = 5,
    Rectangle = 6,
    Color = 7
}
/**
 * A BinaryStylesheet from Guitar Pro 6 and 7 files.
 * The BinaryStylesheet is a simple binary key-value store for additional settings
 * related to the display of the music sheet.
 *
 * File:
 *     int32 (big endian) | Number of KeyValuePairs
 *     KeyValuePair[]     | The raw records
 *
 * KeyValuePair:
 *     1 Byte  | length of the key
 *     n Bytes | key as utf8 encoded string
 *     1 Byte  | Data Type
 *     n Bytes | Value
 *
 * Values based on Data Type:
 *     0 = bool
 *         0===false
 *     1 = int32 (big endian)
 *     2 = float (big endian, IEEE)
 *     3 = string
 *       int16 (big endian) | length of string
 *       n bytes            | utf-8 encoded string
 *     4 = point
 *       int32 (big endian) | X-coordinate
 *       int32 (big endian) | Y-coordinate
 *     5 = size
 *       int32 (big endian) | Width
 *       int32 (big endian) | Height
 *     6 = rectangle
 *       int32 (big endian) | X-coordinate
 *       int32 (big endian) | Y-coordinate
 *       int32 (big endian) | Width
 *       int32 (big endian) | Height
 *     7 = color
 *       1 byte | Red
 *       1 byte | Green
 *       1 byte | Blue
 *       1 byte | Alpha
 * @internal
 */
export declare class BinaryStylesheet {
    private readonly _types;
    readonly raw: Map<string, unknown>;
    constructor(data?: Uint8Array, maxDecodingBufferSize?: number);
    private _read;
    apply(score: Score): void;
    private _toTextAlign;
    addValue(key: string, value: unknown, type?: DataType): void;
    writeTo(writer: IWriteable): void;
    private _getDataType;
    static writeForScore(score: Score): Uint8Array;
    private static _addHeaderAndFooter;
}
export {};
