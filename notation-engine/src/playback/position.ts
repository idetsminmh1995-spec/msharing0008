import { TICKS_PER_QUARTER } from '../core/duration-math.js';
import type { MusicalPosition } from '../timing/measure-position.js';
import type { TempoMap } from '../timing/tempo-map.js';
import { tickToSeconds } from '../timing/tick-seconds.js';
import type { NotationEvent } from './event-stream.js';

export interface PlaybackPosition {
  readonly tick: number;
  readonly seconds: number;
  readonly position: MusicalPosition;
}

/** The one piece of a measure's rendered layout `positionToX`/`xToPosition` need -- the exact same shape `renderFromMusicXml`'s own internal `computeMeasureLayout` already produces. */
export interface PlaybackMeasureLayout {
  readonly width: number;
  readonly positionsByTick: ReadonlyMap<number, number>;
}

/** Where one measure sits on the page -- the playback-relevant slice of `renderFromMusicXml`'s own internal `MeasurePlacement`. */
export interface PlaybackMeasurePlacement {
  readonly x: number;
  readonly systemIndex: number;
  readonly pageIndex: number;
}

export interface EventPosition {
  readonly x: number;
  readonly systemIndex: number;
  readonly pageIndex: number;
}

/**
 * PLAN.md §17.1's full "what the engine provides" for one rendered score,
 * computed ONCE by `computePlaybackData` (called from `renderFromMusicXml`
 * itself, from the exact layout maps that produced the SVG) -- never a
 * second, independently-computed layout that could drift from what was
 * actually drawn. `positionToX`, `xToPosition`, `resolvePosition` and
 * `getEventStream` are all pure functions of this data, matching this
 * codebase's own established `geometry/`-style shape (explicit data in,
 * explicit data out) rather than closures with hidden state.
 */
export interface PlaybackData {
  readonly measureNumbersInOrder: readonly number[];
  readonly globalTickOffsetByMeasure: ReadonlyMap<number, number>;
  readonly timeSignatureByMeasure: ReadonlyMap<
    number,
    { readonly numerator: number; readonly denominator: number }
  >;
  readonly measureLayoutsByNumber: ReadonlyMap<number, PlaybackMeasureLayout>;
  readonly placementByMeasureNumber: ReadonlyMap<number, PlaybackMeasurePlacement>;
  /** The same header allowance (clef/key/time-signature reservation) `renderFromMusicXml` itself reserves at every measure's own left edge -- `positionsByTick`'s values are relative to just past it, not to the measure's bare x. */
  readonly measureHeaderAllowance: number;
  readonly tempoMap: TempoMap;
  readonly events: readonly NotationEvent[];
}

/** The last measure in performance order whose own start is at or before `tick` -- binary search, since `measureNumbersInOrder`'s offsets are monotonically non-decreasing by construction (`computePlaybackData` builds them as a running sum of non-negative measure lengths). */
function measureAtTick(playback: PlaybackData, tick: number): number | undefined {
  const order = playback.measureNumbersInOrder;
  if (order.length === 0) return undefined;
  let low = 0;
  let high = order.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const midMeasure = order[mid];
    const midOffset =
      midMeasure !== undefined ? (playback.globalTickOffsetByMeasure.get(midMeasure) ?? 0) : 0;
    if (midOffset <= tick) low = mid;
    else high = mid - 1;
  }
  return order[low];
}

/** The largest recorded tick at or before `tickInMeasure` -- a rendered note's own x is exactly correct for every tick from its own onset up to (not including) the next one, so "the note currently sounding" is the floor, not the nearest. */
function floorEntry(
  positionsByTick: ReadonlyMap<number, number>,
  tickInMeasure: number,
): number | undefined {
  let best: number | undefined;
  for (const t of positionsByTick.keys()) {
    if (t <= tickInMeasure && (best === undefined || t > best)) best = t;
  }
  return best;
}

/**
 * §17.2's own musical-position half of a `PlaybackPosition`. Deliberately
 * does not reuse `timing/measure-position.ts`'s `MeasureMap`/`tickToPosition`
 * machinery: that module is built for the case where only a sparse list of
 * time-signature CHANGE points is known and every measure's own length must
 * be reconstructed from them (rounding to the nearest whole measure at each
 * change, by its own documented design). Here, `computePlaybackData` already
 * has every measure's own real length from the layout pass that rendered
 * it -- indexing that directly is both simpler and exact, with no rounding
 * step to round.
 */
function tickToMusicalPosition(playback: PlaybackData, tick: number): MusicalPosition {
  const measureNumber = measureAtTick(playback, tick);
  if (measureNumber === undefined) return { measureNumber: 1, beat: 1, tickInMeasure: 0 };
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  const tickInMeasure = tick - offset;
  const denominator = playback.timeSignatureByMeasure.get(measureNumber)?.denominator ?? 4;
  const beatLenTicks = (4 / denominator) * TICKS_PER_QUARTER;
  const beat = 1 + tickInMeasure / beatLenTicks;
  return { measureNumber, beat, tickInMeasure };
}

/** §17.1's `PlaybackPosition` for an arbitrary tick -- tick, real seconds (§12's tempo map) and measure+beat, all three views of the same instant. */
export function resolvePosition(playback: PlaybackData, tick: number): PlaybackPosition {
  return {
    tick,
    seconds: tickToSeconds(playback.tempoMap, tick),
    position: tickToMusicalPosition(playback, tick),
  };
}

/** §17.1: time -> where on the page. The x of the note currently sounding at `tick` (see `floorEntry`), in the same coordinate space the rendered SVG itself uses. */
export function positionToX(playback: PlaybackData, tick: number): EventPosition {
  const measureNumber = measureAtTick(playback, tick);
  if (measureNumber === undefined) return { x: 0, systemIndex: 0, pageIndex: 0 };
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  const tickInMeasure = Math.max(0, tick - offset);
  const layout = playback.measureLayoutsByNumber.get(measureNumber);
  const placement = playback.placementByMeasureNumber.get(measureNumber);
  const floorTick =
    layout !== undefined ? floorEntry(layout.positionsByTick, tickInMeasure) : undefined;
  const withinMeasureX =
    floorTick !== undefined ? (layout?.positionsByTick.get(floorTick) ?? 0) : 0;
  return {
    x: (placement?.x ?? 0) + playback.measureHeaderAllowance + withinMeasureX,
    systemIndex: placement?.systemIndex ?? 0,
    pageIndex: placement?.pageIndex ?? 0,
  };
}

/** §17.1: where on the page -> time, for click-to-seek in a host app. The exact inverse of `positionToX` at a real event's own x (floor-by-x within the chosen measure mirrors `positionToX`'s own floor-by-tick). `systemIndex` narrows the search to one system, since the same x can legitimately appear in several (one per system/page). */
export function xToPosition(playback: PlaybackData, x: number, systemIndex: number): number {
  const candidates = [...playback.placementByMeasureNumber.entries()]
    .filter(([, p]) => p.systemIndex === systemIndex)
    .sort((a, b) => a[1].x - b[1].x);
  if (candidates.length === 0) return 0;

  let chosen = candidates[0];
  for (const candidate of candidates) {
    if (candidate[1].x <= x) chosen = candidate;
    else break;
  }
  const measureNumber = chosen?.[0];
  const placement = chosen?.[1];
  if (measureNumber === undefined || placement === undefined) return 0;

  const localX = x - placement.x - playback.measureHeaderAllowance;
  const layout = playback.measureLayoutsByNumber.get(measureNumber);
  let bestTick = 0;
  let bestX: number | undefined;
  if (layout !== undefined) {
    for (const [tick, tickX] of layout.positionsByTick) {
      if (tickX <= localX && (bestX === undefined || tickX > bestX)) {
        bestX = tickX;
        bestTick = tick;
      }
    }
  }
  const offset = playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0;
  return offset + bestTick;
}
