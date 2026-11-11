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
 *
 * All four limbs are solved in ONE pass. Solving the hands first and
 * then asking where the feet went would satisfy none of Rule 11 -- the
 * hands would be choosing without knowing a kick lands on the same beat.
 */

import type {
  DrumEvent,
  DrummerState,
  EventRoleContext,
  Limb,
  SequenceDecision,
} from './datamodel.js';
import { inOstinato, LIMBS, neutralRole, snapshotState } from './datamodel.js';
import {
  checkReachability,
  FOOT_MAX_SPEED_MPS,
  HAND_MAX_SPEED_MPS,
} from './rule06-reachability.js';
import {
  generateHandCandidates,
  isTwoHandedStream,
  MANUAL_LIMBS,
} from './rule07-hand-candidates.js';
import { generatePatternCandidates } from './rule34-grammar.js';

export const SIMULTANEITY_EPSILON_S = 0.004;
export const DEFAULT_WINDOW = 12;
export const DEFAULT_BEAM_WIDTH = 6;

// --- Rule 8 sequence weights ------------------------------------------
// These score a whole hypothesis, which is the part Rule 8 exists for. A
// plain sum of per-note scores is still isolated-note reasoning no matter
// how many notes are in it; these terms only have a value once you can
// see the sequence.
//
// Changing hands in the middle of a time-keeping stream.
export const STREAM_SWITCH_PENALTY = 0.9;
// Playing the same under-stream voice (the backbeat) with a different
// hand from the one already used for it in this window.
export const VOICE_INCONSISTENCY_PENALTY = 0.45;
// Matching a sticking this drummer has already used for the same shape.
export const MOTIF_REUSE_BONUS = 0.35;
// Asking one limb to travel between two targets in a hurry. This is the
// "future preparation" half of Rule 8's Core Process, and the reason a
// fast fill comes out as singles: giving the next note to the other hand
// doubles the time this one has to get where it is going. Rule 6 already
// rejects what is impossible; this scores what is merely rushed.
export const PREPARATION_PENALTY = 2.0;
// How much of the gap a stroke may spend travelling before it counts as
// rushed. A third leaves room to lift, drop and rebound.
export const COMFORTABLE_TRAVEL_FRACTION = 0.33;

// --- Rule 34 grammar --------------------------------------------------
// Shortest run of free single notes worth offering a rudiment for. Below
// this it is a figure inside a groove, not a fill with a shape.
export const MIN_GRAMMAR_RUN = 4;
// What a NAMED pattern is worth per note over an arbitrary one that
// scores the same, before Rule 34's own priorWeight scales it down for
// the less ordinary rudiments. A prior, so it only decides near ties.
export const GRAMMAR_PRIOR_PER_NOTE = 0.08;

/**
 * Rule 11: events close enough in time to be physically simultaneous,
 * solved jointly. Hands AND feet: a kick on the same beat as a hi-hat
 * note is part of the same instant of coordination even though no hand
 * can play it.
 */
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

function roleFor(
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
  event: DrumEvent,
): EventRoleContext {
  return roles?.get(event.eventId) ?? neutralRole(event.eventId);
}

/**
 * RULE 33: a normalized fingerprint of what this instant ASKS FOR.
 *
 * Instruments plus whether each one is keeping time -- not the hands,
 * which are the answer, and not the clock time, which never repeats.
 * Two instants with the same key are the same drumming problem, so the
 * sticking that solved one is a prior for the other.
 */
function motifKey(
  group: readonly DrumEvent[],
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
): string {
  return [...group]
    .sort((a, b) => (a.instrument < b.instrument ? -1 : a.instrument > b.instrument ? 1 : 0))
    .map((ev) => `${ev.instrument}${inOstinato(roleFor(roles, ev)) ? '*' : ''}`)
    .join('+');
}

/** The limb answer for a motif key, in the key's own instrument order. */
function motifValue(group: readonly DrumEvent[], assignment: Assignment): string {
  const limbOf = new Map<string, Limb>();
  for (const [ev, limb] of assignment) limbOf.set(ev.eventId, limb);
  return [...group]
    .sort((a, b) => (a.instrument < b.instrument ? -1 : a.instrument > b.instrument ? 1 : 0))
    .filter((ev) => limbOf.has(ev.eventId))
    .map((ev) => limbOf.get(ev.eventId) as Limb)
    .join(' ');
}

/**
 * The ONLY place limb state is mutated during search -- and always on a
 * cloned speculative state, never the authoritative one (see solveWindow).
 */
function applyDecision(
  state: DrummerState,
  event: DrumEvent,
  limb: Limb,
  role?: EventRoleContext,
): void {
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

  // Rule 8/30: the first note of a stream decides whose stream it is,
  // and every later note reads that back rather than re-deciding. This
  // is the state that makes a hand STAY on the hi-hat.
  if (
    role !== undefined &&
    inOstinato(role) &&
    (limb === 'RH' || limb === 'LH') &&
    !state.ostinatoLeadHand.has(role.ostinatoId)
  ) {
    state.ostinatoLeadHand.set(role.ostinatoId, limb);
  }
}

function availableTime(state: DrummerState, limb: Limb, eventTime: number): number {
  const lastT = state.limbs[limb].lastActionTimeS;
  if (lastT < -900) return 999.0; // nothing played yet on this limb
  return Math.max(0.0, eventTime - lastT);
}

type Assignment = readonly (readonly [DrumEvent, Limb, number])[];

function assignFeetIn(
  group: readonly DrumEvent[],
  state: DrummerState,
): (readonly [DrumEvent, Limb, number])[] {
  const out: (readonly [DrumEvent, Limb, number])[] = [];
  for (const ev of group) {
    if (!ev.target.isFootTarget) continue;
    const limb = ev.target.preferredLimb as Limb;
    const avail = availableTime(state, limb, ev.timeSeconds);
    const reach = checkReachability(limb, state.limbs[limb], ev.target, avail, ev.eventId);
    out.push([ev, limb, reach.reachable ? 0.0 : -5.0]);
  }
  return out;
}

/**
 * Rule 11: for a simultaneous group, the joint (assignment, score)
 * options across ALL FOUR LIMBS, ensuring no limb is asked to play two
 * targets at once.
 *
 * Feet are not scored against hands: a kick target declares its own
 * preferred limb (Rule 2 kit geometry) and no hand can reach it, so the
 * feet contribute a fixed part of every option rather than multiplying
 * the search. What matters for Rule 11 is that they are in the SAME
 * option, so the hand choice is made with the whole instant in view.
 */
function solveGroupCandidates(
  wholeGroup: readonly DrumEvent[],
  state: DrummerState,
  roles?: ReadonlyMap<string, EventRoleContext>,
): (readonly [Assignment, number])[] {
  const footPart = assignFeetIn(wholeGroup, state);
  let footScore = 0.0;
  for (const [, , sc] of footPart) footScore += sc;
  const group = wholeGroup.filter((ev) => !ev.target.isFootTarget);

  const finish = (
    options: (readonly [Assignment, number])[],
  ): (readonly [Assignment, number])[] => {
    if (footPart.length === 0) return options;
    return options.map(
      ([assignment, score]) => [[...assignment, ...footPart], score + footScore] as const,
    );
  };

  if (group.length === 0) return finish([[[], 0.0]]);

  if (group.length === 1) {
    const ev = group[0] as DrumEvent;
    const avail: Partial<Record<Limb, number>> = {};
    for (const l of MANUAL_LIMBS) avail[l] = availableTime(state, l, ev.timeSeconds);
    const cands = generateHandCandidates(ev, state, avail, roleFor(roles, ev));
    const options: (readonly [Assignment, number])[] = [];
    for (const c of cands) {
      if (c.reachable) options.push([[[ev, c.limb, c.score]], c.score]);
    }
    if (options.length === 0) {
      // No reachable hand at all: a best-effort fallback so the pipeline
      // never crashes. Rule 25 flags this as an error.
      let best = cands[0] as (typeof cands)[number];
      for (const c of cands) if (c.score > best.score) best = c;
      return finish([[[[ev, best.limb, best.score]], best.score]]);
    }
    return finish(options);
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
        const cands = generateHandCandidates(ev, state, { [limb]: avail }, roleFor(roles, ev));
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
      return finish([
        [
          [
            [group[0] as DrumEvent, 'RH', -5.0],
            [group[1] as DrumEvent, 'LH', -5.0],
          ],
          -10.0,
        ],
      ]);
    }
    return finish(options);
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
  return finish([[assignment, total]]);
}

/**
 * One hand-note, with no time-keeping stream running under it.
 *
 * That is what a fill is made of, and where a drummer's rudiment
 * vocabulary applies. Inside a groove the hands are already spoken for,
 * so a rudiment would be proposing something the music has no room for.
 */
function isFreeSingle(
  group: readonly DrumEvent[],
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
): boolean {
  const manual = group.filter((ev) => !ev.target.isFootTarget);
  if (manual.length !== 1) return false;
  return !roleFor(roles, manual[0] as DrumEvent).ostinatoActive;
}

/** How many consecutive groups from `start` form one free run. */
function fillRunLength(
  groups: readonly (readonly DrumEvent[])[],
  start: number,
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
): number {
  let n = 0;
  while (
    start + n < groups.length &&
    isFreeSingle(groups[start + n] as readonly DrumEvent[], roles)
  ) {
    n++;
  }
  return n;
}

/**
 * This limb's Rule 7 score for this event, or undefined if Rule 6 says
 * it cannot be done. Undefined is a hard rejection, never a bad score.
 */
function scoreLimbFor(
  event: DrumEvent,
  limb: Limb,
  state: DrummerState,
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
): number | undefined {
  const avail = availableTime(state, limb, event.timeSeconds);
  const cands = generateHandCandidates(event, state, { [limb]: avail }, roleFor(roles, event));
  const cand = cands.find((c) => c.limb === limb);
  if (cand === undefined || !cand.reachable) return undefined;
  return cand.score;
}

/**
 * RULE 34, finally connected: the technique library proposes whole
 * hand-patterns for a fill, and the solver picks among them.
 *
 * "Generate != Select". This function only generates -- every option it
 * returns, rudiment or not, is scored by the same Rule 7/8 machinery as
 * everything else, and a rudiment that does not fit loses. A template
 * any of whose notes Rule 6 rejects is dropped outright rather than
 * scored badly, because Rule 34 may not force a physically invalid
 * pattern.
 *
 * The last option is always the free one -- the per-note best, owing
 * nothing to the library -- so the vocabulary can never trap the solver
 * into a shape when plain singles are simply better.
 */
function grammarOptions(
  run: readonly (readonly DrumEvent[])[],
  state: DrummerState,
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
): (readonly [Assignment, number])[] {
  const manual: DrumEvent[] = [];
  for (const group of run) {
    for (const ev of group) if (!ev.target.isFootTarget) manual.push(ev);
  }
  const eventIds = manual.map((ev) => ev.eventId);
  const options: (readonly [Assignment, number])[] = [];

  /**
   * Replay one hypothesis on a speculative state (Rule 39) so each note
   * is scored in the state its predecessors actually left.
   */
  const walk = (
    limbFor: (index: number, event: DrumEvent, state: DrummerState) => Limb | undefined,
  ): readonly [Assignment, number] | undefined => {
    const st = snapshotState(state);
    const assignment: (readonly [DrumEvent, Limb, number])[] = [];
    let total = 0.0;
    let index = 0;
    for (const group of run) {
      for (const [ev, limb, sc] of assignFeetIn(group, st)) {
        assignment.push([ev, limb, sc]);
        total += sc;
        applyDecision(st, ev, limb, roleFor(roles, ev));
      }
      for (const ev of group) {
        if (ev.target.isFootTarget) continue;
        const limb = limbFor(index, ev, st);
        if (limb === undefined) return undefined;
        const score = scoreLimbFor(ev, limb, st, roles);
        if (score === undefined) return undefined;
        assignment.push([ev, limb, score]);
        total += score;
        applyDecision(st, ev, limb, roleFor(roles, ev));
        index++;
      }
    }
    return [assignment, total] as const;
  };

  for (const pattern of generatePatternCandidates(eventIds)) {
    const walked = walk((i) => pattern.limbSequence[i]);
    if (walked === undefined) continue; // Rule 6 said no; the library does not argue
    const [assignment, total] = walked;
    options.push([
      assignment,
      total + GRAMMAR_PRIOR_PER_NOTE * eventIds.length * pattern.priorWeight,
    ]);
  }

  const bestFree = (_i: number, ev: DrumEvent, st: DrummerState): Limb | undefined => {
    const avail: Partial<Record<Limb, number>> = {};
    for (const l of MANUAL_LIMBS) avail[l] = availableTime(st, l, ev.timeSeconds);
    const cands = generateHandCandidates(ev, st, avail, roleFor(roles, ev)).filter(
      (c) => c.reachable,
    );
    if (cands.length === 0) return undefined;
    let best = cands[0] as (typeof cands)[number];
    for (const c of cands) {
      if (c.score > best.score || (c.score === best.score && c.limb < best.limb)) best = c;
    }
    return best.limb;
  };

  const free = walk(bestFree);
  if (free !== undefined) options.push(free);
  return options;
}

/**
 * RULE 8: score the hypothesis AS A SEQUENCE.
 *
 * Everything here is invisible to per-note scoring by construction --
 * each term needs two or more decisions to have a value at all. That is
 * what "sequence quality outranks isolated note quality" has to mean in
 * code; a sum of per-note scores is still per-note reasoning.
 */
export function sequenceScore(
  decisions: readonly SequenceDecision[],
  eventsById: ReadonlyMap<string, DrumEvent>,
  roles: ReadonlyMap<string, EventRoleContext> | undefined,
  baseState: DrummerState,
): number {
  if (decisions.length === 0) return 0.0;

  const ordered = [...decisions].sort((a, b) => {
    const ea = eventsById.get(a.eventId) as DrumEvent;
    const eb = eventsById.get(b.eventId) as DrumEvent;
    if (ea.timeSeconds !== eb.timeSeconds) return ea.timeSeconds - eb.timeSeconds;
    return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
  });
  let score = 0.0;

  // --- continuity: one hand per time-keeping stream -----------------
  const lastLimbOnStream = new Map(baseState.ostinatoLeadHand);
  for (const d of ordered) {
    const role = roleFor(roles, eventsById.get(d.eventId) as DrumEvent);
    if (!inOstinato(role) || (d.limb !== 'RH' && d.limb !== 'LH')) continue;
    if (isTwoHandedStream(role, baseState.style)) {
      // A stream both hands are sharing is SUPPOSED to change hands.
      // Charging it the continuity penalty would forbid the only way it
      // can physically be played.
      continue;
    }
    const previous = lastLimbOnStream.get(role.ostinatoId);
    if (previous !== undefined && previous !== d.limb) score -= STREAM_SWITCH_PENALTY;
    lastLimbOnStream.set(role.ostinatoId, d.limb);
  }

  // --- future preparation: do not rush one limb between targets -----
  // Invisible per note by construction: the cost of giving this note to
  // a limb is entirely about where that limb was and when.
  const lastOnLimb = new Map<Limb, { t: number; x: number; y: number }>();
  for (const limb of LIMBS) {
    const ls = baseState.limbs[limb];
    if (ls.lastActionTimeS > -900) {
      lastOnLimb.set(limb, { t: ls.lastActionTimeS, x: ls.position[0], y: ls.position[1] });
    }
  }
  for (const d of ordered) {
    const ev = eventsById.get(d.eventId) as DrumEvent;
    const previous = lastOnLimb.get(d.limb);
    if (previous !== undefined) {
      const gap = ev.timeSeconds - previous.t;
      if (gap > 0) {
        const dx = ev.target.x - previous.x;
        const dy = ev.target.y - previous.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = ev.target.isFootTarget ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
        const strain = speed > 0 ? dist / speed / gap : 0.0;
        if (strain > COMFORTABLE_TRAVEL_FRACTION) {
          score -= PREPARATION_PENALTY * (strain - COMFORTABLE_TRAVEL_FRACTION);
        }
      }
    }
    lastOnLimb.set(d.limb, { t: ev.timeSeconds, x: ev.target.x, y: ev.target.y });
  }

  // --- stability: the backbeat is the same hand every time ----------
  // Only under a running stream. Through a fill the hi-hat has stopped,
  // the hands are free, and insisting one voice keeps one hand there
  // would forbid ordinary rudiments.
  const handByVoice = new Map<string, Limb>();
  for (const d of ordered) {
    const ev = eventsById.get(d.eventId) as DrumEvent;
    const role = roleFor(roles, ev);
    if (inOstinato(role) || !role.ostinatoActive) continue;
    if (d.limb !== 'RH' && d.limb !== 'LH') continue;
    const previous = handByVoice.get(ev.instrument);
    if (previous !== undefined && previous !== d.limb) score -= VOICE_INCONSISTENCY_PENALTY;
    handByVoice.set(ev.instrument, d.limb);
  }

  return score;
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
  roles?: ReadonlyMap<string, EventRoleContext>,
): { decisions: SequenceDecision[]; state: DrummerState } {
  const eventsById = new Map<string, DrumEvent>();
  for (const group of groups) for (const ev of group) eventsById.set(ev.eventId, ev);

  let beam: { state: DrummerState; decisions: SequenceDecision[]; score: number }[] = [
    { state: snapshotState(baseState), decisions: [], score: 0.0 },
  ];

  let index = 0;
  while (index < groups.length) {
    // A run of free single notes is a FILL, and a fill has a shape.
    // Hand it to Rule 34 whole rather than deciding it note by note.
    const runLength = fillRunLength(groups, index, roles);
    const useGrammar = runLength >= MIN_GRAMMAR_RUN;
    let segment: readonly (readonly DrumEvent[])[];
    let key: string;
    if (useGrammar) {
      segment = groups.slice(index, index + runLength);
      key = 'run:' + segment.map((g) => motifKey(g, roles)).join('|');
      index += runLength;
    } else {
      segment = [groups[index] as readonly DrumEvent[]];
      key = motifKey(groups[index] as readonly DrumEvent[], roles);
      index += 1;
    }
    const segmentEvents: DrumEvent[] = [];
    for (const g of segment) segmentEvents.push(...g);

    const newBeam: typeof beam = [];
    for (const branch of beam) {
      let options = useGrammar
        ? grammarOptions(segment, branch.state, roles)
        : solveGroupCandidates(segment[0] as readonly DrumEvent[], branch.state, roles);
      if (options.length === 0) {
        options = solveGroupCandidates(segment[0] as readonly DrumEvent[], branch.state, roles);
      }
      for (const [assignment, groupScore] of options) {
        const st2 = snapshotState(branch.state);
        const newDecisions = [...branch.decisions];
        for (const [ev, limb, noteScore] of assignment) {
          applyDecision(st2, ev, limb, roleFor(roles, ev));
          newDecisions.push({
            eventId: ev.eventId,
            limb,
            sequenceCost: -noteScore,
            alternativesConsidered: options.length,
            lookaheadWindow: groups.length,
          });
        }
        // RULE 33: does this answer match what the drummer already
        // played for the same shape? A prior, never a requirement -- the
        // bonus can always be outweighed, which is how Rule 33's "keep
        // novelty as a valid alternative" stays true.
        let motifBonus = 0.0;
        const remembered = st2.motifStickings.get(key);
        const value = motifValue(segmentEvents, assignment);
        if (remembered !== undefined && remembered.join(' ') === value) {
          motifBonus = MOTIF_REUSE_BONUS;
        }
        if (!st2.motifStickings.has(key)) {
          st2.motifStickings.set(
            key,
            assignment.map(([, limb]) => limb),
          );
        }
        newBeam.push({
          state: st2,
          decisions: newDecisions,
          score: branch.score + groupScore + motifBonus,
        });
      }
    }
    // RULE 8: rank whole hypotheses, not the running per-note total.
    // Stable in both languages, so ties keep the order the branches were
    // generated in -- which is what makes the search reproducible.
    const ranked = newBeam.map((b) => ({
      branch: b,
      total: b.score + sequenceScore(b.decisions, eventsById, roles, baseState),
    }));
    ranked.sort((a, b) => -a.total - -b.total);
    beam = ranked.slice(0, beamWidth).map((r) => r.branch);
  }

  const best = beam[0] as (typeof beam)[number];
  return { decisions: best.decisions, state: best.state };
}

/**
 * RULE 29 orchestration: roll a lookahead window across the whole event
 * stream, solving and COMMITTING (Rule 39) one window at a time, so
 * state always reflects only validated, real decisions.
 *
 * Takes ALL events, hands and feet together (Rule 11).
 */
export function solveSticking(
  events: readonly DrumEvent[],
  state: DrummerState,
  windowSize: number = DEFAULT_WINDOW,
  beamWidth: number = DEFAULT_BEAM_WIDTH,
  roles?: ReadonlyMap<string, EventRoleContext>,
): SequenceDecision[] {
  if (events.length === 0) return [];

  const ordered = [...events].sort((a, b) => {
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
  });
  const groups = groupSimultaneous(ordered);
  const allDecisions: SequenceDecision[] = [];

  for (let i = 0; i < groups.length; i += windowSize) {
    const window = groups.slice(i, i + windowSize);
    const { decisions, state: resolved } = solveWindow(window, state, beamWidth, roles);
    // --- COMMIT POINT (Rule 39): only now does authoritative state change ---
    for (const limb of LIMBS) state.limbs[limb] = resolved.limbs[limb];
    state.memory = resolved.memory;
    state.ostinatoLeadHand = resolved.ostinatoLeadHand;
    state.motifStickings = resolved.motifStickings;
    allDecisions.push(...decisions);
  }

  return allDecisions;
}

/**
 * RULE 11 (feet alone).
 *
 * Kept as a public entry point for callers that genuinely have only
 * foot events to place. The engine does NOT use it -- solving the feet
 * apart from the hands is exactly what Rule 11's Core Principle
 * forbids, so `solveSticking` takes all four limbs at once.
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
