/**
 * @internal
 */
export declare class Queue<T extends object> {
    private _head?;
    private _tail?;
    get isEmpty(): boolean;
    clear(): void;
    enqueue(item: T): void;
    enqueueFront(item: T): void;
    peek(): T | undefined;
    dequeue(): T | undefined;
}
