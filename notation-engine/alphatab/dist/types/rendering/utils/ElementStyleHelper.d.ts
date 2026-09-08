import { BarSubElement, type Bar } from "./../../model/Bar";
import type { BeatSubElement, Beat } from "./../../model/Beat";
import type { Color } from "./../../model/Color";
import type { NoteSubElement, Note } from "./../../model/Note";
import type { Score, ScoreSubElement } from "./../../model/Score";
import { type Track, TrackSubElement } from "./../../model/Track";
import type { VoiceSubElement, Voice } from "./../../model/Voice";
import type { ICanvas } from "./../../platform/ICanvas";
import type { RenderingResources } from "./../../RenderingResources";
/**
 * A helper to apply element styles in a specific rendering scope via the `using` keyword
 * @internal
 */
export declare class ElementStyleHelper {
    static score(canvas: ICanvas, element: ScoreSubElement, score: Score, forceDefault?: boolean): Disposable | undefined;
    static scoreColor(res: RenderingResources, element: ScoreSubElement, score: Score): Color | undefined;
    private static _scoreDefaultColor;
    static bar(canvas: ICanvas, element: BarSubElement, bar: Bar, forceDefault?: boolean): Disposable | undefined;
    static voice(canvas: ICanvas, element: VoiceSubElement, voice: Voice, forceDefault?: boolean): Disposable | undefined;
    static trackColor(res: RenderingResources, element: TrackSubElement, track: Track): Color | undefined;
    private static _trackDefaultColor;
    static track(canvas: ICanvas, element: TrackSubElement, track: Track, forceDefault?: boolean): Disposable | undefined;
    static beatColor(res: RenderingResources, element: BeatSubElement, beat: Beat): Color | undefined;
    private static _beatDefaultColor;
    static beat(canvas: ICanvas, element: BeatSubElement, beat: Beat, forceDefault?: boolean): Disposable | undefined;
    static noteColor(res: RenderingResources, element: NoteSubElement, note: Note): Color | undefined;
    private static _noteDefaultColor;
    static note(canvas: ICanvas, element: NoteSubElement, note: Note, forceDefault?: boolean): Disposable | undefined;
}
