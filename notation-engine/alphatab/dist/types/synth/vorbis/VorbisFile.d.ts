import type { IReadable } from "./../../io/IReadable";
import type { VorbisStream } from "./VorbisStream";
/**
 * @internal
 */
export declare class VorbisFile {
    streams: VorbisStream[];
    constructor(readable: IReadable);
}
