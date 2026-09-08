import type { IReadable } from "./../../io/IReadable";
/**
 * @internal
 */
export declare class RiffChunk {
    static readonly HeaderSize: number;
    id: string;
    size: number;
    static load(parent: RiffChunk | null, chunk: RiffChunk, stream: IReadable): boolean;
}
