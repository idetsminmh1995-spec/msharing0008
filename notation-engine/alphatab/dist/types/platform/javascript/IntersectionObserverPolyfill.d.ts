/**
 * A polyfill of the InsersectionObserver
 * @target web
 * @internal
 */
export declare class IntersectionObserverPolyfill {
    private _callback;
    private _elements;
    private _timer;
    constructor(callback: IntersectionObserverCallback);
    private _check;
    observe(target: HTMLElement): void;
    unobserve(target: HTMLElement): void;
    private _doCheck;
}
