/**
 * Lists all flags for font styles.
 * @public
 */
export declare enum FontStyle {
    /**
     * No flags.
     */
    Plain = 0,
    /**
     * Font is italic.
     */
    Italic = 1
}
/**
 * Lists all font weight values.
 * @public
 */
export declare enum FontWeight {
    /**
     * Not bold
     */
    Regular = 0,
    /**
     * Font is bold
     */
    Bold = 1
}
/**
 * Describes a font to be used.
 * If specified as string, a CSS `font` shorthand property compliant value needs to be used.
 * @target web
 * @public
 */
export type FontJson = Font | string | {
    families: string[];
    size: number;
    style: FontStyle | keyof typeof FontStyle;
    weight: FontWeight | keyof typeof FontWeight;
};
/**
 * @json_immutable
 * @public
 */
export declare class Font {
    private _css;
    private _cssScale;
    private _families;
    private _style;
    private _weight;
    private _size;
    private _reset;
    /**
     * Gets the first font family name.
     * @deprecated Consider using {@link families} for multi font family support.
     */
    get family(): string;
    /**
     * Sets the font family list.
     * @deprecated Consider using {@link families} for multi font family support.
     */
    set family(value: string);
    /**
     * Gets the font family name.
     */
    get families(): string[];
    /**
     * Sets the font family name.
     */
    set families(value: string[]);
    /**
     * Gets the font size in pixels.
     */
    get size(): number;
    /**
     * Sets the font size in pixels.
     */
    set size(value: number);
    /**
     * Gets the font style.
     */
    get style(): FontStyle;
    /**
     * Sets the font style.
     */
    set style(value: FontStyle);
    /**
     * Gets the font weight.
     */
    get weight(): FontWeight;
    /**
     * Gets or sets the font weight.
     */
    set weight(value: FontWeight);
    get isBold(): boolean;
    get isItalic(): boolean;
    /**
     * Initializes a new instance of the {@link Font} class.
     * @param family The family.
     * @param size The size.
     * @param style The style.
     * @param weight The weight.
     */
    constructor(family: string, size: number, style?: FontStyle, weight?: FontWeight);
    withSize(newSize: number): Font;
    /**
     * Initializes a new instance of the {@link Font} class.
     * @param families The families.
     * @param size The size.
     * @param style The style.
     * @param weight The weight.
     */
    static withFamilyList(families: string[], size: number, style?: FontStyle, weight?: FontWeight): Font;
    toCssString(scale?: number): string;
    static fromJson(v: unknown): Font | undefined;
    static toJson(font: Font | undefined): Map<string, unknown> | undefined;
}
