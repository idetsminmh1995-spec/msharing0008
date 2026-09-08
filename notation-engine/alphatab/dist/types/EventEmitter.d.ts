/**
 * An emitter for an event without any value passed to the listeners.
 * @public
 */
export interface IEventEmitter {
    /**
     * Registers to the event with the given handler
     * @param value The function to call when the event occurs.
     * @returns A function which can be called to unregister the registered handler.
     * This is usedful if the original function passed to this is not stored somewhere but
     * unregistering of the event needs to be done.
     */
    on(value: () => void): () => void;
    /**
     * Unregisters the given handler from this event.
     * @param value The value originally passed into {@link on}, NOT the function returned by it.
     */
    off(value: () => void): void;
}
/**
 * An emitter for an event with a single parameter passed to the listeners.
 * @partial
 * @public
 */
export interface IEventEmitterOfT<T> {
    /**
     * Registers to the event with the given handler
     * @param value The function to call when the event occurs.
     * @returns A function which can be called to unregister the registered handler.
     * This is usedful if the original function passed to this is not stored somewhere but
     * unregistering of the event needs to be done.
     */
    on(value: (arg: T) => void): () => void;
    /**
     * Unregisters the given handler from this event.
     * @param value The value originally passed into {@link on}, NOT the function returned by it.
     */
    off(value: (arg: T) => void): void;
}
/**
 * @internal
 */
export declare class EventEmitter implements IEventEmitter {
    private _listeners;
    private readonly _fireOnRegister;
    constructor(fireOnRegister?: (() => boolean) | undefined);
    on(value: () => void): () => void;
    off(value: () => void): void;
    trigger(): void;
}
/**
 * @partial
 * @internal
 */
export declare class EventEmitterOfT<T> implements IEventEmitterOfT<T> {
    private _listeners;
    private readonly _fireOnRegister;
    constructor(fireOnRegister?: (() => T | null) | undefined);
    on(value: (arg: T) => void): () => void;
    off(value: (arg: T) => void): void;
    trigger(arg: T): void;
}
