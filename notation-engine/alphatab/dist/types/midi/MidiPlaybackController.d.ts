import type { Score } from "./../model/Score";
/**
 * @internal
 */
export declare class MidiPlaybackController {
    private _score;
    private _repeatStack;
    private _groupsOnStack;
    private _previousAlternateEndings;
    private _state;
    shouldPlay: boolean;
    index: number;
    currentTick: number;
    get finished(): boolean;
    constructor(score: Score);
    processCurrent(): void;
    moveNext(): void;
    private _resetRepeats;
    private _handleDaCapo;
    private _handleDalSegno;
    private _handleDaCoda;
    private _moveNextWithDirections;
    /**
     * Finds the index of the masterbar with the given direction applied which fits best
     * the given start index. In best case in one piece we only have single jump marks, but it could happen
     * that you have multiple Segno/Coda symbols placed at different sections.
     * @param toFind
     * @param searchIndex
     * @param backwardsFirst whether to first search backwards before looking forwards.
     * @returns the index of the masterbar found with the given direction or -1 if no masterbar with the given direction was found.
     */
    private _findJumpTarget;
    private _findJumpTargetForwards;
    private _findJumpTargetBackwards;
    private _moveNextWithNormalRepeats;
}
