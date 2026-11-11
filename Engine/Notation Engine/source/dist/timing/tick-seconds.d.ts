import type { TempoMap } from './tempo-map.js';
/** §12.2: find the containing segment (binary search), then one subtraction and one multiply -- never re-accumulated note by note, so error never grows with song length. */
export declare function tickToSeconds(tempoMap: TempoMap, tick: number): number;
/** The exact inverse of tickToSeconds (§12.2's own required property, to within floating-point epsilon). */
export declare function secondsToTick(tempoMap: TempoMap, seconds: number): number;
