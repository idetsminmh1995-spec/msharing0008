import { type TimingDiagnostic } from './diagnostic.js';
export interface TempoSegment {
    readonly startTick: number;
    readonly startSeconds: number;
    readonly microsecondsPerQuarter: number;
}
/** Sorted, contiguous by startTick -- §12.1's own stated invariant. */
export interface TempoMap {
    readonly segments: readonly TempoSegment[];
}
export interface RawTempoEvent {
    readonly tick: number;
    readonly microsecondsPerQuarter: number;
}
export interface BuildTempoMapResult {
    readonly tempoMap: TempoMap;
    readonly diagnostics: readonly TimingDiagnostic[];
}
/**
 * §12.2's anti-drift design: `startSeconds` is precomputed cumulatively
 * ONCE here, when the map is built -- never re-derived by stepping note
 * by note and accumulating elapsed time, which is exactly the approach
 * that accumulates floating-point error proportional to song length.
 * Every later `tickToSeconds`/`secondsToTick` call is then just a binary
 * search plus one multiply, with error bounded by one subtraction and
 * one multiplication from the nearest tempo change -- never by how many
 * notes came before it.
 */
export declare function buildTempoMap(rawEvents: readonly RawTempoEvent[]): BuildTempoMapResult;
