import { Duration } from "./Duration";
/**
 * The style of tremolo affecting mainly the display of the effect.
 * @public
 */
export declare enum TremoloPickingStyle {
    /**
     * A classic tremolo expressed by diagonal bars on the stem.
     */
    Default = 0,
    /**
     * A buzz roll tremolo expressed by a 'z' shaped symbol.
     */
    BuzzRoll = 1
}
/**
 * Describes a tremolo picking effect.
 * @json
 * @json_strict
 * @cloneable
 * @public
 */
export declare class TremoloPickingEffect {
    /**
     * The minimum number of marks for the tremolo picking effect to be valid.
     */
    static readonly minMarks = 0;
    /**
     * The max number of marks for the tremolo picking effect to be valid.
     */
    static readonly maxMarks = 5;
    /**
     * The number of marks for the tremolo.
     * A mark is equal to a single bar shown for a default tremolos.
     */
    marks: number;
    /**
     * The style of the tremolo picking.
     */
    style: TremoloPickingStyle;
    /**
     * @internal
     * @deprecated use {@link getDurationAsTicks} to handle tremolo durations shorter than typical durations.
     */
    getDuration(beatDuration: Duration): Duration;
    /**
     * Gets the duration of a single tremolo note played in a beat of the given duration
     * based on the configured marks.
     */
    getDurationAsTicks(beatDuration: Duration): number;
}
