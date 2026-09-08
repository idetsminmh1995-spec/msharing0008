/**
 * @target web
 * @internal
 */
export declare class TypeConversions {
    private static readonly _conversionBuffer;
    private static readonly _conversionByteArray;
    private static readonly _dataView;
    static float64ToBytes(v: number): Uint8Array;
    static bytesToInt64LE(bytes: Uint8Array): number;
    static bytesToFloat64LE(bytes: Uint8Array): number;
    static bytesToFloat32LE(bytes: Uint8Array): number;
    static float32BEToBytes(v: number): Uint8Array;
    static uint16ToInt16(v: number): number;
    static int16ToUint32(v: number): number;
    static int32ToUint16(v: number): number;
    static int32ToInt16(v: number): number;
    static int32ToUint32(v: number): number;
    static uint8ToInt8(v: number): number;
}
