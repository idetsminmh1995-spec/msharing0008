import { ScoreImporter } from "./ScoreImporter";
import type { Score } from "./../model/Score";
/**
 * This ScoreImporter can read Capella (cap/capx) files.
 * @internal
 */
export declare class CapellaImporter extends ScoreImporter {
    get name(): string;
    readScore(): Score;
}
