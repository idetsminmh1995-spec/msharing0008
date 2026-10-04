/**
 * fingeringSolver.ts — Module 3, the part that decides.
 *
 * Takes a hand's notes and gives every one of them a finger, by
 * searching the whole phrase rather than one note at a time. What it
 * costs is `fingeringCost.ts`; how it searches is `core/solver.ts`;
 * this file is the piano's own middle: what the candidates ARE, which
 * of them the file has already decided, and how far ahead to look.
 *
 *
 * HOW FAR AHEAD
 *
 * All of it. The search is a Viterbi with a beam, so the cost of
 * looking at the whole piece is linear in its length rather than
 * exponential, and a bounded look-ahead would only reintroduce the
 * problem it was meant to solve: a window that ends in the middle of a
 * scale decides the scale's fingering without knowing where it goes.
 * PianoPlayer looks 5 to 9 notes ahead because it searches
 * combinations; a lattice does not have to.
 *
 *
 * WHAT THE FILE ALREADY SAID
 *
 * A `<technical><fingering>` is not a hint. Someone wrote it, usually
 * the editor of the edition, and the engine's job is to animate it, not
 * to have an opinion about it. A stated finger becomes the ONLY
 * candidate for its note, so the search plans the notes around it
 * instead of overruling it.
 */

import { solveStages } from '../core/solver.js';
import { groupByOnset } from '../core/timeline.js';
import type { Finger, Hand, PerformanceNote } from '../core/types.js';
import { ALL_FINGERS } from '../core/types.js';
import type { Keyboard } from '../keyboard/keyPosition.js';
import type { HandProfile } from '../kinematics/handPose.js';
import { spansFor } from './handSpan.js';
import {
  IMPOSSIBLE,
  stageCost,
  transitionCost,
  type CostContext,
  type FingeringStage,
  type FingeringState,
} from './fingeringCost.js';

/** The spec's own shape, and the only thing a caller downstream needs. */
export interface FingerAssignment {
  readonly noteId: string;
  readonly hand: Hand;
  readonly finger: Finger;
}

export interface FingeringOptions {
  readonly keyboard: Keyboard;
  readonly profile?: HandProfile;
  /**
   * A finger the caller insists on, by note id, overriding both the
   * file and the search. The manual override of the spec's "predefined
   * fingering / automatic fingering / manual override" trio -- the
   * other two are `PerformanceNote.statedFinger` and the search itself.
   */
  readonly overrides?: ReadonlyMap<string, Finger>;
  readonly beamWidth?: number;
}

export interface FingeringResult {
  readonly assignments: readonly FingerAssignment[];
  readonly byNoteId: ReadonlyMap<string, FingerAssignment>;
  /** Total cost of the chosen path -- comparable between fingerings of the SAME passage, and nothing else. */
  readonly cost: number;
  /** Onsets the solver had to relax its rules for: a stretch no hand of this size really holds. */
  readonly strainedOnsets: readonly number[];
  /**
   * Notes that came out with NO finger, because nothing could play the
   * onset they are in -- a chord wider than any hand, usually, which
   * means the hand split should have given it to two.
   *
   * Reported by id rather than counted, so a caller can say which note
   * on the staff the engine could not place. The notes around it are
   * fingered as usual: one unplayable chord must not cost the bar.
   */
  readonly unfingered: readonly string[];
  /** True when some onset could not be fingered at all. */
  readonly incomplete: boolean;
}

/**
 * One hand's notes, fingered.
 *
 * Both hands go through this separately, because they are: a left hand
 * does not care what the right is doing except where they collide, and
 * that is the motion planner's problem rather than the fingering's.
 */
export function solveFingering(
  notes: readonly PerformanceNote[],
  hand: Hand,
  options: FingeringOptions,
): FingeringResult {
  const context: CostContext = {
    keyboard: options.keyboard,
    spans: spansFor(options.profile),
  };

  const stages: FingeringStage[] = groupByOnset(notes).map((group) => ({
    timeMs: group.timeMs,
    durationMs: Math.max(...group.notes.map((note) => note.durationMs)),
    hand,
    // Lowest pitch first. The cost model relies on it throughout: that
    // is what makes "the fingers run the same way as the notes" a
    // comparison rather than a sort.
    notes: [...group.notes]
      .sort((a, b) => a.midi - b.midi)
      .map((note) => ({ id: note.id, midi: note.midi })),
  }));

  const locked = lockedFingers(notes, options.overrides);

  const solved = solveStages<FingeringStage, FingeringState>({
    stages,
    beamWidth: options.beamWidth ?? 48,
    expand: (_previous, stage, _index, relax) => candidatesFor(stage, locked, relax),
    stateCost: (state, stage) => stageCost(state, stage, context),
    transitionCost: (from, to, fromStage, toStage) =>
      transitionCost(from, to, fromStage, toStage, context),
    stateKey: (state) => state.fingers.join(','),
  });

  const assignments: FingerAssignment[] = [];
  const byNoteId = new Map<string, FingerAssignment>();
  const unfingered: string[] = [];
  stages.forEach((stage, index) => {
    const state = solved.path[index];
    if (state === undefined) {
      for (const note of stage.notes) unfingered.push(note.id);
      return;
    }
    stage.notes.forEach((note, i) => {
      const finger = state.fingers[i];
      if (finger === undefined) {
        unfingered.push(note.id);
        return;
      }
      const assignment: FingerAssignment = { noteId: note.id, hand, finger };
      assignments.push(assignment);
      byNoteId.set(note.id, assignment);
    });
  });

  return {
    assignments,
    byNoteId,
    cost: solved.totalCost,
    strainedOnsets: [...solved.relaxedStages, ...solved.skippedStages]
      .sort((a, b) => a - b)
      .map((index) => stages[index]?.timeMs)
      .filter((time): time is number => time !== undefined),
    unfingered,
    incomplete: solved.incomplete,
  };
}

/** A caller's override beats the file, and the file beats the search. */
function lockedFingers(
  notes: readonly PerformanceNote[],
  overrides: ReadonlyMap<string, Finger> | undefined,
): ReadonlyMap<string, Finger> {
  const locked = new Map<string, Finger>();
  for (const note of notes) {
    if (note.statedFinger !== undefined) locked.set(note.id, note.statedFinger);
  }
  if (overrides !== undefined) {
    for (const [id, finger] of overrides) locked.set(id, finger);
  }
  return locked;
}

/**
 * Every way this onset could be played.
 *
 * For one note: five fingers, or the one the file named. For a chord of
 * k notes: every ORDERED choice of k fingers out of five that runs the
 * same way as the pitches -- which is what makes a chord of three a
 * choice between ten shapes rather than sixty.
 *
 * `relax` is what happens when none of them survive the cost model. The
 * first pass keeps the file's stated fingers; past that they are let go,
 * one kind of constraint at a time, because a stated fingering for a
 * different-sized hand is better ignored than left unplayable. A stage
 * that needed relaxing is reported, never silently fixed.
 */
function candidatesFor(
  stage: FingeringStage,
  locked: ReadonlyMap<string, Finger>,
  relax: number,
): readonly FingeringState[] {
  const count = stage.notes.length;
  if (count === 0 || count > ALL_FINGERS.length) return [];

  const perNote = stage.notes.map((note) => {
    const lock = relax === 0 ? locked.get(note.id) : undefined;
    return lock !== undefined ? [lock] : [...ALL_FINGERS];
  });

  const out: FingeringState[] = [];
  const build = (index: number, chosen: Finger[]): void => {
    if (index === count) {
      out.push({ fingers: [...chosen] });
      return;
    }
    for (const finger of perNote[index] ?? []) {
      const previous = chosen[chosen.length - 1];
      if (previous !== undefined) {
        // Prune in the generator rather than costing and discarding:
        // for a four-note chord this is the difference between 625
        // candidates and 5.
        if (stage.hand === 'right' ? finger <= previous : finger >= previous) continue;
      }
      chosen.push(finger);
      build(index + 1, chosen);
      chosen.pop();
    }
  };
  build(0, []);

  // Past the second relaxation the ordering rule itself goes, so a
  // stage the engine cannot otherwise play gets SOMETHING rather than
  // nothing. It will cost `IMPOSSIBLE` and be reported.
  if (out.length === 0 && relax >= 2) {
    return [{ fingers: stage.notes.map((_, i) => ALL_FINGERS[i % 5] ?? 1) }];
  }
  return out;
}

export { IMPOSSIBLE };
