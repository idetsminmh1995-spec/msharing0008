import type { MasterBar } from "./MasterBar";
import { RenderStylesheet } from "./RenderStylesheet";
import type { Track } from "./Track";
import type { Settings } from "./../Settings";
import { ElementStyle } from "./ElementStyle";
import { TextAlign } from "./../platform/ICanvas";
import type { BackingTrack } from "./BackingTrack";
import { type FlatSyncPoint } from "./Automation";
/**
 * Lists all graphical sub elements within a {@link Score} which can be styled via {@link Score.style}
 * @public
 */
export declare enum ScoreSubElement {
    /**
     * The title of the song
     */
    Title = 0,
    /**
     * The subtitle of the song
     */
    SubTitle = 1,
    /**
     * The artist of the song
     */
    Artist = 2,
    /**
     * The album of the song
     */
    Album = 3,
    /**
     * The word author of the song
     */
    Words = 4,
    /**
     * The Music author of the song
     */
    Music = 5,
    /**
     * The Words&Music author of the song
     */
    WordsAndMusic = 6,
    /**
     * The transcriber of the music sheet
     */
    Transcriber = 7,
    /**
     * The copyright holder of the song
     */
    Copyright = 8,
    /**
     * The second copyright line (typically something like 'All Rights Reserved')
     */
    CopyrightSecondLine = 9,
    /**
     * The chord diagram list shown on top of the score.
     */
    ChordDiagramList = 10
}
/**
 * The additional style and display information for header and footer elements.
 * @json
 * @json_strict
 * @public
 */
export declare class HeaderFooterStyle {
    /**
     * The template how the text should be formatted. Following placeholders exist and are filled from the song information:
     * * `%TITLE%`
     * * `%SUBTITLE%`
     * * `%ARTIST%`
     * * `%ALBUM%`
     * * `%WORDS%`
     * * `%WORDSMUSIC%`
     * * `%MUSIC%`
     * * `%TABBER%`
     * * `%COPYRIGHT%`
     */
    template: string;
    /**
     * Whether the element should be visible. Overriden by {@link NotationSettings.elements} if specified.
     */
    isVisible?: boolean;
    /**
     * The alignment of the element on the page.
     */
    textAlign: TextAlign;
    constructor(template?: string, isVisible?: boolean | undefined, textAlign?: TextAlign);
    static equals(a: HeaderFooterStyle, b: HeaderFooterStyle): boolean;
    buildText(score: Score): string;
    private static readonly _placeholderPattern;
}
/**
 * Defines the custom styles for Scores.
 * @json
 * @json_strict
 * @public
 */
export declare class ScoreStyle extends ElementStyle<ScoreSubElement> {
    /**
     * Changes additional style aspects fo the of the specified sub-element.
     */
    headerAndFooter: Map<ScoreSubElement, HeaderFooterStyle>;
    /**
     * The default styles applied to headers and footers if not specified
     */
    static readonly defaultHeaderAndFooter: Map<ScoreSubElement, HeaderFooterStyle>;
}
/**
 * The score is the root node of the complete
 * model. It stores the basic information of
 * a song and stores the sub components.
 * @json
 * @json_strict
 * @public
 */
export declare class Score {
    private _currentRepeatGroup;
    private _openedRepeatGroups;
    private _properlyOpenedRepeatGroups;
    /**
     * Resets all internal ID generators.
     */
    static resetIds(): void;
    /**
     * The album of this song.
     */
    album: string;
    /**
     * The artist who performs this song.
     */
    artist: string;
    /**
     * The owner of the copyright of this song.
     */
    copyright: string;
    /**
     * Additional instructions
     */
    instructions: string;
    /**
     * The author of the music.
     */
    music: string;
    /**
     * Some additional notes about the song.
     */
    notices: string;
    /**
     * The subtitle of the song.
     */
    subTitle: string;
    /**
     * The title of the song.
     */
    title: string;
    /**
     * The author of the song lyrics
     */
    words: string;
    /**
     * The author of this tablature.
     */
    tab: string;
    /**
     * The initial tempo of the song in BPM. The tempo might change via {@link MasterBar.tempoAutomations}.
     */
    get tempo(): number;
    /**
     * The name/label of the initial tempo.
     */
    get tempoLabel(): string;
    /**
     * Gets or sets a list of all masterbars contained in this song.
     * @json_add addMasterBar
     */
    masterBars: MasterBar[];
    /**
     * Gets or sets a list of all tracks contained in this song.
     * @json_add addTrack
     */
    tracks: Track[];
    /**
     * Defines how many bars are placed into the systems (rows) when displaying
     * multiple tracks unless a value is set in the systemsLayout.
     */
    defaultSystemsLayout: number;
    /**
     * Defines how many bars are placed into the systems (rows) when displaying
     * multiple tracks.
     */
    systemsLayout: number[];
    /**
     * Gets or sets the rendering stylesheet for this song.
     */
    stylesheet: RenderStylesheet;
    /**
     * Information about the backing track that can be used instead of the synthesized audio.
     */
    backingTrack: BackingTrack | undefined;
    /**
     * The style customizations for this item.
     */
    style?: ScoreStyle;
    rebuildRepeatGroups(): void;
    addMasterBar(bar: MasterBar): void;
    /**
     * Adds the given bar correctly into the current repeat group setup.
     * @param bar
     */
    private _addMasterBarToRepeatGroups;
    addTrack(track: Track): void;
    finish(settings: Settings): void;
    /**
     * Applies the given list of {@link FlatSyncPoint} to this song.
     * @param syncPoints The list of sync points to apply.
     * @since 1.6.0
     */
    applyFlatSyncPoints(syncPoints: FlatSyncPoint[]): void;
    /**
     * Exports all sync points in this song to a {@link FlatSyncPoint} list.
     * @since 1.6.0
     */
    exportFlatSyncPoints(): FlatSyncPoint[];
}
