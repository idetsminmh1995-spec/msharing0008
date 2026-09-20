import type { SpacingConfig } from '../config/config.js';

/**
 * The part of `SpacingConfig` §14's own algorithms actually read.
 *
 * A `Pick` rather than the whole interface because `SpacingConfig` also
 * carries `minMeasureWidth`, which is a MEASURE-level floor applied by
 * the renderer, not an input to proportional spacing -- and because the
 * renderer deliberately passes these four with a different `justify`
 * than the config's (a scroll system is never stretched). Taking only
 * what is used keeps a caller from having to invent a value for a field
 * that would be ignored.
 */
type SpacingAlgorithmConfig = Pick<
  SpacingConfig,
  'spacingIncrement' | 'shortestDurationSpace' | 'minNoteDistance' | 'justify'
>;
import { spacingDiagnostic, type SpacingDiagnostic } from './spacing-diagnostic.js';

/**
 * §14's own responsibility: decide the x-position of every event in a
 * measure and the measure's total width. Pure math -- produces numbers,
 * not SVG, and takes no dependency on `render/` or `geometry/` for the
 * same reason Phase 3's own dependency table keeps `layout/` one-way
 * (`layout/` orchestrates into positions that `render/` draws, never
 * the reverse).
 */
export interface SpacingEvent {
  readonly ticks: number;
  /**
   * The event's own full rendered width (notehead + accidentals + dots
   * + any horizontally-extending articulation) -- §14.2's own minimum-
   * distance floor is measured from this, not from the notehead alone.
   * A caller with nothing more specific may pass 0 here and rely on
   * proportional spacing alone (matching the pre-Phase-43 renderer's
   * own approximation).
   */
  readonly renderedWidth: number;
}

/**
 * §14.1: "the most frequently occurring shortest duration per measure,
 * NOT the globally shortest note" -- one stray 32nd note must not
 * inflate the whole score's spacing. Implemented as: group by exact
 * tick length, rank by frequency (descending), and where two lengths
 * tie on frequency, prefer the SHORTER one -- "shortest" is the
 * qualifier that breaks a frequency tie, not a separate ranking axis.
 *
 * Falls back to a quarter note's own tick length (§6.2's
 * `TICKS_PER_QUARTER`) for an empty measure, since a reference duration
 * of 0 would make every later ratio undefined.
 */
export function computeReferenceDuration(
  events: readonly SpacingEvent[],
  ticksPerQuarter: number,
): number {
  if (events.length === 0) return ticksPerQuarter;

  const counts = new Map<number, number>();
  for (const e of events) {
    counts.set(e.ticks, (counts.get(e.ticks) ?? 0) + 1);
  }

  let best: number | undefined;
  let bestCount = -1;
  for (const [ticks, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== undefined && ticks < best)) {
      best = ticks;
      bestCount = count;
    }
  }
  return best ?? ticksPerQuarter;
}

/**
 * §14.1's duration-proportional space, in staff spaces, that a note of
 * `ticks` is followed by relative to a system's own `referenceTicks`:
 * doubling the duration adds exactly one `spacingIncrement` (a
 * logarithmic relationship -- confirmed by §14's own worked example,
 * 8th->2.4sp, quarter->3.6sp, half->4.8sp, each step +1.2sp for each
 * doubling); a duration SHORTER than the reference instead scales
 * linearly by its own ratio against it, per §14.1's separate,
 * explicitly-stated rule for that case.
 */
export function computeEventSpace(
  ticks: number,
  referenceTicks: number,
  config: SpacingAlgorithmConfig,
): number {
  const baseSpace = config.shortestDurationSpace * config.spacingIncrement;
  const ratio = ticks / referenceTicks;
  if (ratio >= 1) {
    return baseSpace + config.spacingIncrement * Math.log2(ratio);
  }
  return baseSpace * ratio;
}

/**
 * The proportional x-position of every event in `events`, left to right,
 * starting at 0 -- each event's own position is the running sum of every
 * earlier event's `computeEventSpace` result. This is §14.1's algorithm
 * alone; §14.2's minimum-distance pass (`applyMinimumDistance`) and
 * §14.3's justification (`justifySystem`) are deliberately separate
 * functions, run afterward, matching the plan's own two-pass structure.
 */
export function computeProportionalPositions(
  events: readonly SpacingEvent[],
  referenceTicks: number,
  config: SpacingAlgorithmConfig,
): readonly number[] {
  const positions: number[] = [];
  let x = 0;
  for (const e of events) {
    positions.push(x);
    x += computeEventSpace(e.ticks, referenceTicks, config);
  }
  return positions;
}

/**
 * §14.2: a second pass over already-computed proportional positions,
 * enforcing a real minimum gap for every adjacent pair -- the left
 * element's own full rendered width plus `config.minNoteDistance`.
 * Where that minimum wins over the proportional gap, every position
 * from that point on is pushed forward by the shortfall (a cascading
 * push, not a local fix -- pushing only one position would leave the
 * NEXT gap too small again).
 */
export function applyMinimumDistance(
  positions: readonly number[],
  events: readonly SpacingEvent[],
  config: SpacingAlgorithmConfig,
): readonly number[] {
  if (positions.length === 0) return positions;
  const result: number[] = [positions[0] ?? 0];
  for (let i = 1; i < positions.length; i++) {
    const previousPosition = result[i - 1] ?? 0;
    const previousWidth = events[i - 1]?.renderedWidth ?? 0;
    const minimumX = previousPosition + previousWidth + config.minNoteDistance;
    const proportionalX = positions[i] ?? 0;
    result.push(Math.max(proportionalX, minimumX));
  }
  return result;
}

/**
 * §14.3: stretches a set of adjacent positions so the last one reaches
 * `targetWidth`, distributing the added space proportionally to each
 * gap's OWN natural size ("each spring's flexibility") -- a gap that
 * was already wide absorbs proportionally more of the stretch than a
 * narrow one, keeping the piece's own relative rhythm-driven spacing
 * intact rather than spreading everything evenly.
 *
 * §14.3 also states the *policy* that the final system of a piece is
 * never stretched (ragged-right) -- that decision belongs to whichever
 * caller groups events into systems (§16, not yet built); this function
 * itself is a pure stretch-to-width operation with no opinion on when to
 * call it. `config.justify === false` disables stretching outright.
 */
export function justifySystem(
  positions: readonly number[],
  targetWidth: number,
  config: SpacingAlgorithmConfig,
): readonly number[] {
  if (!config.justify || positions.length < 2) return positions;

  const first = positions[0] ?? 0;
  const last = positions[positions.length - 1] ?? 0;
  const naturalWidth = last - first;
  const extra = targetWidth - naturalWidth;
  if (naturalWidth <= 0 || extra <= 0) return positions;

  const gaps: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    gaps.push((positions[i] ?? 0) - (positions[i - 1] ?? 0));
  }

  const result: number[] = [first];
  let x = first;
  for (const gap of gaps) {
    const stretchedGap = gap + extra * (gap / naturalWidth);
    x += stretchedGap;
    result.push(x);
  }
  return result;
}

/**
 * §14's own stated error condition: a measure that's wider than the
 * available system width even after §14.2's minimum-distance pass.
 * Returns a warning rather than throwing or clamping -- the overflow is
 * ALLOWED to stand (this function never modifies `positions`), and §16
 * (system/page breaking, not yet built) is where a real fix -- breaking
 * the system earlier -- eventually belongs.
 */
export function checkMeasureOverflow(
  positions: readonly number[],
  events: readonly SpacingEvent[],
  availableWidth: number,
): SpacingDiagnostic | undefined {
  if (positions.length === 0) return undefined;
  const first = positions[0] ?? 0;
  const last = positions[positions.length - 1] ?? 0;
  const lastWidth = events[events.length - 1]?.renderedWidth ?? 0;
  const requiredWidth = last - first + lastWidth;
  if (requiredWidth <= availableWidth) return undefined;
  return spacingDiagnostic(
    'warning',
    'MEASURE_OVERFLOWS_SYSTEM_WIDTH',
    `This measure needs ${requiredWidth.toFixed(2)} staff spaces but only ${availableWidth.toFixed(2)} are available even at minimum spacing; allowing the overflow.`,
  );
}
