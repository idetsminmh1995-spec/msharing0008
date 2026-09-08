/**
 * @target web
 * @internal
 */
export declare class Lazy<T> {
    private _factory;
    private _value;
    get hasValue(): boolean;
    constructor(factory: () => T);
    get value(): T;
    reset(): void;
}
