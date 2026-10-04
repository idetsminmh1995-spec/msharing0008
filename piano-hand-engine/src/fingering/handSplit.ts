/**
 * handSplit.ts — Module 2: which hand plays which note.
 *
 * The spec's rule is the whole of this file: **do not blindly split
 * hands by MIDI pitch.** A pitch split draws a line across the keyboard
 * and puts everything above it in the right hand, which is wrong for
 * every piece where the hands cross, wrong for an accompaniment that
 * climbs above the tune, and wrong at every moment a left hand reaches
 * over. It also looks wrong in a way a viewer notices immediately,
 * because a hand that teleports past the other is not a hand.
 *
 * So the evidence is taken in order of how much it knows, and only the
 * last resort looks at pitch at all -- and even then it looks at the
 * HANDS' POSITIONS over time rather than at a fixed line.
 *
 *   1. the source said so outright       confidence 1
 *   2. the staff it was written on       confidence 0.95
 *   3. the voice, where staves agree     confidence 0.8
 *   4. the MIDI track                    confidence 0.7
 *   5. inference from where the hands are  confidence 0.5
 */

import type { Hand, PerformanceNote } from '../core/types.js';
import { groupByOnset, type OnsetGroup } from '../core/timeline.js';
import { keyDistanceMm, type Keyboard } from '../keyboard/keyPosition.js';
import { WHITE_KEY_WIDTH_MM } from '../keyboard/pianoGeometry.js';
import { spansFor } from './handSpan.js';
import type { HandProfile } from '../kinematics/handPose.js';

export type HandReason = 'stated' | 'staff' | 'voice' | 'track' | 'inferred';

export interface HandDecision {
  readonly noteId: string;
  readonly hand: Hand;
  readonly reason: HandReason;
  readonly confidence: number;
}

export interface HandSplitOptions {
  readonly keyboard: Keyboard;
  readonly profile?: HandProfile;
  /**
   * The hand the engine assumes when it has nothing at all -- a single
   * note at the very start of a piece with no staff, no track and no
   * previous position. Right, because a melody is the commoner case.
   */
  readonly fallback?: Hand;
}

export interface HandSplitResult {
  readonly decisions: readonly HandDecision[];
  readonly byNoteId: ReadonlyMap<string, HandDecision>;
  /** Moments where the hands cross -- the left playing above the right, or the other way. */
  readonly crossings: readonly number[];
}

const CONFIDENCE: Readonly<Record<HandReason, number>> = {
  stated: 1,
  staff: 0.95,
  voice: 0.8,
  track: 0.7,
  inferred: 0.5,
};

export function splitHands(
  notes: readonly PerformanceNote[],
  options: HandSplitOptions,
): HandSplitResult {
  const spans = spansFor(options.profile);
  const fallback = options.fallback ?? 'right';

  // Evidence 1-4 first, note by note: they do not depend on each other
  // or on time, so there is nothing to walk.
  const decisions = new Map<string, HandDecision>();
  const undecided: PerformanceNote[] = [];
  const staffMap = staffToHand(notes);
  const trackMap = trackToHand(notes);

  for (const note of notes) {
    const direct = statedEvidence(note, staffMap, trackMap);
    if (direct !== undefined) decisions.set(note.id, { noteId: note.id, ...direct });
    else undecided.push(note);
  }

  // Evidence 5: the rest, in time order, from where the hands ARE.
  if (undecided.length > 0) {
    for (const decision of inferFromPosition(
      undecided,
      decisions,
      options.keyboard,
      spans,
      fallback,
    )) {
      decisions.set(decision.noteId, decision);
    }
  }

  const ordered = notes
    .map((note) => decisions.get(note.id))
    .filter((d): d is HandDecision => d !== undefined);

  return {
    decisions: ordered,
    byNoteId: decisions,
    crossings: findCrossings(notes, decisions),
  };
}

function statedEvidence(
  note: PerformanceNote,
  staffMap: ReadonlyMap<number, Hand> | undefined,
  trackMap: ReadonlyMap<number, Hand> | undefined,
): Omit<HandDecision, 'noteId'> | undefined {
  if (note.statedHand !== undefined) {
    return { hand: note.statedHand, reason: 'stated', confidence: CONFIDENCE.stated };
  }
  if (note.staff !== undefined && staffMap !== undefined) {
    const hand = staffMap.get(note.staff);
    if (hand !== undefined) return { hand, reason: 'staff', confidence: CONFIDENCE.staff };
  }
  if (note.track !== undefined && trackMap !== undefined) {
    const hand = trackMap.get(note.track);
    if (hand !== undefined) return { hand, reason: 'track', confidence: CONFIDENCE.track };
  }
  return undefined;
}

/**
 * Which staff means which hand.
 *
 * A grand staff is the strongest evidence there is: the upper staff IS
 * the right hand, by the convention the notation was written in. But it
 * is only evidence when there are two of them -- a single-staff part is
 * a melody, and its staff number says nothing about hands at all, which
 * is exactly the case the old `staff >= 2 ? 'left' : 'right'` got wrong
 * by always answering "right".
 *
 * Three or more staves (an organ part, a piano with an ossia) are left
 * alone rather than guessed at.
 */
function staffToHand(notes: readonly PerformanceNote[]): ReadonlyMap<number, Hand> | undefined {
  const staves = new Set<number>();
  for (const note of notes) if (note.staff !== undefined) staves.add(note.staff);
  if (staves.size !== 2) return undefined;
  const sorted = [...staves].sort((a, b) => a - b);
  const upper = sorted[0];
  const lower = sorted[1];
  if (upper === undefined || lower === undefined) return undefined;
  return new Map<number, Hand>([
    [upper, 'right'],
    [lower, 'left'],
  ]);
}

/**
 * Which MIDI track means which hand.
 *
 * Only when there are exactly two and their pitch ranges actually
 * separate -- two tracks that overlap completely are a melody and a
 * doubling, not two hands. The lower-centred one is the left.
 */
function trackToHand(notes: readonly PerformanceNote[]): ReadonlyMap<number, Hand> | undefined {
  const byTrack = new Map<number, number[]>();
  for (const note of notes) {
    if (note.track === undefined) continue;
    const list = byTrack.get(note.track) ?? [];
    list.push(note.midi);
    byTrack.set(note.track, list);
  }
  if (byTrack.size !== 2) return undefined;
  const entries = [...byTrack.entries()].map(([track, pitches]) => ({
    track,
    mean: pitches.reduce((sum, p) => sum + p, 0) / pitches.length,
  }));
  entries.sort((a, b) => a.mean - b.mean);
  const low = entries[0];
  const high = entries[1];
  if (low === undefined || high === undefined) return undefined;
  // Less than a fifth between their centres is not two hands.
  if (high.mean - low.mean < 7) return undefined;
  return new Map<number, Hand>([
    [low.track, 'left'],
    [high.track, 'right'],
  ]);
}

/**
 * The last resort: split by where the hands already are.
 *
 * Walks the onsets in time. At each one it tries every place the notes
 * could be cut between the two hands -- all of them in the left, all in
 * the right, and each split in between -- and takes the one that costs
 * least. The cost is what a player would mind:
 *
 *   - a group one hand cannot SPAN is not that hand's. This is the
 *     only hard rule; everything else is a preference.
 *   - a hand that has to travel a long way since it last played pays
 *     for the distance, and pays more when there was no time.
 *   - a hand with nothing to do is free, but a hand that NEVER plays is
 *     not what a two-handed piece looks like, so an empty hand pays a
 *     little to keep the music from drifting into one hand.
 *
 * Because it costs TRAVEL and not pitch, a left hand that has climbed
 * above the right keeps the notes it has climbed to. That is a crossing,
 * and it falls out of the model rather than being special-cased.
 */
function inferFromPosition(
  notes: readonly PerformanceNote[],
  already: ReadonlyMap<string, HandDecision>,
  keyboard: Keyboard,
  spans: ReturnType<typeof spansFor>,
  fallback: Hand,
): readonly HandDecision[] {
  const out: HandDecision[] = [];
  const groups = groupByOnset(notes);

  // Where each hand last was, as a MIDI note, and when.
  const last: Record<Hand, { midi: number; timeMs: number } | undefined> = {
    left: undefined,
    right: undefined,
  };
  // Anything already decided tells the hands where they are, so an
  // inferred note after a stated one starts from the truth.
  for (const note of notes) {
    const decided = already.get(note.id);
    if (decided === undefined) continue;
    last[decided.hand] = { midi: note.midi, timeMs: note.timeMs };
  }

  for (const group of groups) {
    const sorted = [...group.notes].sort((a, b) => a.midi - b.midi);
    let best: { cut: number; cost: number } | undefined;

    // `cut` notes go to the left hand, the rest to the right.
    for (let cut = 0; cut <= sorted.length; cut++) {
      const lower = sorted.slice(0, cut);
      const upper = sorted.slice(cut);
      const cost =
        handCost('left', lower, last.left, group, keyboard, spans, fallback) +
        handCost('right', upper, last.right, group, keyboard, spans, fallback);
      if (best === undefined || cost < best.cost) best = { cut, cost };
    }

    const cut = best?.cut ?? sorted.length;
    sorted.forEach((note, index) => {
      const hand: Hand = index < cut ? 'left' : 'right';
      out.push({ noteId: note.id, hand, reason: 'inferred', confidence: CONFIDENCE.inferred });
    });
    const lower = sorted.slice(0, cut);
    const upper = sorted.slice(cut);
    if (lower.length > 0) last.left = centreOf(lower, group.timeMs);
    if (upper.length > 0) last.right = centreOf(upper, group.timeMs);
  }
  return out;
}

function centreOf(
  notes: readonly PerformanceNote[],
  timeMs: number,
): { midi: number; timeMs: number } {
  const sum = notes.reduce((total, note) => total + note.midi, 0);
  return { midi: sum / notes.length, timeMs };
}

/**
 * Using a hand at all costs something.
 *
 * Without this the model would split every chord: a cost that rises
 * with span makes two small groups cheaper than one larger one, every
 * time, and a C major triad would come out as one note in each hand.
 * What a player actually does is take a chord in one hand whenever one
 * hand reaches it, so reaching for the second hand has to cost more
 * than the stretch it saves.
 *
 * The number sets a POLICY, and it is worth saying what it is: against
 * the strain weight below, a hand keeps a chord to itself while the
 * stretch is under about a third of the way from its comfortable reach
 * to its maximum, and gives half away past that. So a medium hand takes
 * an octave alone and splits a tenth, and a small hand splits the
 * octave -- which is the hand size actually changing the answer rather
 * than being a setting that does nothing.
 */
const ENGAGE_HAND = 0.6;

/** Breaking a tie, and nothing more: a lone note with no history is the melody. */
const NOT_THE_FALLBACK_HAND = 0.05;

/** What it costs one hand to take this set of notes at this moment. */
function handCost(
  hand: Hand,
  notes: readonly PerformanceNote[],
  last: { midi: number; timeMs: number } | undefined,
  group: OnsetGroup<PerformanceNote>,
  keyboard: Keyboard,
  spans: ReturnType<typeof spansFor>,
  fallback: Hand,
): number {
  // An idle hand is free. A hand resting while the other plays a melody
  // is what most of most pieces looks like.
  if (notes.length === 0) return 0;

  const low = notes[0];
  const high = notes[notes.length - 1];
  if (low === undefined || high === undefined) return 0;

  let cost = ENGAGE_HAND;
  if (hand !== fallback) cost += NOT_THE_FALLBACK_HAND;

  // The hard rule: a hand that cannot span it is not the hand. Inside
  // its comfortable reach the span is free -- a hand holding a fifth is
  // not working -- and past that it costs, up to refusal.
  const spanMm = Math.abs(keyDistanceMm(keyboard, low.midi, high.midi));
  const reach = spans['1-5'];
  if (reach !== undefined) {
    if (spanMm > reach.max) return Number.POSITIVE_INFINITY;
    if (spanMm > reach.comfort) {
      const range = Math.max(1e-6, reach.max - reach.comfort);
      cost += ((spanMm - reach.comfort) / range) * 2;
    }
  }

  // Travel since this hand last played, and how little time it had.
  if (last !== undefined) {
    const travelMm = Math.abs(
      keyDistanceMm(keyboard, Math.round(last.midi), Math.round(centreOf(notes, 0).midi)),
    );
    const gapMs = Math.max(1, group.timeMs - last.timeMs);
    cost += travelMm / (4 * WHITE_KEY_WIDTH_MM);
    // A metre a second is a fast but real hand movement. Past that the
    // cost climbs steeply, which is what makes the solver hand the notes
    // to the hand that is already there.
    const speedMmPerMs = travelMm / gapMs;
    if (speedMmPerMs > 1) cost += (speedMmPerMs - 1) * 6;
  }

  return cost;
}

/**
 * Where the hands cross: the left hand playing above the right, or the
 * right below the left, at one onset.
 *
 * Reported rather than prevented. A crossing is a real thing players do
 * and the motion planner has to know about it -- a hand that has to
 * reach over another moves differently from one that does not.
 */
function findCrossings(
  notes: readonly PerformanceNote[],
  decisions: ReadonlyMap<string, HandDecision>,
): readonly number[] {
  const crossings: number[] = [];
  for (const group of groupByOnset(notes)) {
    let lowestRight = Number.POSITIVE_INFINITY;
    let highestLeft = Number.NEGATIVE_INFINITY;
    for (const note of group.notes) {
      const hand = decisions.get(note.id)?.hand;
      if (hand === 'right') lowestRight = Math.min(lowestRight, note.midi);
      if (hand === 'left') highestLeft = Math.max(highestLeft, note.midi);
    }
    if (highestLeft > lowestRight) crossings.push(group.timeMs);
  }
  return crossings;
}
