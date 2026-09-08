import { ScoreImporter } from "./ScoreImporter";
import type { Score } from "./../model/Score";
/**
 * This ScoreImporter can read Guitar Pro 7 and 8 (gp) files.
 * @internal
 */
export declare class Gp7To8Importer extends ScoreImporter {
    get name(): string;
    readScore(): Score;
}
