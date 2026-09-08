import type { Bar } from "./Bar";
import type { Beat } from "./Beat";
import { Duration } from "./Duration";
import { ElementStyle } from "./ElementStyle";
import type { Settings } from "./../Settings";
/**
 * Lists all graphical sub elements within a {@link Voice} which can be styled via {@link Voice.style}
 * @public
 */
export declare enum VoiceSubElement {
    /**
     * All general glyphs (like notes heads and rests).
     */
    Glyphs = 0
}
/**
 * Defines the custom styles for voices.
 * @json
 * @json_strict
 * @public
 */
export declare class VoiceStyle extends ElementStyle<VoiceSubElement> {
}
/**
 * A voice represents a group of beats
 * that can be played during a bar.
 * @json
 * @json_strict
 * @public
 */
export declare class Voice {
    private _beatLookup;
    private _isEmpty;
    private _isRestOnly;
    private static _globalVoiceId;
    /**
     * @internal
     */
    static resetIds(): void;
    /**
     * Gets or sets the unique id of this bar.
     */
    id: number;
    /**
     * Gets or sets the zero-based index of this voice within the bar.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the reference to the bar this voice belongs to.
     * @json_ignore
     */
    bar: Bar;
    /**
     * Gets or sets the list of beats contained in this voice.
     * @json_add addBeat
     */
    beats: Beat[];
    /**
     * Gets or sets a value indicating whether this voice is empty.
     */
    get isEmpty(): boolean;
    /**
     * The style customizations for this item.
     */
    style?: VoiceStyle;
    /**
     * @internal
     */
    forceNonEmpty(): void;
    /**
     * Gets or sets a value indicating whether this voice is empty.
     */
    get isRestOnly(): boolean;
    /**
     * The shortest duration contained across beats in this bar.
     * @internal
     * @json_ignore
     */
    shortestDuration: Duration;
    insertBeat(after: Beat, newBeat: Beat): void;
    addBeat(beat: Beat): void;
    private _chain;
    addGraceBeat(beat: Beat): void;
    getBeatAtPlaybackStart(playbackStart: number): Beat | null;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    calculateDuration(): number;
}
