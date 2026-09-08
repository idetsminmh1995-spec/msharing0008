import { Color } from "./Color";
import type { Lyrics } from "./Lyrics";
import { PlaybackInformation } from "./PlaybackInformation";
import type { Score } from "./Score";
import { Staff } from "./Staff";
import type { Settings } from "./../Settings";
import type { InstrumentArticulation } from "./InstrumentArticulation";
import { ElementStyle } from "./ElementStyle";
/**
 * Lists all graphical sub elements within a {@link Track} which can be styled via {@link Track.style}
 * @public
 */
export declare enum TrackSubElement {
    /**
     * The track names shown before the staves.
     */
    TrackName = 0,
    /**
     * The braces and brackets grouping the staves.
     * If a bracket spans multiple tracks, the color of the first track counts.
     */
    BracesAndBrackets = 1,
    /**
     * The system separator.
     */
    SystemSeparator = 2,
    /**
     * The tuning of the strings.
     */
    StringTuning = 3
}
/**
 * Defines the custom styles for tracks.
 * @json
 * @json_strict
 * @public
 */
export declare class TrackStyle extends ElementStyle<TrackSubElement> {
}
/**
 * This public class describes a single track or instrument of score.
 * It is primarily a list of staves containing individual music notation kinds.
 * @json
 * @json_strict
 * @public
 */
export declare class Track {
    private static readonly _shortNameMaxLength;
    /**
     * Gets or sets the zero-based index of this track.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the reference this track belongs to.
     * @json_ignore
     */
    score: Score;
    /**
     * Gets or sets the list of staves that are defined for this track.
     * @json_add addStaff
     */
    staves: Staff[];
    /**
     * Gets or sets the playback information for this track.
     */
    playbackInfo: PlaybackInformation;
    /**
     * Gets or sets the display color defined for this track.
     */
    color: Color;
    /**
     * Gets or sets the long name of this track.
     */
    name: string;
    /**
     * Gets or sets whether this track should be visible in the UI.
     * This information is purely informational and might not be provided by all input formats.
     * In formats like Guitar Pro this flag indicates whether on the default "multi-track" layout
     * tracks should be visible or not.
     */
    isVisibleOnMultiTrack: boolean;
    /**
     * Gets or sets the short name of this track.
     */
    shortName: string;
    /**
     * Defines how many bars are placed into the systems (rows) when displaying
     * the track unless a value is set in the systemsLayout.
     */
    defaultSystemsLayout: number;
    /**
     * Defines how many bars are placed into the systems (rows) when displaying
     * the track.
     */
    systemsLayout: number[];
    /**
     * Defines on which bars specifically a line break is forced.
     * @json_add addLineBreaks
     */
    lineBreaks?: Set<number>;
    /**
     * Gets whether this track is a percussion track.
     */
    get isPercussion(): boolean;
    /**
     * Adds a new line break.
     * @param index  The index of the bar before which a line break should happen.
     */
    addLineBreaks(index: number): void;
    /**
     * Gets or sets a mapping on which staff lines particular percussion instruments
     * should be shown.
     */
    percussionArticulations: InstrumentArticulation[];
    /**
     * The style customizations for this item.
     */
    style?: TrackStyle;
    ensureStaveCount(staveCount: number): void;
    addStaff(staff: Staff): void;
    /**
     * Returns the index of {@link articulation} in {@link percussionArticulations},
     * appending it (deduplicated by `uniqueId`) when not yet present. Callers store the
     * returned index in {@link Note.percussionArticulation}.
     */
    getOrRegisterPercussionArticulation(articulation: InstrumentArticulation): number;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    applyLyrics(lyrics: Lyrics[]): void;
}
