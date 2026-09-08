import { type IEventEmitter, type IEventEmitterOfT } from "./EventEmitter";
import type { MidiEventType } from "./midi/MidiEvent";
import { MidiFile } from "./midi/MidiFile";
import { type MidiTickLookup } from "./midi/MidiTickLookup";
import { type ICursorHandler } from "./CursorHandler";
import type { Beat } from "./model/Beat";
import type { Note } from "./model/Note";
import type { Score } from "./model/Score";
import type { Track } from "./model/Track";
import type { IContainer } from "./platform/IContainer";
import type { IUiFacade } from "./platform/IUiFacade";
import { PlayerMode } from "./PlayerSettings";
import type { IScoreRenderer, RenderHints } from "./rendering/IScoreRenderer";
import type { RenderFinishedEventArgs } from "./rendering/RenderFinishedEventArgs";
import type { BeatBounds } from "./rendering/utils/BeatBounds";
import { Bounds } from "./rendering/utils/Bounds";
import type { BoundsLookup } from "./rendering/utils/BoundsLookup";
import { ResizeEventArgs } from "./ResizeEventArgs";
import { type IScrollHandler } from "./ScrollHandlers";
import type { Settings } from "./Settings";
import { ActiveBeatsChangedEventArgs } from "./synth/ActiveBeatsChangedEventArgs";
import type { IAlphaSynth } from "./synth/IAlphaSynth";
import { AudioExportOptions, type IAudioExporter } from "./synth/IAudioExporter";
import type { ISynthOutputDevice } from "./synth/ISynthOutput";
import type { MidiEventsPlayedEventArgs } from "./synth/MidiEventsPlayedEventArgs";
import { PlaybackRange } from "./synth/PlaybackRange";
import type { PlaybackRangeChangedEventArgs } from "./synth/PlaybackRangeChangedEventArgs";
import { PlayerState } from "./synth/PlayerState";
import type { PlayerStateChangedEventArgs } from "./synth/PlayerStateChangedEventArgs";
import type { PositionChangedEventArgs } from "./synth/PositionChangedEventArgs";
/**
 * Holds information about the highlights shown for the playback range.
 * @public
 * @record
 */
export interface PlaybackHighlightChangeEventArgs {
    /**
     * The beat where the selection starts. undefined if there is no selection.
     */
    startBeat?: Beat;
    /**
     * The bounds of the start beat to determine its location and size.
     */
    startBeatBounds?: BeatBounds;
    /**
     * The beat where the selection ends. undefined if there is no selection.
     */
    endBeat?: Beat;
    /**
     * The bounds of the end beat to determine its location and size.
     */
    endBeatBounds?: BeatBounds;
    /**
     * A list of the individual rectangular areas where highlight blocks are placed.
     * If a selection spans multiple lines this array will hold all items.
     */
    highlightBlocks?: Bounds[];
}
/**
 * This class represents the public API of alphaTab and provides all logic to display
 * a music sheet in any UI using the given {@link IUiFacade}
 * @param <TSettings> The UI object holding the settings.
 * @public
 */
export declare class AlphaTabApiBase<TSettings> {
    private _startTime;
    private _trackIndexes;
    private _trackIndexLookup;
    private readonly _beatVisibilityChecker;
    private _isDestroyed;
    private _score;
    private _tracks;
    private _actualPlayerMode;
    private _player;
    private _renderer;
    private _defaultScrollHandler?;
    private _defaultCursorHandler?;
    private _customCursorHandler?;
    /**
     * An indicator by how many midi-ticks the song contents are shifted.
     * Grace beats at start might require a shift for the first beat to start at 0.
     * This information can be used to translate back the player time axis to the music notation.
     */
    get midiTickShift(): number;
    /**
     * The actual player mode which is currently active.
     * @remarks
     * Allows determining whether a backing track or the synthesizer is active in case automatic detection is enabled.
     * @category Properties - Player
     * @since 1.6.0
     */
    get actualPlayerMode(): PlayerMode;
    /**
     * The UI facade used for interacting with the user interface (like the browser).
     * @remarks
     * The implementation depends on the platform alphaTab is running in (e.g. the web version in the browser, WPF in .net etc.)
     * @category Properties - Core
     * @since 0.9.4
     */
    readonly uiFacade: IUiFacade<TSettings>;
    /**
     * The UI container that holds the whole alphaTab control.
     * @remarks
     * Gets the UI container that represents the element on which alphaTab was initialized. Note that this is not the raw instance, but a UI framework specific wrapper for alphaTab.
     * @category Properties - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const container = api.container;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * var container = api.Container;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * val container = api.container;
     * ```
     */
    readonly container: IContainer;
    /**
     * The score renderer used for rendering the music sheet.
     * @remarks
     * This is the low-level API responsible for the actual rendering engine.
     * Gets access to the underling {@link IScoreRenderer} that is used for the rendering.
     *
     * @category Properties - Core
     * @since 0.9.4
     */
    get renderer(): IScoreRenderer;
    /**
     * The score holding all information about the song being rendered
     * @category Properties - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * updateScoreInfo(api.score);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * UpdateScoreInfo(api.Score);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * updateScoreInfo(api.score)
     * ```
     */
    get score(): Score | null;
    /**
     * The settings that are used for rendering the music notation.
     * @remarks
     * Gets access to the underling {@link Settings} object that is currently used by alphaTab.
     *
     * @category Properties - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * showSettingsModal(api.settings);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * ShowSettingsDialog(api.Settings);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * showSettingsDialog(api.settings)
     * ```
     */
    settings: Settings;
    /**
     * The list of the tracks that are currently rendered.
     *
     * @category Properties - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * highlightCurrentTracksInTrackSelector(api.tracks);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * HighlightCurrentTracksInTrackSelector(api.Tracks);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * highlightCurrentTracksInTrackSelector(api.tracks)
     * ```
     */
    get tracks(): Track[];
    /**
     * The UI container that will hold all rendered results.
     * @since 0.9.4
     * @category Properties - Core
     */
    readonly canvasElement: IContainer;
    /**
     * Initializes a new instance of the {@link AlphaTabApiBase} class.
     * @param uiFacade The UI facade to use for interacting with the user interface.
     * @param settings The UI settings object to use for loading the settings.
     */
    constructor(uiFacade: IUiFacade<TSettings>, settings: TSettings);
    private _setupPlayerWrapper;
    /**
     * Destroys the alphaTab control and restores the initial state of the UI.
     * @remarks
     * This function destroys the alphaTab control and tries to restore the initial state of the UI. This might be useful if
     * our website is quite dynamic and you need to uninitialize alphaTab from an element again. After destroying alphaTab
     * it cannot be used anymore. Any further usage leads to unexpected behavior.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.destroy();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Destroy();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.destroy()
     * ```
     */
    destroy(): void;
    /**
     * Applies any changes that were done to the settings object.
     * @remarks
     * It also informs the {@link renderer} about any new values to consider.
     * By default alphaTab will not trigger any re-rendering or settings update just if the settings object itself was changed. This method must be called
     * to trigger an update of the settings in all components. Then a re-rendering can be initiated using the {@link render} method.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.settings.display.scale = 2.0;
     * api.updateSettings();
     * api.render();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     *
     * api.Settings.Display.Scale = 2.0;
     * api.UpdateSettings();
     * api.Render()
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     *
     * api.settings.display.scale = 2.0
     * api.updateSettings()
     * api.render()
     * ```
     */
    updateSettings(): void;
    private _updateRenderer;
    /**
     * Initiates a load of the score using the given data.
     * @returns true if the data object is supported and a load was initiated, otherwise false
     * @param scoreData The data container supported by {@link IUiFacade}.  The supported types is depending on the platform:
     *
     * * A `alphaTab.model.Score` instance (all platforms)
     * * A `ArrayBuffer` or `Uint8Array` containing one of the supported file formats (all platforms, native byte array or input streams on other platforms)
     * * A url from where to download the binary data of one of the supported file formats (browser only)
     *
     * @param trackIndexes The indexes of the tracks from the song that should be rendered. If not provided, the first track of the
     * song will be shown.
     * @category Methods - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.load('/assets/MyFile.gp');
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Load(System.IO.File.OpenRead("MyFile.gp"));
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * contentResolver.openInputStream(uri).use {
     *     api.load(it)
     * }
     * ```
     */
    load(scoreData: unknown, trackIndexes?: number[]): boolean;
    /**
     * Initiates a rendering of the given score.
     * @param score The score containing the tracks to be rendered.
     * @param trackIndexes The indexes of the tracks from the song that should be rendered. If not provided, the first track of the
     * song will be shown.
     * @param renderHints Additional hints to respect during layouting and rendering.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.RenderScore(generateScore(),[ 2, 3 ]);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.RenderScore(GenerateScore(), new double[] { 2, 3 });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.renderScore(generateScore(), alphaTab.collections.DoubleList(2, 3));
     * ```
     */
    renderScore(score: Score, trackIndexes?: number[], renderHints?: RenderHints): void;
    /**
     * Renders the given list of tracks.
     * @param tracks The tracks to render. They must all belong to the same score.
     * @param renderHints Additional hints to respect during layouting and rendering.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.renderTracks([api.score.tracks[0], api.score.tracks[1]]);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.RenderTracks(new []{
     *     api.Score.Tracks[2],
     *     api.Score.Tracks[3]
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.renderTracks(alphaTab.collections.List(
     *     api.score.tracks[2],
     *     api.score.tracks[3]
     * }
     * ```
     */
    renderTracks(tracks: Track[], renderHints?: RenderHints): void;
    private _internalRenderTracks;
    /**
     * @internal
     */
    triggerResize(): void;
    private _appendRenderResult;
    private _updateRenderResult;
    /**
     * Tells alphaTab to render the given alphaTex.
     * @param tex The alphaTex code to render.
     * @param tracks If set, the given tracks will be rendered, otherwise the first track only will be rendered.
     * @category Methods - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.tex("\\title 'Test' . 3.3.4");
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Tex("\\title 'Test' . 3.3.4");
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.tex("\\title 'Test' . 3.3.4");
     * ```
     */
    tex(tex: string, tracks?: number[]): void;
    /**
     * Triggers a load of the soundfont from the given data.
     * @remarks
     * AlphaTab only supports SoundFont2 and SoundFont3 {@since 1.4.0} encoded soundfonts for loading. To load a soundfont the player must be enabled in advance.
     *
     * @param data The data object to decode. The supported data types is depending on the platform.
     *
     * * A `ArrayBuffer` or `Uint8Array` (all platforms, native byte array or input streams on other platforms)
     * * A url from where to download the binary data of one of the supported file formats (browser only)
     *
     * @param append Whether to fully replace or append the data from the given soundfont.
     * @returns `true` if the passed in object is a supported format and loading was initiated, otherwise `false`.
     *
     * @category Methods - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.loadSoundFont('/assets/MyFile.sf2');
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.LoadSoundFont(System.IO.File.OpenRead("MyFile.sf2"));
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * contentResolver.openInputStream(uri).use {
     *     api.loadSoundFont(it)
     * }
     * ```
     */
    loadSoundFont(data: unknown, append?: boolean): boolean;
    /**
     * Unloads all presets from previously loaded SoundFonts.
     * @remarks
     * This function resets the player internally to not have any SoundFont loaded anymore. This allows you to reduce the memory usage of the page
     * if multiple partial SoundFonts are loaded via `loadSoundFont(..., true)`. Depending on the workflow you might also just want to use `loadSoundFont(..., false)` once
     * instead of unloading the previous SoundFonts.
     *
     * @category Methods - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.loadSoundFont('/assets/guitars.sf2', true);
     * api.loadSoundFont('/assets/pianos.sf2', true);
     * // ..
     * api.resetSoundFonts();
     * api.loadSoundFont('/assets/synths.sf2', true);
     * ```
     *
     * @example
     * C#
     * ```cs
     *var api = new AlphaTabApi<MyControl>(...);
     *api.LoadSoundFont(System.IO.File.OpenRead("guitars.sf2"), true);
     *api.LoadSoundFont(System.IO.File.OpenRead("pianos.sf2"), true);
     *...
     *api.ResetSoundFonts();
     *api.LoadSoundFont(System.IO.File.OpenRead("synths.sf2"), true);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.loadSoundFont(readResource("guitars.sf2"), true)
     * api.loadSoundFont(readResource("pianos.sf2"), true)
     * ...
     * api.resetSoundFonts()
     * api.loadSoundFont(readResource("synths.sf2"), true)
     * ```
     */
    resetSoundFonts(): void;
    /**
     * Initiates a re-rendering of the current setup.
     * @param renderHints Additional hints to respect during layouting and rendering.
     * @remarks
     * If rendering is not yet possible, it will be deferred until the UI changes to be ready for rendering.
     *
     * @category Methods - Core
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.render();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Render();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.render()
     * ```
     */
    render(renderHints?: RenderHints): void;
    /**
     * A custom cursor handler which will be used to update the cursor positions during playback.
     *
     * @category Properties - Player
     * @since 1.8.1
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.customCursorHandler = {
     *   _customAdorner: undefined,
     *   onAttach(cursors) {
     *     this._customAdorner = document.createElement('div');
     *     this._customAdorner.classList.add('cursor-adorner');
     *     cursors.cursorWrapper.element.appendChild(this._customAdorner);
     *   },
     *   onDetach(cursors) { this._customAdorner.remove(); },
     *   placeBarCursor(barCursor, beatBounds) {
     *     const barBoundings = beatBounds.barBounds.masterBarBounds;
     *     const barBounds = barBoundings.visualBounds;
     *     barCursor.setBounds(barBounds.x, barBounds.y, barBounds.w, barBounds.h);
     *   },
     *   placeBeatCursor(beatCursor, beatBounds, startBeatX) {
     *     const barBoundings = beatBounds.barBounds.masterBarBounds;
     *     const barBounds = barBoundings.visualBounds;
     *     beatCursor.transitionToX(0, startBeatX);
     *     beatCursor.setBounds(startBeatX, barBounds.y, 1, barBounds.h);
     *     this._customAdorner.style.left = startBeatX + 'px';
     *     this._customAdorner.style.top = (barBounds.y - 10) + 'px';
     *     this._customAdorner.style.width = '1px';
     *     this._customAdorner.style.height = '10px';
     *     this._customAdorner.style.transition = 'left 0ms linear'; // stop animation
     *   },
     *   transitionBeatCursor(beatCursor, beatBounds, startBeatX, endBeatX, duration, cursorMode) {
     *     this._customAdorner.style.transition = `left ${duration}ms linear`; // start animation
     *     this._customAdorner.style.left = endBeatX + 'px';
     *   }
     * }
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.CustomCursorHandler = new CustomCursorHandler();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.customCursorHandler = CustomCursorHandler();
     * ```
     */
    get customCursorHandler(): ICursorHandler | undefined;
    set customCursorHandler(value: ICursorHandler | undefined);
    private _tickCache;
    /**
     * A custom scroll handler which will be used to handle scrolling operations during playback.
     *
     * @category Properties - Player
     * @since 1.8.0
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.customScrollHandler = {
     *   forceScrollTo(currentBeatBounds) {
     *     const scroll = api.uiFacade.getScrollElement();
     *     api.uiFacade.scrollToY(scroll, currentBeatBounds.barBounds.masterBarBounds.realBounds.y, 0);
     *   },
     *   onBeatCursorUpdating(startBeat, endBeat, cursorMode, relativePosition, actualBeatCursorStartX, actualBeatCursorEndX, actualBeatCursorTransitionDuration) {
     *     const scroll = api.uiFacade.getScrollElement();
     *     api.uiFacade.scrollToY(scroll, startBeat.barBounds.masterBarBounds.realBounds.y, 0);
     *   }
     * }
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.CustomScrollHandler = new CustomScrollHandler();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.customScrollHandler = CustomScrollHandler();
     * ```
     */
    customScrollHandler?: IScrollHandler;
    /**
     * The tick cache allowing lookup of midi ticks to beats.
     * @remarks
     * Gets the tick cache allowing lookup of midi ticks to beats. If the player is enabled, a midi file will be generated
     * for the loaded {@link Score} for later playback. During this generation this tick cache is filled with the
     * exact midi ticks when beats are played.
     *
     * The {@link MidiTickLookup.findBeat} method allows a lookup of the beat related to a given input midi tick.
     *
     * @category Properties - Player
     * @since 1.2.3
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const lookupResult = api.tickCache.findBeat(new Set([0, 1]), 100);
     * const currentBeat = lookupResult?.currentBeat;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * var lookupResult = api.TickCache.FindBeat(new AlphaTab.Core.EcmaScript.Set(0, 1), 100);
     * var currentBeat = lookupResult?.CurrentBeat;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * val lookupResult = api.tickCache.findBeat(alphaTab.core.ecmaScript.Set(0, 1), 100);
     * val currentBeat = lookupResult?.CurrentBeat;
     * ```
     */
    get tickCache(): MidiTickLookup | null;
    /**
     * The tick cache allowing lookup of midi ticks to beats.
     * @remarks
     * In older versions of alphaTab you can access the `boundsLookup` via {@link IScoreRenderer.boundsLookup} on {@link renderer}.
     *
     * After the rendering completed alphaTab exposes via this lookup the location of the individual
     * notation elements. The lookup provides fast access to the bars and beats at a given location.
     * If the {@link CoreSettings.includeNoteBounds} option was activated also the location of the individual notes can be obtained.
     *
     * The property contains a `BoundsLookup` instance which follows a hierarchical structure that represents
     * the tree of rendered elements.
     *
     * The hierarchy is: `staffSystems > bars(1) > bars(2) > beats > notes`
     *
     * * `staffSystems` - Represent the bounds of the individual systems ("rows") where staves are contained.
     * * `bars(1)` - Represent the bounds of all bars for a particular master bar across all tracks.
     * * `bars(2)` - Represent the bounds of an individual bar of a track. The bounds on y-axis span the region of the staff and notes might exceed this bounds.
     * * `beats` - Represent the bounds of the individual beats within a track. The bounds on y-axis are equal to the bar bounds.
     * * `notes` - Represent the bounds of the individual note heads/numbers within a track.
     *
     * Each bounds hierarchy have a `visualBounds` and `realBounds`.
     *
     * * `visualBounds` - Represent the area covering all visually visible elements
     * * `realBounds` - Represents the actual bounds of the elements in this beat including whitespace areas.
     * * `noteHeadBounds` (only on `notes` level) - Represents the area of the note heads or number based on the staff
     *
     * You can check out the individual sizes and regions.
     * @category Properties - Core
     * @since 1.5.0
     */
    get boundsLookup(): BoundsLookup | null;
    /**
     * The alphaSynth player used for playback.
     * @remarks
     * This is the low-level API to the Midi synthesizer used for playback.
     * Gets access to the underling {@link IAlphaSynth} that is used for the audio playback.
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * setupPlayerEvents(api.settings);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * SetupPlayerEvents(api.Player);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * setupPlayerEvents(api.player)
     * ```
     */
    get player(): IAlphaSynth | null;
    /**
     * Whether the player is ready for starting the playback.
     * @remarks
     * Gets whether the synthesizer is ready for playback. The player is ready for playback when
     * all background workers are started, the audio output is initialized, a soundfont is loaded, and a song was loaded into the player as midi file.
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * if(api.isReadyForPlayback)) api.play();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * if(api.IsReadyForPlayback) api.Play();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * if (api.isReadyForPlayback) api.play()
     * ```
     */
    get isReadyForPlayback(): boolean;
    /**
     * The current player state.
     * @remarks
     * Gets the current player state, meaning whether it is paused or playing.
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * if(api.playerState != alphaTab.synth.PlayerState.Playing) api.play();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * if(api.PlayerState != PlayerState.Playing) api.Play();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * if (api.playerState != PlayerState.Playing) api.play()
     * ```
     */
    get playerState(): PlayerState;
    /**
     * The current master volume as percentage (0-1).
     * @remarks
     * Gets or sets the master volume of the overall audio being played. The volume is annotated in percentage where 1.0 would be the normal volume and 0.5 only 50%.
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.masterVolume = 0.5;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MasterVolume = 0.5;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.masterVolume = 0.5
     * ```
     */
    get masterVolume(): number;
    set masterVolume(value: number);
    /**
     * The metronome volume as percentage (0-1).
     * @remarks
     * Gets or sets the volume of the metronome. By default the metronome is disabled but can be enabled by setting the volume different.
     * @category Properties - Player
     * @defaultValue `0`
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.metronomeVolume = 0.5;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MetronomeVolume = 0.5;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.metronomeVolume = 0.5
     * ```
     */
    get metronomeVolume(): number;
    set metronomeVolume(value: number);
    /**
     * The volume of the count-in metronome ticks.
     * @remarks
     * Gets or sets the volume of the metronome during the count-in of the song. By default the count-in is disabled but can be enabled by setting the volume different.
     * @category Properties - Player
     * @since 1.1.0
     * @defaultValue `0`
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.countInVolume = 0.5;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.CountInVolume = 0.5;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.countInVolume = 0.5
     * ```
     */
    get countInVolume(): number;
    set countInVolume(value: number);
    /**
     * The midi events which will trigger the `midiEventsPlayed` event
     * @remarks
     * Gets or sets the midi events which will trigger the `midiEventsPlayed` event. With this filter set you can enable
     * that alphaTab will signal any midi events as they are played by the synthesizer. This allows reacing on various low level
     * audio playback elements like notes/rests played or metronome ticks.
     *
     * Refer to the [related guide](https://alphatab.net/docs/guides/handling-midi-events) to learn more about this feature.
     * @defaultValue `[]`
     * @category Properties - Player
     * @since 1.2.0
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.AlphaTabMetronome];
     * api.midiEventsPlayed.on(function(e) {
     *   for(const midi of e.events) {
     *     if(midi.isMetronome) {
     *       console.log('Metronome tick ' + midi.metronomeNumerator);
     *     }
     *   }
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MidiEventsPlayedFilter = new MidiEventType[] { AlphaTab.Midi.MidiEventType.AlphaTabMetronome };
     * api.MidiEventsPlayed.On(e =>
     * {
     *   foreach(var midi of e.events)
     *   {
     *     if(midi is AlphaTab.Midi.AlphaTabMetronomeEvent metronome)
     *     {
     *       Console.WriteLine("Metronome tick " + metronome.MetronomeNumerator);
     *     }
     *   }
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...);
     * api.midiEventsPlayedFilter = alphaTab.collections.List<alphaTab.midi.MidiEventType>( alphaTab.midi.MidiEventType.AlphaTabMetronome )
     * api.midiEventsPlayed.on { e ->
     *   for (midi in e.events) {
     *     if(midi instanceof alphaTab.midi.AlphaTabMetronomeEvent && midi.isMetronome) {
     *       println("Metronome tick " + midi.tick);
     *     }
     *   }
     * }
     * ```
     */
    get midiEventsPlayedFilter(): MidiEventType[];
    set midiEventsPlayedFilter(value: MidiEventType[]);
    /**
     * The position within the song in midi ticks.
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.tickPosition = 4000;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.TickPosition = 4000;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.tickPosition = 4000
     * ```
     */
    get tickPosition(): number;
    set tickPosition(value: number);
    /**
     * The position within the song in milliseconds
     * @category Properties - Player
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.timePosition = 4000;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.TimePosition = 4000;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.timePosition = 4000
     * ```
     */
    get timePosition(): number;
    set timePosition(value: number);
    /**
     * The total length of the song in midi ticks.
     * @category Properties - Player
     * @since 1.6.2
     */
    get endTick(): number;
    /**
     * The total length of the song in milliseconds.
     * @category Properties - Player
     * @since 1.6.2
     */
    get endTime(): number;
    /**
     * The range of the song that should be played.
     * @remarks
     * Gets or sets the range of the song that should be played. The range is defined in midi ticks or the whole song is played if the range is set to null
     * @category Properties - Player
     * @defaultValue `null`
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playbackRange = { startTick: 1000, endTick: 50000 };
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlaybackRange = new PlaybackRange { StartTick = 1000, EndTick = 50000 };
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playbackRange = PlaybackRange.apply {
     *     startTick = 1000
     *     endTick = 50000
     * }
     * ```
     */
    get playbackRange(): PlaybackRange | null;
    set playbackRange(value: PlaybackRange | null);
    /**
     * The current playback speed as percentage
     * @remarks
     * Controls the current playback speed as percentual value. Normal speed is 1.0 (100%) and 0.5 would be 50%.
     * @category Properties - Player
     * @defaultValue `1`
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playbackSpeed = 0.5;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlaybackSpeed = 0.5;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playbackSpeed = 0.5
     * ```
     */
    get playbackSpeed(): number;
    set playbackSpeed(value: number);
    /**
     * Whether the playback should automatically restart after it finished.
     * @remarks
     * This setting controls whether the playback should automatically restart after it finished to create a playback loop.
     * @category Properties - Player
     * @defaultValue `false`
     * @since 0.9.4
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.isLooping = true;
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.IsLooping = true;
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.isLooping = true
     * ```
     */
    get isLooping(): boolean;
    set isLooping(value: boolean);
    private _destroyPlayer;
    /**
     *
     * @returns true if a new player was created, false if no player was created (includes destroy & reuse of the current one)
     */
    private _setupOrDestroyPlayer;
    /**
     * Re-creates the midi for the current score and loads it.
     * @remarks
     * This will result in the player to stop playback. Some setting changes require re-genration of the midi song.
     * @category Methods - Player
     * @since 1.6.0
     */
    loadMidiForScore(): void;
    /**
     * Triggers an update of the sync points for the current score after modification within the data model
     * @category Methods - Player
     * @since 1.6.0
     */
    updateSyncPoints(): void;
    /**
     * Changes the volume of the given tracks.
     * @param tracks The tracks for which the volume should be changed.
     * @param volume The volume to set for all tracks in percent (0-1)
     *
     * @remarks
     * This will result in a volume change of the primary and secondary midi channel that the track uses for playback.
     * If the track shares the channels with another track, all related tracks will be changed as they cannot be distinguished.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.changeTrackVolume([api.score.tracks[0], api.score.tracks[1]], 1.5);
     * api.changeTrackVolume([api.score.tracks[2]], 0.5);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, 1.5);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[2] }, 0.5);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...);
     * api.changeTrackVolume(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[0], api.score.tracks[1]), 1.5);
     * api.changeTrackVolume(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[2]), 0.5);
     * ```
     */
    changeTrackVolume(tracks: Track[], volume: number): void;
    /**
     * Changes the given tracks to be played solo or not.
     * @param tracks The list of tracks to play solo or not.
     * @param solo If set to true, the tracks will be added to the solo list. If false, they are removed.
     *
     * @remarks
     * If any track is set to solo, all other tracks are muted, unless they are also flagged as solo.
     * This will result in a solo playback of the primary and secondary midi channel that the track uses for playback.
     * If the track shares the channels with another track, all related tracks will be played as they cannot be distinguished.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.changeTrackSolo([api.score.tracks[0], api.score.tracks[1]], true);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackSolo(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, true);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.changeTrackSolo(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[0], api.score.tracks[1]), true);
     * ```
     */
    changeTrackSolo(tracks: Track[], solo: boolean): void;
    /**
     * Changes the given tracks to be muted or not.
     * @param tracks The list of track to mute or unmute.
     * @param mute If set to true, the tracks will be muted. If false they are unmuted.
     *
     * @remarks
     * This will result in a muting of the primary and secondary midi channel that the track uses
     * for playback. If the track shares the channels with another track, all tracks will be muted as during playback they cannot be distinguished.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.changeTrackMute([api.score.tracks[0], api.score.tracks[1]], true);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackMute(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, true);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.changeTrackMute(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[0], api.score.tracks[1]), true);
     * ```
     */
    changeTrackMute(tracks: Track[], mute: boolean): void;
    /**
     * Changes the pitch transpose applied to the given tracks.
     * @param tracks The list of tracks to change.
     * @param semitones The number of semitones to apply as pitch offset.
     *
     * @remarks
     * These pitches are additional to the ones applied to the song via the settings and data model and allows a more live-update via a UI.
     * @category Methods - Player
     * @since 1.4.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.changeTrackTranspositionPitch([api.score.tracks[0], api.score.tracks[1]], 3);
     * api.changeTrackTranspositionPitch([api.score.tracks[2]], 2);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackTranspositionPitch(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, 3);
     * api.ChangeTrackTranspositionPitch(new Track[] { api.Score.Tracks[2] }, 3);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...);
     * api.changeTrackTranspositionPitch(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[0], api.score.tracks[1]), 3);
     * api.changeTrackTranspositionPitch(alphaTab.collections.List<alphaTab.model.Track>(api.score.tracks[2]), 2);
     * ```
     */
    changeTrackTranspositionPitch(tracks: Track[], semitones: number): void;
    /**
     * Starts the playback of the current song.
     * @returns true if the playback was started, otherwise false. Reasons for not starting can be that the player is not ready or already playing.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.play();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Play();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.play()
     * ```
     */
    play(): boolean;
    /**
     * Pauses the playback of the current song.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.pause();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Pause();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.pause();
     * ```
     */
    pause(): void;
    /**
     * Toggles between play/pause depending on the current player state.
     * @remarks
     * If the player was playing, it will pause. If it is paused, it will initiate a play.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playPause();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayPause();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playPause()
     * ```
     */
    playPause(): void;
    /**
     * Stops the playback of the current song, and moves the playback position back to the start.
     * @remarks
     * If a dedicated playback range is selected, it will move the playback position to the start of this range, not the whole song.
     * @category Methods - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.stop();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Stop();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.stop()
     * ```
     */
    stop(): void;
    /**
     * Triggers the play of the given beat.
     * @param beat the single beat to play
     * @remarks
     * This will stop the any other current ongoing playback.
     * This method can be used in applications when individual beats need to be played for lesson or editor style purposes.
     * The player will not report any change in state or playback position during the playback of the requested beat.
     * It is a playback of audio separate to the main song playback.
     * @returns true if the playback was started, otherwise false. Reasons for not starting can be that the player is not ready or already playing.
     * @category Methods - Player
     * @since 1.1.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playBeat(api.score.tracks[0].staves[0].bars[0].voices[0].beats[0]);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayBeat(api.Score.Tracks[0].Staves[0].Bars[0].Voices[0].Beats[0]);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playBeat(api.score.tracks[0].staves[0].bars[0].voices[0].beats[0])
     * ```
     */
    playBeat(beat: Beat): void;
    /**
     * Triggers the play of the given note.
     * @param note the single note to play
     * @remarks
     * This will stop the any other current ongoing playback.
     * This method can be used in applications when individual notes need to be played for lesson or editor style purposes.
     * The player will not report any change in state or playback position during the playback of the requested note.
     * It is a playback of audio separate to the main song playback.
     * @category Methods - Player
     * @since 1.1.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playNote(api.score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0]);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayNote(api.Score.Tracks[0].Staves[0].Bars[0].Voices[0].Beats[0].Notes[0]);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playNote(api.score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0]);
     * ```
     */
    playNote(note: Note): void;
    private _cursorWrapper;
    private _barCursor;
    private _beatCursor;
    private _selectionWrapper;
    private _previousTick;
    private _currentBeat;
    private _currentBeatBounds;
    private _isInitialBeatCursorUpdate;
    private _previousStateForCursor;
    private _previousCursorCache;
    private _destroyCursors;
    private _createCursors;
    private _updateCursors;
    private _cursorHandlerMode;
    private _updateCursorHandler;
    private _scrollHandlerMode;
    private _scrollHandlerVertical;
    private _updateScrollHandler;
    /**
     * updates the cursors to highlight the beat at the specified tick position
     * @param tick
     * @param stop
     * @param shouldScroll whether we should scroll to the bar (if scrolling is active)
     */
    private _cursorUpdateTick;
    /**
     * updates the cursors to highlight the specified beat
     */
    private _cursorUpdateBeat;
    /**
     * Initiates a scroll to the cursor.
     * @since 1.2.3
     * @category Methods - Player
     */
    scrollToCursor(): void;
    private _internalCursorUpdateBeat;
    /**
     * This event is fired when the played beat changed.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playedBeatChanged.on((beat) => {
     *     updateFretboard(beat);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayedBeatChanged.On(beat =>
     * {
     *     UpdateFretboard(beat);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playedBeatChanged.on { beat ->
     *     updateFretboard(beat)
     * }
     * ```
     *
     */
    readonly playedBeatChanged: IEventEmitterOfT<Beat>;
    private _onPlayedBeatChanged;
    /**
     * This event is fired when the currently active beats across all tracks change.
     *
     * @remarks
     * Unlike the {@link playedBeatChanged} event this event contains the beats of all tracks and voices independent of them being rendered.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.3
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.activeBeatsChanged.on(args => {
     *    updateHighlights(args.activeBeats);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ActiveBeatsChanged.On(args =>
     * {
     *     UpdateHighlights(args.ActiveBeats);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.activeBeatsChanged.on { args ->
     *     updateHighlights(args.activeBeats)
     * }
     * ```
     *
     */
    readonly activeBeatsChanged: IEventEmitterOfT<ActiveBeatsChangedEventArgs>;
    private _onActiveBeatsChanged;
    private _isBeatMouseDown;
    private _isNoteMouseDown;
    private _selectionStart?;
    private _selectionEnd?;
    /**
     * This event is fired whenever a the user presses the mouse button on a beat.
     * @eventProperty
     * @category Events - Player
     * @since 0.9.7
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.beatMouseDown.on((beat) => {
     *     startSelectionOnBeat(beat);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.BeatMouseDown.On(beat =>
     * {
     *     StartSelectionOnBeat(args);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.beatMouseDown.on { beat ->
     *     startSelectionOnBeat(args)
     * }
     * ```
     */
    readonly beatMouseDown: IEventEmitterOfT<Beat>;
    /**
     * This event is fired whenever the user moves the mouse over a beat after the user already pressed the button on a beat.
     * @eventProperty
     * @category Events - Player
     * @since 0.9.7
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.beatMouseMove.on((beat) => {
     *     expandSelectionToBeat(beat);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.BeatMouseMove.On(beat =>
     * {
     *     ExpandSelectionToBeat(beat);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.beatMouseMove.on { beat ->
     *     expandSelectionToBeat(beat)
     * }
     * ```
     */
    readonly beatMouseMove: IEventEmitterOfT<Beat>;
    /**
     * This event is fired whenever the user releases the mouse after a mouse press on a beat.
     * @remarks
     * This event is fired regardless of whether the mouse was released on a beat.
     * The parameter is null if the mouse was released somewhere beside the beat.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.7
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.beatMouseUp.on((beat) => {
     *     hideSelection(beat);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.BeatMouseUp.On(beat =>
     * {
     *     HideSelection(beat);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.beatMouseUp.on { beat ->
     *     hideSelection(beat)
     * }
     * ```
     */
    readonly beatMouseUp: IEventEmitterOfT<Beat | null>;
    /**
     * This event is fired whenever a the user presses the mouse button on a note head/number.
     * @remarks
     * This event is fired whenever a the user presses the mouse button on a note.
     * It is only fired if {@link CoreSettings.includeNoteBounds} was set to `true` because
     * only then this hit detection can be done. A click on a note is considered if the note head or the note number on tabs are clicked as documented in {@link boundsLookup}.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.3
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.noteMouseDown.on((note) => {
     *     api.playNote(note);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.NoteMouseDown.On(note =>
     * {
     *     api.PlayNote(note);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.noteMouseDown.on { note ->
     *     api.playNote(note)
     * }
     * ```
     *
     */
    readonly noteMouseDown: IEventEmitterOfT<Note>;
    /**
     * This event is fired whenever the user moves the mouse over a note after the user already pressed the button on a note.
     * @remarks
     * This event is fired whenever the user moves the mouse over a note after the user already pressed the button on a note.
     * It is only fired if {@link CoreSettings.includeNoteBounds} was set to `true` because
     * only then this hit detection can be done. A click on a note is considered if the note head or the note number on tabs are clicked as documented in {@link boundsLookup}
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.3
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.noteMouseMove.on((note) => {
     *     changeNote(note)
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.NoteMouseMove.On(note =>
     * {
     *     ChangeNote(note);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.noteMouseMove.on { note ->
     *     changeNote(note)
     * }
     * ```
     *
     */
    readonly noteMouseMove: IEventEmitterOfT<Note>;
    /**
     * This event is fired whenever the user releases the mouse after a mouse press on a note.
     * @remarks
     * This event is fired whenever a the user presses the mouse button on a note.
     * This event is fired regardless of whether the mouse was released on a note.
     * The parameter is null if the mouse was released somewhere beside the note.
     * It is only fired if {@link CoreSettings.includeNoteBounds} was set to `true` because
     * only then this hit detection can be done. A click on a note is considered if the note head or the note number on tabs are clicked as documented in the {@link boundsLookup}.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.3
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.noteMouseUp.on((note) => {
     *     api.playNote(note);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.NoteMouseUp.On(note =>
     * {
     *     api.PlayNote(note);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.noteMouseUp.on { note ->
     *     api.playNote(note)
     * }
     * ```
     *
     */
    readonly noteMouseUp: IEventEmitterOfT<Note | null>;
    private get _hasCursor();
    private _onBeatMouseDown;
    private _onNoteMouseDown;
    private _onBeatMouseMove;
    private _onNoteMouseMove;
    private _onBeatMouseUp;
    private _seekToBeat;
    private _onNoteMouseUp;
    private _updateSelectionCursor;
    private _setupClickHandling;
    /**
     * Places the highlight markers at the specified start and end-beat range.
     * @param startBeat The start beat where the selection should start
     * @param endBeat The end beat where the selection should end.
     *
     * @remarks
     * Unlike actually setting {@link playbackRange} this method only places the selection markers without actually
     * changing the playback range. This method can be used when building custom selection systems (e.g. having draggable handles).
     *
     * @category Methods - Player
     * @since 1.8.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const startBeat = api.score.tracks[0].staves[0].bars[0].voices[0].beats[0];
     * const endBeat = api.score.tracks[0].staves[0].bars[3].voices[0].beats[0];
     * api.highlightPlaybackRange(startBeat, endBeat);
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, 1.5);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[2] }, 0.5);
     * var startBeat = api.Score.Tracks[0].Staves[0].Bars[0].Voices[0].Beats[0];
     * var endBeat = api.Score.Tracks[0].Staves[0].Bars[3].Voices[0].Beats[0];
     * api.HighlightPlaybackRange(startBeat, endBeat);
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * val startBeat = api.score.tracks[0].staves[0].bars[0].voices[0].beats[0]
     * val endBeat = api.score.tracks[0].staves[0].bars[3].voices[0].beats[0]
     * api.highlightPlaybackRange(startBeat, endBeat)
     * ```
     */
    highlightPlaybackRange(startBeat: Beat, endBeat: Beat): void;
    /**
     * Applies the playback range from the currently highlighted range.
     *
     * @remarks
     * This method can be used when building custom selection systems (e.g. having draggable handles).
     *
     * @category Methods - Player
     * @since 1.8.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const startBeat = api.score.tracks[0].staves[0].bars[0].voices[0].beats[0];
     * const endBeat = api.score.tracks[0].staves[0].bars[3].voices[0].beats[0];
     * api.highlightPlaybackRange(startBeat, endBeat);
     * api.applyPlaybackRangeFromHighlight();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[0], api.Score.Tracks[1] }, 1.5);
     * api.ChangeTrackVolume(new Track[] { api.Score.Tracks[2] }, 0.5);
     * var startBeat = api.Score.Tracks[0].Staves[0].Bars[0].Voices[0].Beats[0];
     * var endBeat = api.Score.Tracks[0].Staves[0].Bars[3].Voices[0].Beats[0];
     * api.HighlightPlaybackRange(startBeat, endBeat);
     * api.ApplyPlaybackRangeFromHighlight();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * val startBeat = api.score.tracks[0].staves[0].bars[0].voices[0].beats[0]
     * val endBeat = api.score.tracks[0].staves[0].bars[3].voices[0].beats[0]
     * api.highlightPlaybackRange(startBeat, endBeat)
     * api.applyPlaybackRangeFromHighlight()
     * ```
     */
    applyPlaybackRangeFromHighlight(): void;
    private _internalApplyPlaybackRangeFromHighlight;
    /**
     * Clears the highlight markers marking the currently selected playback range.
     *
     * @remarks
     * Unlike actually setting {@link playbackRange} this method only clears the selection markers without actually
     * changing the playback range. This method can be used when building custom selection systems (e.g. having draggable handles).
     *
     * @category Methods - Player
     * @since 1.8.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.clearPlaybackRangeHighlight();
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.clearPlaybackRangeHighlight();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.clearPlaybackRangeHighlight()
     * ```
     */
    clearPlaybackRangeHighlight(): void;
    /**
     * This event is fired the shown highlights for the selected playback range changes.
     *
     * @remarks
     * This event is fired already during selection and not only when the selection is completed.
     * This event can be used to place additional custom selection markers (like drag handles).
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.8.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playbackRangeHighlightChanged.on(e => {
     *    updateSelectionHandles(e);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlaybackRangeHighlightChanged.On(e =>
     * {
     *    UpdateSelectionHandles(e);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playbackRangeHighlightChanged.on { e ->
     *     updateSelectionHandles(e)
     * }
     * ```
     *
     */
    readonly playbackRangeHighlightChanged: IEventEmitterOfT<PlaybackHighlightChangeEventArgs>;
    private _cursorSelectRange;
    /**
     * This event is fired whenever a new song is loaded.
     * @remarks
     * This event is fired whenever a new song is loaded or changing due to {@link renderScore} or {@link renderTracks} calls.
     * It is fired after the transposition midi pitches from the settings were applied, but before any midi is generated or rendering is started.
     * This allows any modification of the score before further processing.
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.scoreLoaded.on((score) => {
     *     updateSongInformationInUi(score);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.ScoreLoaded.On(score =>
     * {
     *     UpdateSongInformationInUi(score);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.scoreLoaded.on { score ->
     *     updateSongInformationInUi(score)
     * }
     * ```
     *
     */
    readonly scoreLoaded: IEventEmitterOfT<Score>;
    private _onScoreLoaded;
    /**
     * This event is fired when alphaTab was resized and is about to rerender the music notation.
     * @remarks
     * This event is fired when alphaTab was resized and is about to rerender the music notation. Before the re-rendering on resize
     * the settings will be updated in the related components. This means that any changes to the layout options or other display settings are
     * considered. This allows to implement scenarios where maybe the scale or the layout mode dynamically changes along the resizing.
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.resize.on((args) => {
     *     args.settings.scale = args.newWidth > 1300
     *         ? 1.5
     *         : (args.newWidth > 800) ? 1.3 : 1;
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Resize.On(args =>
     * {
     *     args.Settings.Display.Scale = args.NewWidth > 1300
     *         ? 1.5
     *         : (args.NewWidth > 800) ? 1.3 : 1;
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.resize.on { args ->
     *     args.settings.display.scale = args.newWidth > 1300
     *         ? 1.5
     *         : (args.newWidth > 800) ? 1.3 : 1;
     * });
     * ```
     *
     */
    readonly resize: IEventEmitterOfT<ResizeEventArgs>;
    private _onResize;
    /**
     * This event is fired when the rendering of the whole music sheet is starting.
     * @remarks
     * All preparations are completed and the layout and render sequence is about to start.
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.renderStarted.on(() => {
     *     updateProgressBar("Rendering");
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.RenderStarted.On(resized =>
     * {
     *     UpdateProgressBar("Rendering");
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.renderStarted.on { resized ->
     *     updateProgressBar("Rendering");
     * }
     * ```
     *
     */
    readonly renderStarted: IEventEmitterOfT<boolean>;
    private _onRenderStarted;
    /**
     * This event is fired when the rendering of the whole music sheet is finished.
     * @remarks
     * This event is fired when the rendering of the whole music sheet is finished from the render engine side. There might be still tasks open for
     * the display component to visually display the rendered components when this event is notified (e.g. resizing of DOM elements are done).
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.renderFinished.on(() => {
     *     updateProgressBar("Finishing");
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.RenderFinished.On(() =>
     * {
     *     UpdateProgressBar("Finishing");
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.renderFinished.on {
     *     updateProgressBar("Finishing")
     * }
     * ```
     *
     */
    readonly renderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    private _onRenderFinished;
    /**
     * This event is fired when the rendering of the whole music sheet is finished, and all handlers of `renderFinished` ran.
     * @remarks
     * If {@link CoreSettings.enableLazyLoading} is enabled not all partial images of the music sheet might be rendered.
     * In this case the `renderFinished` event rather represents that the whole music sheet has been layouted and arranged
     * and every partial image can be requested for rendering. If you neeed more fine-grained access
     * to the actual layouting and rendering progress, you need to look at the low-level apis {@link IScoreRenderer.partialLayoutFinished} and
     * {@link IScoreRenderer.partialRenderFinished} accessible via {@link renderer}.
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.postRenderFinished.on(() => {
     *     hideLoadingIndicator();
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PostRenderFinished.On(() =>
     * {
     *     HideLoadingIndicator();
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.postRenderFinished.on {
     *     hideLoadingIndicator();
     * }
     * ```
     *
     */
    readonly postRenderFinished: IEventEmitter;
    private _onPostRenderFinished;
    /**
     * This event is fired when an error within alphatab occurred.
     *
     * @remarks
     * This event is fired when an error within alphatab occurred. Use this event as global error handler to show errors
     * to end-users. Due to the asynchronous nature of alphaTab, no call to the API will directly throw an error if it fails.
     * Instead a signal to this error handlers will be sent.
     *
     * @eventProperty
     * @category Events - Core
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.error.on((error) {
     *     displayError(error);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.Error.On((error) =>
     * {
     *     DisplayError(error);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.error.on { error ->
     *     displayError(error)
     * }
     * ```
     *
     */
    readonly error: IEventEmitterOfT<Error>;
    /**
     * @internal
     */
    onError(error: Error): void;
    /**
     * This event is fired when all required data for playback is loaded and ready.
     * @remarks
     * This event is fired when all required data for playback is loaded and ready. The player is ready for playback when
     * all background workers are started, the audio output is initialized, a soundfont is loaded, and a song was loaded into the player as midi file.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playerReady.on(() => {
     *     enablePlayerControls();
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayerReady.On(() =>
     * {
     *     EnablePlayerControls()
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playerReady.on {
     *     enablePlayerControls()
     * }
     * ```
     */
    get playerReady(): IEventEmitter;
    private _onPlayerReady;
    /**
     * This event is fired when the playback of the whole song finished.
     * @remarks
     * This event is finished regardless on whether looping is enabled or not.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playerFinished.on((args) => {
     *     // speed trainer
     *     api.playbackSpeed = Math.min(1.0, api.playbackSpeed + 0.1);
     * });
     * api.isLooping = true;
     * api.playbackSpeed = 0.5;
     * api.play()
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayerFinished.On(() =>
     * {
     *     // speed trainer
     *     api.PlaybackSpeed = Math.Min(1.0, api.PlaybackSpeed + 0.1);
     * });
     * api.IsLooping = true;
     * api.PlaybackSpeed = 0.5;
     * api.Play();
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playerFinished.on {
     *     // speed trainer
     *     api.playbackSpeed = min(1.0, api.playbackSpeed + 0.1);
     * }
     * api.isLooping = true
     * api.playbackSpeed = 0.5
     * api.play()
     * ```
     *
     */
    get playerFinished(): IEventEmitter;
    private _onPlayerFinished;
    /**
     * This event is fired when the SoundFont needed for playback was loaded.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.soundFontLoaded.on(() => {
     *     hideSoundFontLoadingIndicator();
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.SoundFontLoaded.On(() =>
     * {
     *     HideSoundFontLoadingIndicator();
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...);
     * api.soundFontLoaded.on {
     *     hideSoundFontLoadingIndicator();
     * }
     * ```
     *
     */
    get soundFontLoaded(): IEventEmitter;
    private _onSoundFontLoaded;
    /**
     * This event is fired when a Midi file is being loaded.
     *
     * @remarks
     * This event is fired when a Midi file for the song was generated and is being loaded
     * by the synthesizer. This event can be used to inspect or modify the midi events
     * which will be played for the song. This can be used to generate other visual representations
     * of the song.
     *
     * > [!NOTE]
     * > The generated midi file will NOT contain any metronome and count-in related events. The metronome and
     * > count-in ticks are handled within the synthesizer.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.midiLoad.on(file => {
     *     initializePianoPractice(file);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MidiLoad.On(file =>
     * {
     *     InitializePianoPractice(file);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.midiLoad.on { file ->
     *     initializePianoPractice(file)
     * }
     * ```
     *
     */
    readonly midiLoad: IEventEmitterOfT<MidiFile>;
    private _onMidiLoad;
    /**
     * This event is fired when the Midi file needed for playback was loaded.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.midiLoaded.on(e => {
     *     hideGeneratingAudioIndicator();
     *     updateSongDuration(e.endTime);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MidiLoaded.On(e =>
     * {
     *     HideGeneratingAudioIndicator();
     *     UpdateSongDuration(e.EndTime);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.midiLoaded.on { e ->
     *     hideGeneratingAudioIndicator()
     *     updateSongDuration(e.endTime)
     * }
     * ```
     *
     */
    readonly midiLoaded: IEventEmitterOfT<PositionChangedEventArgs>;
    private _onMidiLoaded;
    /**
     * This event is fired when the playback state changed.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playerStateChanged.on((args) => {
     *     updatePlayerControls(args.state, args.stopped);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayerStateChanged.On(args =>
     * {
     *     UpdatePlayerControls(args);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playerStateChanged.on { args ->
     *     updatePlayerControls(args)
     * }
     * ```
     *
     */
    get playerStateChanged(): IEventEmitterOfT<PlayerStateChangedEventArgs>;
    private _onPlayerStateChanged;
    /**
     * This event is fired when the current playback position of the song changed.
     *
     * @eventProperty
     * @category Events - Player
     * @since 0.9.4
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playerPositionChanged.on((args) => {
     *     updatePlayerPosition(args);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlayerPositionChanged.On(args =>
     * {
     *     UpdatePlayerPosition(args);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playerPositionChanged.on { args ->
     *     updatePlayerPosition(args)
     * }
     * ```
     *
     */
    get playerPositionChanged(): IEventEmitterOfT<PositionChangedEventArgs>;
    private _onPlayerPositionChanged;
    /**
     * This event is fired when the synthesizer played certain midi events.
     *
     * @remarks
     * This event is fired when the synthesizer played certain midi events. This allows reacing on various low level
     * audio playback elements like notes/rests played or metronome ticks.
     *
     * Refer to the [related guide](https://www.alphatab.net/docs/guides/handling-midi-events) to learn more about this feature.
     *
     * Also note that the provided data models changed significantly in {@version 1.3.0}. We try to provide backwards compatibility
     * until some extend but highly encourage changing to the new models in case of problems.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.AlphaTabMetronome];
     * api.midiEventsPlayed.on(function(e) {
     *   for(const midi of e.events) {
     *     if(midi.isMetronome) {
     *       console.log('Metronome tick ' + midi.tick);
     *     }
     *   }
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.MidiEventsPlayedFilter = new MidiEventType[] { AlphaTab.Midi.MidiEventType.AlphaTabMetronome };
     * api.MidiEventsPlayed.On(e =>
     * {
     *   foreach(var midi of e.events)
     *   {
     *     if(midi is AlphaTab.Midi.AlphaTabMetronomeEvent sysex && sysex.IsMetronome)
     *     {
     *       Console.WriteLine("Metronome tick " + midi.Tick);
     *     }
     *   }
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...);
     * api.midiEventsPlayedFilter = alphaTab.collections.List<alphaTab.midi.MidiEventType>( alphaTab.midi.MidiEventType.AlphaTabMetronome )
     * api.midiEventsPlayed.on { e ->
     *   for (midi in e.events) {
     *     if(midi instanceof alphaTab.midi.AlphaTabMetronomeEvent && midi.isMetronome) {
     *       println("Metronome tick " + midi.tick);
     *     }
     *   }
     * }
     * ```
     * @see {@link MidiEvent}
     * @see {@link TimeSignatureEvent}
     * @see {@link AlphaTabMetronomeEvent}
     * @see {@link AlphaTabRestEvent}
     * @see {@link NoteOnEvent}
     * @see {@link NoteOffEvent}
     * @see {@link ControlChangeEvent}
     * @see {@link ProgramChangeEvent}
     * @see {@link TempoChangeEvent}
     * @see {@link PitchBendEvent}
     * @see {@link NoteBendEvent}
     * @see {@link EndOfTrackEvent}
     * @see {@link MetaEvent}
     * @see {@link MetaDataEvent}
     * @see {@link MetaNumberEvent}
     * @see {@link Midi20PerNotePitchBendEvent}
     * @see {@link SystemCommonEvent}
     * @see {@link SystemExclusiveEvent}
     */
    get midiEventsPlayed(): IEventEmitterOfT<MidiEventsPlayedEventArgs>;
    private _onMidiEventsPlayed;
    /**
     * This event is fired when the playback range changed.
     *
     * @eventProperty
     * @category Events - Player
     * @since 1.2.3
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.playbackRangeChanged.on((args) => {
     *     if (args.playbackRange) {
     *         highlightRangeInProgressBar(args.playbackRange.startTick, args.playbackRange.endTick);
     *     } else {
     *         clearHighlightInProgressBar();
     *     }
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.PlaybackRangeChanged.On(args =>
     * {
     *     if (args.PlaybackRange != null)
     *     {
     *         HighlightRangeInProgressBar(args.PlaybackRange.StartTick, args.PlaybackRange.EndTick);
     *     }
     *     else
     *     {
     *         ClearHighlightInProgressBar();
     *     }
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.playbackRangeChanged.on { args ->
     *     val playbackRange = args.playbackRange
     *     if (playbackRange != null) {
     *         highlightRangeInProgressBar(playbackRange.startTick, playbackRange.endTick)
     *     } else {
     *         clearHighlightInProgressBar()
     *     }
     * }
     * ```
     *
     */
    get playbackRangeChanged(): IEventEmitterOfT<PlaybackRangeChangedEventArgs>;
    private _onPlaybackRangeChanged;
    /**
     * This event is fired when a settings update was requested.
     *
     * @eventProperty
     * @category Events - Core
     * @since 1.6.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * api.settingsUpdated.on(() => {
     *     updateSettingsUI(api.settings);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * api.SettingsUpdated.On(() =>
     * {
     *     UpdateSettingsUI(api.settings);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * val api = AlphaTabApi<MyControl>(...)
     * api.SettingsUpdated.on {
     *     updateSettingsUI(api.settings)
     * }
     * ```
     *
     */
    readonly settingsUpdated: IEventEmitter;
    private _onSettingsUpdated;
    /**
     * Loads and lists the available output devices which can be used by the player.
     * @returns the list of available devices or an empty list if there are no permissions, or the player is not enabled.
     *
     * @remarks
     * Will request permissions if needed.
     *
     * The values provided, can be passed into {@link setOutputDevice} to change dynamically the output device on which
     * the sound is played.
     *
     * In the web version this functionality relies on experimental APIs and might not yet be available in all browsers. https://caniuse.com/mdn-api_audiocontext_sinkid
     * @category Methods - Player
     * @since 1.5.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const devices = await api.enumerateOutputDevices();
     *
     * buildDeviceSelector(devices, async selectedDevice => {
     *   await api.setOutputDevice(selectedDevice);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * var devices = await api.EnumerateOutputDevices();
     *
     * BuildDeviceSelector(devices, async selectedDevice => {
     *   await api.SetOutputDevice(selectedDevice);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * fun init() = kotlinx.coroutines.runBlocking {
     *   val api = AlphaTabApi<MyControl>(...)
     *   val devices = api.enumerateOutputDevices().await()
     *
     *   buildDeviceSelector(devices, fun (selectedDevice) {
     *     suspend {
     *       await api.setOutputDevice(selectedDevice)
     *     }
     *   });
     * }
     * ```
     */
    enumerateOutputDevices(): Promise<ISynthOutputDevice[]>;
    /**
     * Changes the output device which should be used for playing the audio (player must be enabled).
     * @param device The output device to use, or null to switch to the default device.
     *
     * @remarks
     * Use {@link enumerateOutputDevices} to load the list of available devices.
     *
     * In the web version this functionality relies on experimental APIs and might not yet be available in all browsers. https://caniuse.com/mdn-api_audiocontext_sinkid
     * @category Methods - Player
     * @since 1.5.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * const devices = await api.enumerateOutputDevices();
     *
     * buildDeviceSelector(devices, async selectedDevice => {
     *   await api.setOutputDevice(selectedDevice);
     * });
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * var devices = await api.EnumerateOutputDevices();
     *
     * BuildDeviceSelector(devices, async selectedDevice => {
     *   await api.SetOutputDevice(selectedDevice);
     * });
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * fun init() = kotlinx.coroutines.runBlocking {
     *   val api = AlphaTabApi<MyControl>(...)
     *   val devices = api.enumerateOutputDevices().await()
     *
     *   buildDeviceSelector(devices, fun (selectedDevice) {
     *     suspend {
     *       await api.setOutputDevice(selectedDevice)
     *     }
     *   });
     * }
     * ```
     */
    setOutputDevice(device: ISynthOutputDevice | null): Promise<void>;
    /**
     * The currently configured output device if changed via {@link setOutputDevice}.
     * @returns The custom configured output device which was set via {@link setOutputDevice} or `null`
     * if the default outputDevice is used.
     * The output device might change dynamically if devices are connected/disconnected (e.g. bluetooth headset).
     *
     * @remarks
     * Assumes {@link setOutputDevice} has been used.
     * In the web version this functionality relies on experimental APIs and might not yet be available in all browsers. https://caniuse.com/mdn-api_audiocontext_sinkid
     *
     * @category Methods - Player
     * @since 1.5.0
     *
     * @example
     * JavaScript
     * ```js
     * const api = new alphaTab.AlphaTabApi(document.querySelector('#alphaTab'));
     * updateOutputDeviceUI(await api.getOutputDevice())
     * ```
     *
     * @example
     * C#
     * ```cs
     * var api = new AlphaTabApi<MyControl>(...);
     * UpdateOutputDeviceUI(await api.GetOutputDevice())
     * ```
     *
     * @example
     * Android
     * ```kotlin
     * fun init() = kotlinx.coroutines.runBlocking {
     *   val api = AlphaTabApi<MyControl>(...)
     *   updateOutputDeviceUI(api.getOutputDevice().await())
     * }
     * ```
     *
     */
    getOutputDevice(): Promise<ISynthOutputDevice | null>;
    /**
     * Starts the audio export for the currently loaded song.
     * @remarks
     * This will not export or use any backing track media but will always use the synthesizer to generate the output.
     * This method works with any PlayerMode active but changing the mode during export can lead to unexpected side effects.
     *
     * See [Audio Export](https://www.alphatab.net/docs/guides/audio-export) for further guidance how to use this feature.
     *
     * @param options The export options.
     * @category Methods - Player
     * @since 1.6.0
     * @returns An exporter instance to export the audio in a streaming fashion.
     */
    exportAudio(options: AudioExportOptions): Promise<IAudioExporter>;
}
