import type { OggPacket } from "./OggReader";
import { VorbisStream } from "./VorbisStream";
/**
 * @internal
 */
export declare class VorbisStreamReader {
    static readonly vorbisHeaderMarker: Uint8Array<ArrayBuffer>;
    private readonly _packets;
    private _packetIndex;
    constructor(packets: OggPacket[]);
    read(): VorbisStream | null;
    private _nextPacket;
    private _readStream;
    /**
     * https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-610004.2
     * @param packetType
     * @param reader
     * @returns
     */
    private _commonHeaderDecode;
    /**
     * https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-610004.2
     * @param packetType
     * @param reader
     * @returns
     */
    private _commonHeaderDecodeBit;
    /**
     * https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-630004.2.2
     * @param stream
     * @param packet
     * @returns
     */
    private _readIdentificationHeader;
    private static _isAllowedBlockSize;
    /**
     * https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-820005
     * @param packet
     * @returns
     */
    private _readComments;
    /**
     * https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-650004.2.4
     * @param setup
     * @param packet
     * @returns
     */
    private _readSetupHeader;
}
