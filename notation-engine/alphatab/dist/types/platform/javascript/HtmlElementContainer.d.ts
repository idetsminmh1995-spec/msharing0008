import type { IEventEmitter, IEventEmitterOfT } from "./../../EventEmitter";
import type { IContainer } from "./../IContainer";
import type { IMouseEventArgs } from "./../IMouseEventArgs";
import { Bounds } from "./../../rendering/utils/Bounds";
/**
 * A UI element implementation wrapping HTML elements.
 * @target web
 * @public
 */
export interface IHtmlElementContainer extends IContainer {
    /**
     * The wrapped UI element.
     */
    readonly element: HTMLElement;
}
/**
 * @target web
 * @internal
 */
export declare class HtmlElementContainer implements IHtmlElementContainer {
    private static _resizeObserver;
    private _resizeListeners;
    get width(): number;
    set width(value: number);
    get scrollLeft(): number;
    set scrollLeft(value: number);
    get scrollTop(): number;
    set scrollTop(value: number);
    get height(): number;
    set height(value: number);
    get isVisible(): boolean;
    readonly element: HTMLElement;
    constructor(element: HTMLElement);
    stopAnimation(): void;
    transitionToX(duration: number, x: number): void;
    protected lastBounds: Bounds;
    setBounds(x: number, y: number, w: number, h: number): void;
    /**
     * This event occurs when the control was resized.
     */
    resize: IEventEmitter;
    /**
     * This event occurs when a mouse/finger press happened on the control.
     */
    mouseDown: IEventEmitterOfT<IMouseEventArgs>;
    /**
     * This event occurs when a mouse/finger moves on top of the control.
     */
    mouseMove: IEventEmitterOfT<IMouseEventArgs>;
    /**
     * This event occurs when a mouse/finger is released from the control.
     */
    mouseUp: IEventEmitterOfT<IMouseEventArgs>;
    appendChild(child: IContainer): void;
    clear(): void;
}
