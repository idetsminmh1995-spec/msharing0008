import { AlphaTabApiBase } from "./../../AlphaTabApiBase";
import { MidiFileFormat } from "./../../midi/MidiFile";
import { type IEventEmitterOfT } from "./../../EventEmitter";
import type { Track } from "./../../model/Track";
import { ProgressEventArgs } from "./../../ProgressEventArgs";
import type { Settings } from "./../../Settings";
import type { SettingsJson } from "./../../generated/SettingsJson";
/**
 * @target web
 * @public
 */
export declare class AlphaTabApi extends AlphaTabApiBase<SettingsJson | Settings> {
    /**
     * Initializes a new instance of the {@link AlphaTabApi} class.
     * @param element The HTML element into which alphaTab should be initialized.
     * @param settings The settings to use.
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'), { display: { scale: 1.2 }});
     * ```
     */
    constructor(element: HTMLElement, options: SettingsJson | Settings);
    /**
     * @inheritdoc
     */
    tex(tex: string, tracks?: number[] | 'all'): void;
    /**
     * Opens a popup window with the rendered music notation for printing.
     * @param width An optional custom width as CSS width that should be used. Best is to use a CSS width that is suitable for your preferred page size.
     * @param additionalSettings An optional parameter to specify additional setting values which should be respected during printing ({@since 1.2.0})
     * @remarks
     * Opens a popup window with the rendered music notation for printing. The default display of alphaTab in the browser is not very
     * suitable for printing. The items are lazy loaded, the width can be dynamic, and the scale might be better suitable for screens.
     * This function opens a popup window which is filled with a by-default A4 optimized view of the rendered score:
     *
     * * Lazy loading is disabled
     * * The scale is reduced to 0.8
     * * The stretch force is reduced to 0.8
     * * The width is optimized to A4. Portrait if the page-layout is used, landscape if the horizontal-layout is used.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.print();
     * api.print(undefined, { display: { barsPerRow: 5 } });
     * ```
     */
    print(width?: string, additionalSettings?: unknown): void;
    /**
     * Generates an SMF1.0 file and downloads it
     * @remarks
     * Generates a SMF1.0 compliant MIDI file of the currently loaded song and starts the download of it.
     * Please be aware that SMF1.0 does not support bends per note which might result in wrong bend effects
     * in case multiple bends are applied on the same beat (e.g. two notes bending or vibrato + bends).
     *
     * @category Methods - Core
     * @since 1.3.0
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.downloadMidi();
     * ```
     */
    downloadMidi(format?: MidiFileFormat): void;
    /**
     * @inheritdoc
     */
    changeTrackMute(tracks: Track[], mute: boolean): void;
    /**
     * @inheritdoc
     */
    changeTrackSolo(tracks: Track[], solo: boolean): void;
    /**
     * @inheritdoc
     */
    changeTrackVolume(tracks: Track[], volume: number): void;
    private _trackIndexesToTracks;
    /**
     * This event is fired when the SoundFont is being loaded.
     * @remarks
     * This event is fired when the SoundFont is being loaded and reports the progress accordingly.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.soundFontLoad.on((e) => {
     *     updateProgress(e.loaded, e.total);
     * });
     * ```
     */
    readonly soundFontLoad: IEventEmitterOfT<ProgressEventArgs>;
    /**
     * Triggers a load of the soundfont from the given URL.
     * @param url The URL from which to load the soundfont
     * @param append Whether to fully replace or append the data from the given soundfont.
     * @category Methods - Player
     * @since 0.9.4
     */
    loadSoundFontFromUrl(url: string, append: boolean): void;
}
