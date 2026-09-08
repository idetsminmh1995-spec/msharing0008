import { NoteStyle } from "./../../model/Note";
/**
 * @internal
 */
export declare class NoteStyleSerializer {
    static fromJson(obj: NoteStyle, m: unknown): void;
    static toJson(obj: NoteStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: NoteStyle, property: string, v: unknown): boolean;
}
