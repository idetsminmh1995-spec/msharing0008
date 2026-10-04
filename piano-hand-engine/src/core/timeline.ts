/**
 * timeline.ts — the one clock.
 *
 * The notation engine, the audio, the keyboard animation and the hands
 * all have to agree about what "now" is, and the spec's rule for that
 * is blunt: visual anticipation may start before a note, but KEY
 * CONTACT IS AT THE MIDI TIME, exactly. So this engine never adjusts a
 * note's time to make a movement look better. It moves the hand earlier
 * instead.
 *
 * Milliseconds throughout, as a floating-point number from the start of
 * the content. Not ticks: ticks belong to a score and this engine also
 * accepts MIDI; not seconds: a frame at 60fps is 16.67ms and a timeline
 * in seconds spends its precision on the part nobody is looking at.
 */

/** A frame rate a video is actually rendered at. */
export type FrameRate = 24 | 25 | 30 | 50 | 60;

export interface TimelineOptions {
  readonly fps: FrameRate;
  /** How long the performance runs, in milliseconds. */
  readonly durationMs: number;
}

/**
 * Frame `n` is the instant `n / fps` seconds in -- the START of the
 * frame's interval, not its middle.
 *
 * The start, because that is what every other clock in this project
 * means by a time: the notation cursor at 1.000s is drawn where the
 * music is at 1.000s, and a hand sampled half a frame later would be
 * consistently ahead of it by a hair at 60fps and visibly at 24.
 */
export function frameTimeMs(frame: number, fps: FrameRate): number {
  return (frame * 1000) / fps;
}

export function frameCount(durationMs: number, fps: FrameRate): number {
  return Math.max(0, Math.ceil((durationMs / 1000) * fps));
}

/** Every frame of a render, in order. Deterministic: the same input gives the same frames. */
export function frameTimes(options: TimelineOptions): readonly number[] {
  const count = frameCount(options.durationMs, options.fps);
  const times: number[] = [];
  for (let frame = 0; frame < count; frame++) times.push(frameTimeMs(frame, options.fps));
  return times;
}

/**
 * Anything with a start and a length, which is most of what this engine
 * carries around.
 */
export interface Timed {
  readonly timeMs: number;
  readonly durationMs: number;
}

export function endMs(event: Timed): number {
  return event.timeMs + event.durationMs;
}

export function isSoundingAt(event: Timed, timeMs: number): boolean {
  return timeMs >= event.timeMs && timeMs < endMs(event);
}

/**
 * The events sounding at an instant, from a list already in time order.
 *
 * A linear scan with a remembered cursor rather than a binary search:
 * a renderer asks for consecutive, increasing times, so the cursor
 * almost never moves more than a note or two. `reset()` is for a seek.
 */
export class TimelineCursor<T extends Timed> {
  private index = 0;

  constructor(private readonly events: readonly T[]) {}

  reset(): void {
    this.index = 0;
  }

  /** Everything sounding at `timeMs`. Call with non-decreasing times for the cheap path. */
  soundingAt(timeMs: number): readonly T[] {
    if (this.index > 0) {
      const current = this.events[this.index - 1];
      if (current !== undefined && current.timeMs > timeMs) this.index = 0;
    }
    while (this.index < this.events.length) {
      const event = this.events[this.index];
      if (event === undefined || event.timeMs > timeMs) break;
      this.index++;
    }
    const out: T[] = [];
    // Backwards from the cursor: a note that started long ago can still
    // be held, so the scan cannot stop at the first one that has ended.
    for (let i = this.index - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event === undefined) continue;
      if (isSoundingAt(event, timeMs)) out.push(event);
      // Nothing before this can still be sounding once we are past the
      // longest note seen. Without a bound this is O(n) per frame, so
      // the loop stops after a generous one.
      if (timeMs - event.timeMs > LOOKBACK_MS) break;
    }
    return out.reverse();
  }
}

/**
 * How far back the cursor looks for a note that is still held.
 *
 * Thirty seconds: longer than any single note in real music, short
 * enough that the scan stays bounded on a long piece. A note held
 * longer than this is a pedal effect, not a finger on a key.
 */
const LOOKBACK_MS = 30_000;

/** The next event starting at or after `timeMs`, which is what anticipation looks ahead to. */
export function nextAfter<T extends Timed>(
  events: readonly T[],
  timeMs: number,
  from = 0,
): T | undefined {
  for (let i = from; i < events.length; i++) {
    const event = events[i];
    if (event !== undefined && event.timeMs >= timeMs) return event;
  }
  return undefined;
}
