import { Note } from "./../../model/Note";
/**
 * @internal
 */
export declare class NoteSerializer {
    static fromJson(obj: Note, m: unknown): void;
    static toJson(obj: Note | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Note, property: string, v: unknown): boolean;
}
