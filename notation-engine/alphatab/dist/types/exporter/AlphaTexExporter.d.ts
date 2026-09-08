import { ScoreExporter } from "./ScoreExporter";
import type { Score } from "./../model/Score";
import { Settings } from "./../Settings";
/**
 * This ScoreExporter can write alphaTex strings.
 * @public
 */
export declare class AlphaTexExporter extends ScoreExporter {
    private _handler;
    get name(): string;
    exportToString(score: Score, settings?: Settings | null): string;
    writeScore(score: Score): void;
    scoreToAlphaTexString(score: Score): string;
    private _score;
    private _track;
    private _staff;
    private _voice;
    private _bar;
    private _beat;
    private _beatEffects;
    private _notes;
    private _note;
    private _noteEffects;
}
