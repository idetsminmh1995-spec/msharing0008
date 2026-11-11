/**
 * pick.ts — which way the pick is travelling (Plan RH-P*).
 *
 * A guitarist's picking hand does not decide each stroke on its own:
 * it keeps moving in time, down on the beat and up between, and a
 * note takes whichever direction the hand happens to be going when it
 * arrives. That is why the rule is about the GRID and not about the
 * notes -- after a rest the hand has carried on ("ghost strokes"), so
 * the next note gets the direction of its slot, not a fresh down.
 *
 * Phase 1 is single-note lines: RH-01 (pick, or `auto` falling back to
 * pick), RH-P01, RH-P03 and RH-P04. Strums (RH-P05/06), economy
 * picking (RH-P02) and fingerstyle are later phases.
 */
import type { NoteEvent, Placement, TimeSignatureChange } from '../../core/types.js';
import type { RightHandEvent } from '../../core/timeline-schema.js';
import { TICKS_PER_QUARTER } from '../../input/musicxml/parse.js';

/** The subdivisions a beat is ever divided into, smallest first (RH-P01). */
const SUBDIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16];

/** A tick may miss its slot by this much and still belong to it. */
const SLOT_TOLERANCE_TICKS = 4;

export interface PickStage {
  readonly time: number;
  readonly tick: number;
  readonly notes: readonly NoteEvent[];
  readonly placements: readonly Placement[];
}

/** How long one beat lasts, in ticks, under the meter in force at a tick. */
export function beatTicksAt(meters: readonly TimeSignatureChange[], tick: number): number {
  let denominator = 4;
  for (const meter of meters) {
    if (meter.tick <= tick) denominator = meter.denominator;
    else break;
  }
  return (TICKS_PER_QUARTER * 4) / Math.max(1, denominator);
}

/** Where the beat containing this tick starts. */
function beatStartTick(meters: readonly TimeSignatureChange[], tick: number): number {
  let origin = 0;
  for (const meter of meters) {
    if (meter.tick <= tick) origin = meter.tick;
    else break;
  }
  const beat = beatTicksAt(meters, tick);
  return origin + Math.floor((tick - origin) / beat) * beat;
}

/**
 * [RH-P01] The smallest regular division that explains every onset in a beat.
 *
 * Eighths give two slots, sixteenths four, a triplet three. Asking for
 * the SMALLEST one that fits is what keeps a beat of eighths from
 * being picked as if it were sixteenths, which would have the hand
 * alternating twice as fast as it really is.
 */
export function subdivisionOfBeat(
  onsetTicks: readonly number[],
  beatStart: number,
  beatTicks: number,
): number {
  for (const division of SUBDIVISIONS) {
    const slot = beatTicks / division;
    const fits = onsetTicks.every((tick) => {
      const offset = tick - beatStart;
      return Math.abs(offset - Math.round(offset / slot) * slot) <= SLOT_TOLERANCE_TICKS;
    });
    if (fits) return division;
  }
  return SUBDIVISIONS[SUBDIVISIONS.length - 1] as number;
}

/** [RH-P03] A note the left hand sounds by itself is not picked. */
export function isLegatoTarget(note: NoteEvent): boolean {
  if (note.techniques.includes('tieContinuation')) return true;
  return (note.techniqueLinks ?? []).some(
    (link) =>
      link.fromNoteId !== undefined &&
      (link.type === 'hammerOn' || link.type === 'pullOff' || link.type === 'slide'),
  );
}

/**
 * Every stroke of the picking hand.
 *
 * One event per stage, because in Phase 1 a stage is one note. A
 * stage whose notes are all sounded by the left hand produces no
 * event at all -- drawing a pick stroke there would be a lie about
 * how the sound was made.
 */
export function pickEvents(
  stages: readonly PickStage[],
  meters: readonly TimeSignatureChange[],
): readonly RightHandEvent[] {
  // [RH-P01] the hand keeps moving whether or not a note is there, so
  // the grid is built from every onset in the beat, legato ones too.
  const byBeat = new Map<number, number[]>();
  for (const stage of stages) {
    const start = beatStartTick(meters, stage.tick);
    const list = byBeat.get(start);
    if (list === undefined) byBeat.set(start, [stage.tick]);
    else list.push(stage.tick);
  }

  const events: RightHandEvent[] = [];
  for (const stage of stages) {
    const played = stage.notes.filter((note) => !isLegatoTarget(note));
    if (played.length === 0) continue;

    const beatTicks = beatTicksAt(meters, stage.tick);
    const start = beatStartTick(meters, stage.tick);
    const division = subdivisionOfBeat(byBeat.get(start) ?? [stage.tick], start, beatTicks);
    const slotTicks = beatTicks / division;
    const slot = Math.round((stage.tick - start) / slotTicks);
    // [RH-P01/RH-P05] Down on the beat, up on the off-beat. The slot
    // is counted inside its own beat, so every beat starts on a
    // down-stroke however the beat is divided -- which is what a
    // player does, triplets included.

    // [RH-P04] a written down-bow or up-bow is the player's own
    // instruction and beats the grid.
    const locked = played.find((note) => note.lockedPickDir !== undefined)?.lockedPickDir;
    const direction = locked ?? (slot % 2 === 0 ? 'down' : 'up');

    const strings = played
      .map((note) => stage.placements.find((placement) => placement.noteId === note.noteId)?.string)
      .filter((string): string is number => string !== undefined)
      .sort((a, b) => a - b);

    events.push({
      time: stage.time,
      noteIds: played.map((note) => note.noteId),
      strings,
      kind: 'pick',
      direction,
      reason: locked !== undefined ? 'LOCKED' : direction === 'down' ? 'GRID_DOWN' : 'GRID_UP',
    });
  }
  return events;
}

/**
 * [RH-01/RH-02] Which hand style to use.
 *
 * Phase 1 plays with a pick: `auto` falls back to it, and a part that
 * asks for fingerstyle is told, once, that the fingers arrive in
 * Phase 3 rather than being silently picked as if nothing happened.
 */
export function resolveMode(configured: 'auto' | 'pick' | 'fingerstyle'): {
  mode: 'pick' | 'fingerstyle';
  warning?: string;
} {
  if (configured === 'fingerstyle') {
    return {
      mode: 'pick',
      warning: 'fingerstyle (p-i-m-a) arrives in Phase 3; this part was picked',
    };
  }
  return { mode: 'pick' };
}
