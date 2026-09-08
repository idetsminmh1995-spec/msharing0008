/**
 * This eventargs define the details about the rendering and layouting process and are
 * provided whenever a part of of the music sheet is rendered.
 * @public
 */
export declare class RenderFinishedEventArgs {
    /**
     * Gets or sets the unique id of this event args.
     */
    id: string;
    /**
     * A value indicating whether the currently rendered viewport can be reused.
     * @remarks
     * If set to true, the viewport does NOT need to be cleared as a similar
     * content will be rendered.
     * If set to false, the viewport and any visual partials should be cleared
     * as it could lead to UI disturbances otherwise.
     *
     * The viewport can be typically used on resize renders or if the user supplied
     * a rendering hint that the new score is "similar" to the old one (e.g. in case of live-editing).
     */
    reuseViewport: boolean;
    /**
     * Gets or sets the x position of the current rendering result.
     */
    x: number;
    /**
     * Gets or sets the y position of the current rendering result.
     */
    y: number;
    /**
     * Gets or sets the width of the current rendering result.
     */
    width: number;
    /**
     * Gets or sets the height of the current rendering result.
     */
    height: number;
    /**
     * Gets or sets the currently known total width of the final music sheet.
     */
    totalWidth: number;
    /**
     * Gets or sets the currently known total height of the final music sheet.
     */
    totalHeight: number;
    /**
     * Gets or sets the index of the first masterbar that was rendered in this result.
     */
    firstMasterBarIndex: number;
    /**
     * Gets or sets the index of the last masterbar that was rendered in this result.
     */
    lastMasterBarIndex: number;
    /**
     * Gets or sets the render engine specific result object which contains the rendered music sheet.
     */
    renderResult: unknown;
}
