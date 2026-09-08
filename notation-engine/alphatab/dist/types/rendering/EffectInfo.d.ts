import type { Beat } from "./../model/Beat";
import type { NotationElement } from "./../NotationSettings";
import type { BarRendererBase } from "./BarRendererBase";
import type { EffectBand } from "./EffectBand";
import type { EffectBarGlyphSizing } from "./EffectBarGlyphSizing";
import type { EffectGlyph } from "./glyphs/EffectGlyph";
import { OverlayRodPolicy } from "./OverlayRodPolicy";
import type { Settings } from "./../Settings";
/**
 * Lower = placed first = closer to staff. Gould (Behind Bars p.118, 184, 484).
 * @internal
 */
export declare enum EffectBandPlacementCategory {
    /** Articulations, fingerings, dynamics, text, ornaments, fermatas. */
    NoteAttached = 0,
    /** Vibrato, let-ring, palm-mute, trill, whammy, hairpins, ottava, pedal, rasgueado, barré. */
    Span = 1,
    /** Tempo, rehearsal, section markers, free-time, alternate endings, chords. */
    SystemMarker = 2,
    /**
     * Single-baseline rows parallel to the stave (Gould p.300). Bands sharing
     * {@link EffectInfo.effectId} align at the deepest magnitude across the
     * row's combined x-range.
     */
    HorizontalRow = 3
}
/**
 * Provides the data an EffectBarRenderer needs to create effect glyphs.
 * @internal
 */
export declare abstract class EffectInfo {
    /**
     * Gets the unique effect name for this effect. (Used for grouping)
     */
    get effectId(): string;
    /**
     * Gets the notation element that this effect represents. (Used for dynamic showing/hiding)
     */
    abstract get notationElement(): NotationElement;
    /**
     * Gets a value indicating whether this effect glyphs
     * should only be added once on the first track if multiple tracks are rendered.
     * (Example: this allows to render the tempo changes only once)
     * @returns true if this effect bar should only be created once for the first track, otherwise false.
     */
    abstract get hideOnMultiTrack(): boolean;
    /**
     * Checks whether the given beat has the appropriate effect set and
     * needs a glyph creation
     * @param settings
     * @param beat the beat storing the data
     * @returns true if the beat has the effect set, otherwise false.
     */
    abstract shouldCreateGlyph(settings: Settings, beat: Beat): boolean;
    /**
     * Gets the sizing mode of the glyphs created by this info.
     * @returns the sizing mode to apply to the glyphs during layout
     */
    abstract get sizingMode(): EffectBarGlyphSizing;
    /**
     * Describes how glyphs created by this effect contribute overlay rods
     * during bar spacing. Defaults to {@link OverlayRodPolicy.None} (no
     * contribution); override to opt in and declare the alignment policy.
     */
    get overlayRodPolicy(): OverlayRodPolicy;
    /**
     * Creates a new effect glyph for the given beat.
     * @param renderer the renderer which requests for glyph creation
     * @param beat the beat storing the data
     * @returns the glyph which needs to be added to the renderer
     */
    abstract createNewGlyph(renderer: BarRendererBase, beat: Beat): EffectGlyph;
    /**
     * Checks whether an effect glyph can be expanded to a particular beat.
     * @param from the beat which already has the glyph applied
     * @param to the beat which the glyph should get expanded to
     * @returns true if the glyph can be expanded, false if a new glyph needs to be created.
     */
    abstract canExpand(from: Beat, to: Beat): boolean;
    /** Default {@link EffectBandPlacementCategory.NoteAttached} keeps unknown effects close to the staff. */
    get placementCategory(): EffectBandPlacementCategory;
    /** When `true`, the band feeds each beat-glyph's paint extent into the rhythmic-spacing solver. */
    get contributesToBeatSpacing(): boolean;
    /**
     * Override this method to finalize an effect band with all glyphs created.
     * Allows special layout logic like for whammys where we center-align the glyphs and size the band accordingly.
     * @param _band The band which is being finalized.
     */
    finalizeBand(_band: EffectBand): void;
    /**
     * Override this method when glyphs are for this effect is being re-aligned during resizing.
     * @param _band The band holding the glyph
     */
    onAlignGlyphs(_band: EffectBand): void;
}
