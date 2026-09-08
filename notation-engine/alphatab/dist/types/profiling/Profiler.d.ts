/**
 * Profiling instrumentation. Call sites are stripped from production /
 * library / vitest / playground builds by `stripProfilingPlugin` and only
 * retained in the bench harness.
 */
/**
 * @internal
 * @record
 */
export interface StageStats {
    count: number;
    totalNs: number;
    maxNs: number;
}
/**
 * @internal
 * @record
 */
export interface ProfilerSnapshot {
    stages: Map<string, StageStats>;
    counters: Map<string, number>;
}
/**
 * @internal
 */
export declare class Profiler {
    private static readonly _stackLimit;
    private static readonly _stages;
    private static readonly _counters;
    private static readonly _stack;
    static begin(name: string): void;
    static end(name: string): void;
    static bump(name: string, delta?: number): void;
    static snapshot(): ProfilerSnapshot;
    static reset(): void;
    private static _nowNs;
}
