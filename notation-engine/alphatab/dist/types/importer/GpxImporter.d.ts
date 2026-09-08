import { ScoreImporter } from "./ScoreImporter";
import type { Score } from "./../model/Score";
/**
 * This ScoreImporter can read Guitar Pro 6 (gpx) files.
 * @internal
 */
export declare class GpxImporter extends ScoreImporter {
    get name(): string;
    readScore(): Score;
}
