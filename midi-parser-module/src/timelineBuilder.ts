// src/timelineBuilder.ts
// Converts ParsedNote[] into the deterministic AnimationEvent[] timeline that
// both the preview renderer and the final video renderer consume as their
// single source of truth.
//
// Core rule (Section 7 of the spec): for repeated hits of the SAME MIDI note
// number, alternate R -> L -> R -> L ... The alternation state is tracked
// INDEPENDENTLY per note number — never one global R/L flag.

import { AnimationEvent, Hand, ParsedNote } from './types';

export function buildAnimationTimeline(notes: ParsedNote[]): AnimationEvent[] {
  // Per-note-number alternation state. Not yet seen -> first hit is 'R'.
  const lastHandByNote = new Map<number, Hand>();

  // Notes may not already be sorted by the caller; sort defensively so
  // alternation order is always correct regardless of input order.
  const sorted = [...notes].sort((a, b) => a.time - b.time);

  const timeline: AnimationEvent[] = sorted.map((note) => {
    const previousHand = lastHandByNote.get(note.midiNote);
    const nextHand: Hand = previousHand === 'R' ? 'L' : 'R'; // undefined or 'L' -> 'R'
    lastHandByNote.set(note.midiNote, nextHand);

    return {
      time: note.time,
      midiNote: note.midiNote,
      hand: nextHand,
      velocity: note.velocity,
      duration: note.duration,
    };
  });

  return timeline;
}

/**
 * Groups timeline events that occur at (nearly) the same time, so the
 * renderer can treat them as concurrent layers rather than accidentally
 * overwriting one another (Section 11 of the spec).
 *
 * `toleranceSeconds` accounts for near-simultaneous MIDI events that aren't
 * bit-for-bit identical timestamps but should visually read as "at once".
 */
export function groupSimultaneous(
  timeline: AnimationEvent[],
  toleranceSeconds = 0.01
): AnimationEvent[][] {
  const groups: AnimationEvent[][] = [];
  for (const event of timeline) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && event.time - lastGroup[0].time <= toleranceSeconds) {
      lastGroup.push(event);
    } else {
      groups.push([event]);
    }
  }
  return groups;
}
