import { HtmlElementContainer } from "./HtmlElementContainer";
/**
 * An IContainer implementation which can be used for cursors and select ranges
 * where browser scaling is relevant.
 *
 * The problem is that with having 1x1 pixel elements which are sized then to the actual size with a
 * scale transform this cannot be combined properly with a browser zoom.
 *
 * The browser will apply first the browser zoom to the 1x1px element and then apply the scale leaving it always
 * at full scale instead of a 50% browser zoom.
 *
 * This is solved in this container by scaling the element first up to a higher degree (as specified)
 * so that the browser can do a scaling according to typical zoom levels and then the scaling will work.
 * @target web
 * @internal
 */
export declare class ScalableHtmlElementContainer extends HtmlElementContainer {
    private _xscale;
    private _yscale;
    centerAtPosition: boolean;
    constructor(element: HTMLElement, xscale: number, yscale: number);
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
    setBounds(x: number, y: number, w: number, h: number): void;
}
