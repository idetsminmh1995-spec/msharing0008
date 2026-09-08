import { Score } from "./../../model/Score";
/**
 * @internal
 */
export declare class ScoreSerializer {
    static fromJson(obj: Score, m: unknown): void;
    static toJson(obj: Score | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: Score, property: string, v: unknown): boolean;
}
