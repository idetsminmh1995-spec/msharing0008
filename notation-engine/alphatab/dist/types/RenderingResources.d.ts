import { EngravingSettings } from "./EngravingSettings";
import { Color } from "./model/Color";
import { Font } from "./model/Font";
import { ScoreSubElement } from "./model/Score";
import { NotationElement } from "./NotationSettings";
/**
 * This public class contains central definitions for controlling the visual appearance.
 * @json
 * @json_declaration
 * @public
 */
export declare class RenderingResources {
    private static _sansFont;
    private static _serifFont;
    private static _effectFont;
    /**
     * The default fonts for notation elements if not specified by the user.
     */
    static defaultFonts: Map<NotationElement, Font>;
    /**
     * The name of the SMuFL Font to use for rendering music symbols.
     *
     * @remarks
     * If this family name is provided, alphaTab will not load any custom font, but expects
     * this font to be available in your environment (loadad as webfont or registered in alphaSkia).
     *
     * When using alphaTab in a browser environment it is rather recommended to specify the web font
     * via the `smuflFontSources` on the `CoreSettings`and skipping this setting.
     *
     * You will also need to fill {@link engravingSettings} to match this font.
     *
     * @since 1.7.0
     * @internal
     */
    smuflFontFamilyName?: string;
    /**
     * The SMuFL Metrics to use for rendering music symbols.
     * @defaultValue `alphaTab`
     * @since 1.7.0
     */
    engravingSettings: EngravingSettings;
    /**
     * The font to use for displaying the songs copyright information in the header of the music sheet.
     * @defaultValue `bold 12px Arial, sans-serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreCopyright}
     * @json_read_only
     */
    get copyrightFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreCopyright}
     */
    set copyrightFont(value: Font);
    /**
     * The font to use for displaying the songs title in the header of the music sheet.
     * @defaultValue `32px Georgia, serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreTitle}
     * @json_read_only
     */
    get titleFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreTitle}
     */
    set titleFont(value: Font);
    /**
     * The font to use for displaying the songs subtitle in the header of the music sheet.
     * @defaultValue `20px Georgia, serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreSubTitle}
     * @json_read_only
     */
    get subTitleFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreSubTitle}
     */
    set subTitleFont(value: Font);
    /**
     * The font to use for displaying the lyrics information in the header of the music sheet.
     * @defaultValue `15px Arial, sans-serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreWords}
     * @json_read_only
     */
    get wordsFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.ScoreWords}
     */
    set wordsFont(value: Font);
    /**
     * The font to use for displaying beat time information in the music sheet.
     * @defaultValue `12px Georgia, serif`
     * @since 1.4.0
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectBeatTimer}
     * @json_read_only
     */
    get timerFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectBeatTimer}
     */
    set timerFont(value: Font);
    /**
     * The font to use for displaying the directions texts.
     * @defaultValue `14px Georgia, serif`
     * @since 1.4.0
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectDirections}
     * @json_read_only
     */
    get directionsFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectDirections}
     */
    set directionsFont(value: Font);
    /**
     * The font to use for displaying the fretboard numbers in chord diagrams.
     * @defaultValue `11px Arial, sans-serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.ChordDiagramFretboardNumbers}
     * @json_read_only
     */
    get fretboardNumberFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.ChordDiagramFretboardNumbers}
     */
    set fretboardNumberFont(value: Font);
    /**
     * Unused, see deprecation note.
     * @defaultValue `14px Georgia, serif`
     * @since 0.9.6
     * @deprecated Since 1.7.0 alphaTab uses the glyphs contained in the SMuFL font
     * @json_ignore
     */
    fingeringFont: Font;
    /**
     * Unused, see deprecation note.
     * @defaultValue `12px Georgia, serif`
     * @since 1.4.0
     * @deprecated Since 1.7.0 alphaTab uses the glyphs contained in the SMuFL font
     * @json_ignore
     */
    inlineFingeringFont: Font;
    /**
     * The font to use for section marker labels shown above the music sheet.
     * @defaultValue `bold 14px Georgia, serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectMarker}
     * @json_read_only
     */
    get markerFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.EffectMarker}
     */
    set markerFont(value: Font);
    /**
     * Ununsed, see deprecation note.
     * @defaultValue `italic 12px Georgia, serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with the respective
     * @json_ignore
     */
    effectFont: Font;
    /**
     * The font to use for displaying the bar numbers above the music sheet.
     * @defaultValue `11px Arial, sans-serif`
     * @since 0.9.6
     * @deprecated use {@link elementFonts} with {@link NotationElement.BarNumber}
     * @json_read_only
     */
    get barNumberFont(): Font;
    /**
     * @deprecated use {@link elementFonts} with {@link NotationElement.BarNumber}
     */
    set barNumberFont(value: Font);
    /**
     * The fonts used by individual elements. Check `defaultFonts` for the elements which have custom fonts.
     * Removing fonts from this map can lead to unexpected side effects and errors. Only update it with new values.
     * @json_immutable
     */
    readonly elementFonts: Map<NotationElement, Font>;
    /**
     * The font to use for displaying the numbered music notation in the music sheet.
     * @defaultValue `14px Arial, sans-serif`
     * @since 1.4.0
     */
    numberedNotationFont: Font;
    /**
     * The font to use for displaying the grace notes in numbered music notation in the music sheet.
     * @defaultValue `16px Arial, sans-serif`
     * @since 1.4.0
     */
    numberedNotationGraceFont: Font;
    /**
     * The font to use for displaying the guitar tablature numbers in the music sheet.
     * @defaultValue `13px Arial, sans-serif`
     * @since 0.9.6
     */
    tablatureFont: Font;
    /**
     * The font to use for grace notation related texts in the music sheet.
     * @defaultValue `11px Arial, sans-serif`
     * @since 0.9.6
     */
    graceFont: Font;
    /**
     * The color to use for rendering the lines of staves.
     * @defaultValue `rgb(165, 165, 165)`
     * @since 0.9.6
     */
    staffLineColor: Color;
    /**
     * The color to use for rendering bar separators, the accolade and repeat signs.
     * @defaultValue `rgb(34, 34, 17)`
     * @since 0.9.6
     */
    barSeparatorColor: Color;
    /**
     * The color to use for displaying the bar numbers above the music sheet.
     * @defaultValue `rgb(200, 0, 0)`
     * @since 0.9.6
     */
    barNumberColor: Color;
    /**
     * The color to use for music notation elements of the primary voice.
     * @defaultValue `rgb(0, 0, 0)`
     * @since 0.9.6
     */
    mainGlyphColor: Color;
    /**
     * The color to use for music notation elements of the secondary voices.
     * @defaultValue `rgb(0,0,0,0.4)`
     * @since 0.9.6
     */
    secondaryGlyphColor: Color;
    /**
     * The color to use for displaying the song information above the music sheets.
     * @defaultValue `rgb(0, 0, 0)`
     * @since 0.9.6
     */
    scoreInfoColor: Color;
    constructor();
    /**
     * @internal
     * @param element
     */
    getFontForElement(element: ScoreSubElement): Font;
    /**
     * @internal
     * @param element
     */
    getFontForNotationElement(notationElement: NotationElement): Font;
}
