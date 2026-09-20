/**
 * rule08-11-29-39-solver.ts
 *
 * RULE 8  — STICKING SEQUENCE CONTINUITY
 *   "Sequence quality outranks isolated note quality."
 * RULE 11 — FOUR-LIMB COORDINATION & SIMULTANEOUS EVENT SOLVING
 *   "Hands and feet do not solve independently when simultaneous."
 * RULE 29 — PERFORMANCE SOLVING PIPELINE, LOOKAHEAD WINDOW & ITERATIVE SOLVER
 *   "Look far, commit near."
 * RULE 39 — PERFORMANCE EXECUTION LOOP & STATE COMMIT PIPELINE
 *   "Search branches are speculative. Only validated selections mutate
 *   authoritative state."
 *
 * One algorithm: a windowed beam search (29) that jointly resolves
 * simultaneous limb conflicts (11), scores whole hypotheses rather than
 * single notes (8), and only ever mutates the REAL DrummerState at an
 * explicit commit point (39).
 */

import type { DrumEvent, DrummerState, Limb, SequenceDecision } from './datamodel.js';
import { LIMBS, snapshotState } from './datamodel.js';
import { checkReachability } from './rule06-reachability.js';
import { generateHandCandidates, MANUAL_LIMBS } from './rule07-hand-candidates.js';

export const SIMULTANEITY_EPSILON_S = 0.004;
export const DEFAULT_WINDOW = 12;
export const DEFAULT_BEAM_WIDTH = 6;

/** Rule 11: events close enough in time to be physically simultaneous, solved jointly. */
function groupSimultaneous(events: readonly DrumEvent[]): DrumEvent[][] {
  const groups: DrumEvent[][] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (
      last !== undefined &&
      Math.abs(ev.timeSeconds - (last[0] as DrumEvent).timeSeconds) < SIMULTANEITY_EPSILON_S
    ) {
      last.push(ev);
    } else {
      groups.push([ev]);
    }
  }
  return groups;
}

/**
 * The ONLY place limb state is mutated during search -- and always on a
 * cloned speculative state, never the authoritative one (see solveWindow).
 */
function applyDecision(state: DrummerState, event: DrumEvent, limb: Limb): void {
  const ls = state.limbs[limb];
  ls.position = [event.target.x, event.target.y, event.target.height];
  ls.lastEventId = event.eventId;
  ls.lastActionTimeS = event.timeSeconds;
  ls.readyTimeS = event.timeSeconds; // refined later by Rule 10 recovery
  state.memory.recentLimbSequence.push(limb);
  state.memory.recentEventIds.push(event.eventId);
  if (state.memory.recentLimbSequence.length > 64) {
    state.memory.recentLimbSequence.shift();
    state.memory.recentEventIds.shift();
  }
}

function availableTime(state: DrummerState, limb: Limb, eventTime: number): number {
  const lastT = state.limbs[limb].lastActionTimeS;
  if (lastT < -900) return 999.0; // nothing played yet on this limb
  return Math.max(0.0, eventTime - lastT);
}

type Assignment = readonly (readonly [DrumEvent, Limb, number])[];

/**
 * Rule 11: for a simultaneous group, the joint (assignment, score)
 * options, ensuring no limb is asked to play two targets at once.
 */
function solveGroupCandidates(
  group: readonly DrumEvent[],
  state: DrummerState,
): (readonly [Assignment, number])[] {
  if (group.length === 1) {
    const ev = group[0] as DrumEvent;
    const avail: Partial<Record<Limb, number>> = {};
    for (const l of MANUAL_LIMBS) avail[l] = availableTime(state, l, ev.timeSeconds);
    const cands = generateHandCandidates(ev, state, avail);
    const options: (readonly [Assignment, number])[] = [];
    for (const c of cands) {
      if (c.reachable) options.push([[[ev, c.limb, c.score]], c.score]);
    }
    if (options.length === 0) {
      // No reachable hand at all: a best-effort fallback so the pipeline
      // never crashes. Rule 25 flags this as an error.
      let best = cands[0] as (typeof cands)[number];
      for (const c of cands) if (c.score > best.score) best = c;
      return [[[[ev, best.limb, best.score]], best.score]];
    }
    return options;
  }

  if (group.length === 2) {
    const options: (readonly [Assignment, number])[] = [];
    for (const perm of [
      ['RH', 'LH'],
      ['LH', 'RH'],
    ] as readonly (readonly Limb[])[]) {
      const assignment: (readonly [DrumEvent, Limb, number])[] = [];
      let total = 0.0;
      let ok = true;
      for (let i = 0; i < group.length; i++) {
        const ev = group[i] as DrumEvent;
        const limb = perm[i] as Limb;
        const avail = availableTime(state, limb, ev.timeSeconds);
        const cands = generateHandCandidates(ev, state, { [limb]: avail });
        const cand = cands.find((c) => c.limb === limb);
        if (cand === undefined || !cand.reachable) {
          ok = false;
          break;
        }
        assignment.push([ev, limb, cand.score]);
        total += cand.score;
      }
      if (ok) options.push([assignment, total]);
    }
    if (options.length === 0) {
      // Physically impossible for two hands: best-effort, flagged by Rule 25.
      return [
        [
          [
            [group[0] as DrumEvent, 'RH', -5.0],
            [group[1] as DrumEvent, 'LH', -5.0],
          ],
          -10.0,
        ],
      ];
    }
    return options;
  }

  // More than 2 truly-simultaneous manual events is impossible for a
  // two-handed drummer. Alternate across the group and let Rule 25 raise
  // validation errors for the unplayable excess.
  const assignment: (readonly [DrumEvent, Limb, number])[] = [];
  let total = 0.0;
  group.forEach((ev, i) => {
    assignment.push([ev, MANUAL_LIMBS[i % 2] as Limb, -2.0]);
    total -= 2.0;
  });
  return [[assignment, total]];
}

/**
 * RULE 29 core: beam search across one lookahead window of simultaneity
 * groups. RULE 39 discipline: all work happens on cloned speculative
 * states; the caller commits only the winning branch.
 */
export function solveWindow(
  groups: readonly (readonly DrumEvent[])[],
  baseState: DrummerState,
  beamWidth: number = DEFAULT_BEAM_WIDTH,
): { decisions: SequenceDecision[]; state: DrummerState } {
  let beam: { state: DrummerState; decisions: SequenceDecision[]; score: number }[] = [
    { state: snapshotState(baseState), decisions: [], score: 0.0 },
  ];

  for (const group of groups) {
    const newBeam: typeof beam = [];
    for (const branch of beam) {
      const options = solveGroupCandidates(group, branch.state);
      for (const [assignment, groupScore] of options) {
        const st2 = snapshotState(branch.state);
        const newDecisions = [...branch.decisions];
        for (const [ev, limb, noteScore] of assignment) {
          applyDecision(st2, ev, limb);
          newDecisions.push({
            eventId: ev.eventId,
            limb,
            sequenceCost: -noteScore,
            alternativesConsidered: options.length,
            lookaheadWindow: groups.length,
          });
        }
        newBeam.push({ state: st2, decisions: newDecisions, score: branch.score + groupScore });
      }
    }
    // Python: `new_beam.sort(key=lambda x: -x[2])`. Stable in both
    // languages, so ties keep the order the branches were generated in --
    // which is what makes the search reproducible.
    newBeam.sort((a, b) => -a.score - -b.score);
    beam = newBeam.slice(0, beamWidth);
  }

  const best = beam[0] as (typeof beam)[number];
  return { decisions: best.decisions, state: best.state };
}

/**
 * RULE 29 orchestration: roll a lookahead window across the whole manual
 * event stream, solving and COMMITTING (Rule 39) one window at a time, so
 * state always reflects only validated, real decisions.
 */
export function solveSticking(
  manualEvents: readonly DrumEvent[],
  state: DrummerState,
  windowSize: number = DEFAULT_WINDOW,
  beamWidth: number = DEFAULT_BEAM_WIDTH,
): SequenceDecision[] {
  if (manualEvents.length === 0) return [];

  const groups = groupSimultaneous(manualEvents);
  const allDecisions: SequenceDecision[] = [];

  for (let i = 0; i < groups.length; i += windowSize) {
    const window = groups.slice(i, i + windowSize);
    const { decisions, state: resolved } = solveWindow(window, state, beamWidth);
    // --- COMMIT POINT (Rule 39): only now does authoritative state change ---
    for (const limb of LIMBS) state.limbs[limb] = resolved.limbs[limb];
    state.memory = resolved.memory;
    allDecisions.push(...decisions);
  }

  return allDecisions;
}

/**
 * RULE 11 (feet): kick and hi-hat-pedal targets already declare their
 * preferred limb in Rule 2's kit geometry, so feet need conflict and
 * timing feasibility checks only, not candidate scoring.
 */
export function assignFeet(
  footEvents: readonly DrumEvent[],
  state: DrummerState,
): SequenceDecision[] {
  const decisions: SequenceDecision[] = [];
  for (const ev of footEvents) {
    const limb = ev.target.preferredLimb as Limb;
    const avail = availableTime(state, limb, ev.timeSeconds);
    const reach = checkReachability(limb, state.limbs[limb], ev.target, avail, ev.eventId);
    applyDecision(state, ev, limb);
    decisions.push({
      eventId: ev.eventId,
      limb,
      sequenceCost: reach.reachable ? 0.0 : 5.0,
      alternativesConsidered: 1,
      lookaheadWindow: 1,
    });
  }
  return decisions;
}
