/**
 * A very basic polyfill of the ResizeObserver which triggers
 * a the callback on window resize for all registered targets.
 * @target web
 * @internal
 */
export declare class ResizeObserverPolyfill {
    private _callback;
    private _targets;
    constructor(callback: ResizeObserverCallback);
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
    private _onWindowResize;
}
