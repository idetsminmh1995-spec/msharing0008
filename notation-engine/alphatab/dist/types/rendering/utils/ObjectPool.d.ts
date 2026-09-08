/**
 * `reset()` is invoked at acquire-time (not release-time) so callers can skip
 * zeroing slots that get immediately overwritten.
 * @internal
 */
export interface IPoolable {
    reset(): void;
}
/**
 * Bump-allocator / arena-style object pool. Callers may either pair each
 * {@link acquire} with a {@link release} or batch-acquire and call
 * {@link releaseAll} at a lifecycle boundary.
 * @internal
 */
export declare class ObjectPool<T extends IPoolable> {
    private readonly _items;
    private readonly _recycled;
    private _cursor;
    private _grown;
    private readonly _factory;
    constructor(factory: () => T);
    acquire(): T;
    release(obj: T): void;
    releaseAll(): void;
    get grownCount(): number;
}
