import type { VorbisStream } from "./VorbisStream";
import type { OggPacket } from "./OggReader";
import { IntBitReader } from "./IntBitReader";
/**
 * @internal
 */
export declare class VorbisSetupHeader {
    codebooks: VorbisCodebook[];
    timeDomainTransforms: VorbisTimeDomainTransform[];
    floors: VorbisFloor[];
    residues: VorbisResidue[];
    mappings: VorbisMapping[];
    modes: VorbisMode[];
}
/**
 * @internal
 */
interface IFastList {
    get(index: number): number;
}
/**
 * @internal
 */
export declare class VorbisCodebook {
    private _lengths;
    private _maxBits;
    private _overflowList;
    private _prefixList;
    private _prefixBitLength;
    private _lookupTable;
    dimensions: number;
    entries: number;
    mapType: number;
    constructor(packet: IntBitReader, huffman: Huffman);
    get(entry: number, dim: number): number;
    decodeScalar(packet: IntBitReader): number;
    private _initTree;
    private _computeCodewords;
    private _addEntry;
    private _initLookupTable;
    private _lookup1Values;
}
/**
 * @internal
 */
declare class HuffmanListNode {
    value: number;
    length: number;
    bits: number;
    mask: number;
}
/**
 * @internal
 */
export declare class Huffman {
    static readonly maxTableBits = 10;
    tableBits: number;
    prefixTree: (HuffmanListNode | null)[];
    overflowList: (HuffmanListNode | null)[] | null;
    generateTable(values: IFastList, lengthList: Int32Array, codeList: Int32Array | null): void;
}
/**
 * @internal
 */
export declare class VorbisTimeDomainTransform {
    constructor(packet: IntBitReader);
}
/**
 * @internal
 */
export interface IVorbisFloorData {
    readonly executeChannel: boolean;
    forceEnergy: boolean;
    forceNoEnergy: boolean;
}
/**
 * @internal
 */
export interface IVorbisFloor {
    unpack(packet: IntBitReader, blockSize: number, channel: number): IVorbisFloorData;
    apply(floorData: IVorbisFloorData, blockSize: number, residue: Float32Array): void;
}
/**
 * @internal
 */
export declare class VorbisFloor0 implements IVorbisFloor {
    private _order;
    private _rate;
    private _barkMapSize;
    private _ampBits;
    private _ampOfs;
    private _ampDiv;
    private _books;
    private _bookBits;
    private _wMap;
    private _barkMaps;
    constructor(packet: IntBitReader, block0Size: number, block1Size: number, codebooks: VorbisCodebook[]);
    private _synthesizeBarkCurve;
    private static _toBARK;
    private _synthesizeWDelMap;
    unpack(packet: IntBitReader, _blockSize: number, _channel: number): IVorbisFloorData;
    apply(floorData: IVorbisFloorData, blockSize: number, residue: Float32Array): void;
}
/**
 * @internal
 */
export declare class VorbisFloor1 implements IVorbisFloor {
    private static readonly _rangeLookup;
    private static readonly _yBitsLookup;
    private _partitionClass;
    private _classDimensions;
    private _classSubclasses;
    private _xList;
    private _classMasterBookIndex;
    private _hNeigh;
    private _lNeigh;
    private _sortIdx;
    private _multiplier;
    private _range;
    private _yBits;
    private _classMasterbooks;
    private _subclassBooks;
    private _subclassBookIndex;
    constructor(packet: IntBitReader, codebooks: VorbisCodebook[]);
    unpack(packet: IntBitReader, _blockSize: number, _channel: number): IVorbisFloorData;
    apply(floorData: IVorbisFloorData, blockSize: number, residue: Float32Array): void;
    private _unwrapPosts;
    private _renderPoint;
    private _renderLineMulti;
    private static readonly _inverseDbTable;
}
/**
 * @internal
 */
export declare class VorbisFloor implements IVorbisFloor {
    floor: IVorbisFloor;
    constructor(packet: IntBitReader, block0Size: number, block1Size: number, codebooks: VorbisCodebook[]);
    apply(floorData: IVorbisFloorData, blockSize: number, residue: Float32Array): void;
    unpack(packet: IntBitReader, blockSize: number, channel: number): IVorbisFloorData;
}
/**
 * @internal
 */
export interface IVorbisResidue {
    decode(packet: IntBitReader, doNotDecodeChannel: boolean[], blockSize: number, buffer: Float32Array[]): void;
}
/**
 * @internal
 */
export declare class VorbisResidue0 implements IVorbisResidue {
    private _channels;
    private _begin;
    private _end;
    private _partitionSize;
    private _classifications;
    private _maxStages;
    private _books;
    private _classBook;
    private _cascade;
    private _decodeMap;
    constructor(packet: IntBitReader, channels: number, codebooks: VorbisCodebook[]);
    private static _icount;
    decode(packet: IntBitReader, doNotDecodeChannel: boolean[], blockSize: number, buffer: Float32Array[]): void;
    protected writeVectors(codebook: VorbisCodebook, packet: IntBitReader, residue: Float32Array[], channel: number, offset: number, partitionSize: number): boolean;
}
/**
 * @internal
 */
export declare class VorbisResidue1 extends VorbisResidue0 {
    protected writeVectors(codebook: VorbisCodebook, packet: IntBitReader, residue: Float32Array[], channel: number, offset: number, partitionSize: number): boolean;
}
/**
 * @internal
 */
export declare class VorbisResidue2 extends VorbisResidue0 {
    private _realChannels;
    constructor(packet: IntBitReader, channels: number, codebooks: VorbisCodebook[]);
    decode(packet: IntBitReader, doNotDecodeChannel: boolean[], blockSize: number, buffer: Float32Array[]): void;
    protected writeVectors(codebook: VorbisCodebook, packet: IntBitReader, residue: Float32Array[], _channel: number, offset: number, partitionSize: number): boolean;
}
/**
 * @internal
 */
export declare class VorbisResidue implements IVorbisResidue {
    residue: IVorbisResidue;
    constructor(packet: IntBitReader, channels: number, codebooks: VorbisCodebook[]);
    decode(packet: IntBitReader, doNotDecodeChannel: boolean[], blockSize: number, buffer: Float32Array[]): void;
}
/**
 * @internal
 */
export declare class VorbisMapping {
    private _mdct;
    private _couplingAngle;
    private _couplingMangitude;
    private _submapFloor;
    private _submapResidue;
    private _channelFloor;
    private _channelResidue;
    constructor(packet: IntBitReader, channels: number, floors: VorbisFloor[], residues: VorbisResidue[], mdct: Mdct);
    decodePacket(packet: IntBitReader, blockSize: number, buffer: Float32Array[]): void;
}
/**
 * @internal
 */
declare class VorbisModeOverlapInfo {
    packetStartIndex: number;
    packetTotalLength: number;
    packetValidLength: number;
}
/**
 * @internal
 */
export declare class VorbisMode {
    private static readonly _piHalf;
    private _channels;
    private _blockFlag;
    private _blockSize;
    private _mapping;
    private _windows;
    private _overlapInfo;
    constructor(packet: IntBitReader, channels: number, block0Size: number, block1Size: number, mappings: VorbisMapping[]);
    decode(reader: IntBitReader, buffer: Float32Array[]): VorbisModeOverlapInfo;
    private _getPacketInfo;
    private static _calcWindow;
    private static _calcOverlap;
}
/**
 * @internal
 */
export declare class Mdct {
    private _setupCache;
    reverse(samples: Float32Array, sampleCount: number): void;
}
/**
 * @internal
 */
export declare class VorbisStreamDecoder {
    private _stream;
    private _setup;
    private _packets;
    private _packetIndex;
    private _nextPacketBuf;
    private _prevPacketBuf;
    private _prevPacketStart;
    private _prevPacketEnd;
    private _prevPacketStop;
    private _currentPosition;
    private _hasPosition;
    private _eosFound;
    private _modeFieldBits;
    constructor(stream: VorbisStream, setup: VorbisSetupHeader, packets: OggPacket[]);
    decode(): Float32Array<ArrayBuffer>;
    read(buffer: Float32Array, offset: number, count: number): number;
    private _copyBuffer;
    private _readNextPacket;
    private static _overlapBuffers;
    private _decodeNextPacket;
}
export {};
