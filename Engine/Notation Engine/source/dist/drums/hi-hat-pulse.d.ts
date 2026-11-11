import type { Score } from '../core/score.js';
/** MusicXML's per-measure meter metadata, kept structural to avoid a parser dependency. */
export interface HiHatPulseMeasureAttributes {
    readonly partId: string;
    readonly measureNumber: number;
    readonly timeNumerator?: number;
    readonly timeDenominator?: number;
}
/**
 * Optional display normalization for drum charts whose written closed-hi-hat
 * quarter notes are intended as a steady eighth-note pulse. In 4/4, each
 * qualifying quarter hit becomes two eighth-note attacks in a dedicated
 * voice, allowing the ordinary engraving pass to beam them by meter. Other
 * drums and non-grid hi-hat events keep their written duration and onset.
 *
 * This returns a new Score and never mutates the parsed score or source XML.
 * It is deliberately opt-in: faithful MusicXML engraving remains the default.
 */
export declare function expandClosedHiHatQuarterNotesToEighthPulse(score: Score, attributes: readonly HiHatPulseMeasureAttributes[], midiInstrumentsByPart: ReadonlyMap<string, ReadonlyMap<string, number>>): Score;
