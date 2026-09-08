import { type Huffman } from "./Huffman";
/**
 * @internal
 */
export declare class HuffTools {
    static make(lengths: number[], pos: number, nlengths: number, maxbits: number): Huffman;
    private static _treeMake;
    private static _treeCompress;
    private static _treeWalk;
    private static _treeDepth;
}
