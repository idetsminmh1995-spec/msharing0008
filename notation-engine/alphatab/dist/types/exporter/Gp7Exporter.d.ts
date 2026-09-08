import type { Score } from "./../model/Score";
import { ScoreExporter } from "./ScoreExporter";
/**
 * This ScoreExporter can write Guitar Pro 7+ (gp) files.
 * @public
 */
export declare class Gp7Exporter extends ScoreExporter {
    get name(): string;
    writeScore(score: Score): void;
}
