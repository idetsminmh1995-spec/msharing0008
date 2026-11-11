/**
 * viterbi.ts — the generic shortest-path over stages (Plan Part 06 §5).
 *
 * The fingering problem is "what is the cheapest way through time":
 * every onset offers several hand configurations, each configuration
 * costs something to hold, and moving from one to the next costs
 * something too. The cheapest path through the whole phrase is the
 * fingering a player would use.
 *
 * [D-006] This file knows nothing about guitars. It is handed stages,
 * a way to expand them and two cost functions, which is what lets the
 * guitar rules change without touching the search.
 */
import type { LatticeNode } from './beam.js';
import { mergeByKey, pruneBeam } from './beam.js';

export interface StageSolverInput<TStage, TState> {
  readonly stages: readonly TStage[];
  /**
   * [SV-11/SV-12] Every way this stage could be played, given the hand
   * that came before it. `relax` counts how many times the caller has
   * been asked to loosen its rules for this stage (SV-14).
   */
  expand(
    previous: TState | undefined,
    stage: TStage,
    index: number,
    relax: number,
  ): readonly TState[];
  /** [SV-10] What it costs to hold this configuration. */
  staticCost(state: TState, stage: TStage, index: number): number;
  /** [Ct] What it costs to get here from the previous one. Infinity discards the move. */
  transitionCost(previous: TState, next: TState, stage: TStage, index: number): number;
  /** [SV-12] Two states with the same key are the same hand. */
  key(state: TState): string;
  readonly beamWidth: number;
  /** [SV-04] true when this stage starts a new segment: no transition cost, no predecessor. */
  segmentStart?(index: number): boolean;
  /** [SV-14] how many times `expand` may be asked to relax before giving up. */
  readonly maxRelax: number;
}

export interface StageSolution<TState> {
  readonly path: readonly TState[];
  readonly totalCost: number;
  /**
   * [SV-23] How much better the chosen state was than the best
   * alternative at that stage, in cost units. Infinity = there was no
   * alternative at all.
   */
  readonly margins: readonly number[];
  /** [SV-24] the state that came second at each stage, for explaining the choice. */
  readonly runnersUp: readonly (TState | undefined)[];
  /** [SV-14] the stages where `expand` had to be relaxed, and by how much. */
  readonly relaxedStages: ReadonlyMap<number, number>;
  /** How wide the search actually got, for the debug report. */
  readonly stageNodeCounts: readonly number[];
}

/**
 * [SV-20..23] Forward beam search, then a backward sweep for margins.
 *
 * The backward sweep runs over the lattice that SURVIVED the beam, as
 * the plan asks: for every kept node it works out the cheapest cost of
 * the rest of the phrase, so the margin at a stage compares two real
 * futures rather than two guesses.
 */
export function solveStages<TStage, TState>(
  input: StageSolverInput<TStage, TState>,
): StageSolution<TState> {
  const { stages, beamWidth, maxRelax } = input;
  const levels: LatticeNode<TState>[][] = [];
  const relaxedStages = new Map<number, number>();

  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index] as TStage;
    const previousLevel = levels[index - 1];
    const isSegmentStart =
      index === 0 || previousLevel === undefined || (input.segmentStart?.(index) ?? false);

    let produced: LatticeNode<TState>[] = [];
    for (let relax = 0; relax <= maxRelax && produced.length === 0; relax++) {
      produced = expandLevel(
        input,
        stage,
        index,
        isSegmentStart ? undefined : previousLevel,
        relax,
      );
      if (produced.length > 0 && relax > 0) relaxedStages.set(index, relax);
    }

    if (produced.length === 0) {
      // Nothing survived even fully relaxed. The stage is dropped
      // rather than throwing: a video missing one dot is better than
      // no video, and the caller reports it as a warning.
      levels.push([]);
      continue;
    }
    levels.push(pruneBeam(mergeByKey(produced), beamWidth));
  }

  return traceBack(levels, relaxedStages);
}

function expandLevel<TStage, TState>(
  input: StageSolverInput<TStage, TState>,
  stage: TStage,
  index: number,
  previousLevel: LatticeNode<TState>[] | undefined,
  relax: number,
): LatticeNode<TState>[] {
  const produced: LatticeNode<TState>[] = [];

  if (previousLevel === undefined || previousLevel.length === 0) {
    for (const state of input.expand(undefined, stage, index, relax)) {
      const cost = input.staticCost(state, stage, index);
      if (!Number.isFinite(cost)) continue;
      produced.push({ state, key: input.key(state), cost, parent: -1, edgeCost: 0, backward: 0 });
    }
    return produced;
  }

  for (let p = 0; p < previousLevel.length; p++) {
    const previous = previousLevel[p] as LatticeNode<TState>;
    for (const state of input.expand(previous.state, stage, index, relax)) {
      const move = input.transitionCost(previous.state, state, stage, index);
      if (!Number.isFinite(move)) continue;
      const hold = input.staticCost(state, stage, index);
      if (!Number.isFinite(hold)) continue;
      produced.push({
        state,
        key: input.key(state),
        cost: previous.cost + move + hold,
        parent: p,
        edgeCost: move + hold,
        backward: 0,
      });
    }
  }
  return produced;
}

/**
 * [SV-21/SV-22] The cheapest path, and how close the next best was.
 *
 * The path itself is the ordinary Viterbi trace-back: find the
 * cheapest node in the last stage and follow the parent pointers
 * home. That is exact -- the merge (SV-12) already guarantees each
 * node keeps its cheapest way in, so the cheapest way to the end is
 * the cheapest last node's own history.
 *
 * The margins need the other direction as well. `backward` is the
 * cheapest cost from a node to the end of the phrase, filled in from
 * the end over the edges the beam kept, so at every stage the chosen
 * state can be compared with the best REAL alternative -- one with a
 * future, not just a cheap present. A node whose continuations were
 * all pruned leads nowhere and is not counted as an alternative.
 */
function traceBack<TState>(
  levels: LatticeNode<TState>[][],
  relaxedStages: Map<number, number>,
): StageSolution<TState> {
  const last = levels.length - 1;
  const stageNodeCounts = levels.map((level) => level.length);

  for (let index = last; index >= 0; index--) {
    const level = levels[index] as LatticeNode<TState>[];
    for (const node of level) node.backward = index === last ? 0 : Infinity;
    const next = levels[index + 1];
    if (next === undefined) continue;
    for (const child of next) {
      if (child.parent < 0) continue;
      const parent = level[child.parent];
      if (parent === undefined || !Number.isFinite(child.backward)) continue;
      const through = child.edgeCost + child.backward;
      if (through < parent.backward) parent.backward = through;
    }
  }

  // Trace the path back from the cheapest final node.
  const chosen: (LatticeNode<TState> | undefined)[] = new Array<LatticeNode<TState> | undefined>(
    levels.length,
  ).fill(undefined);
  let cursor = cheapest(levels[last] ?? []);
  const totalCost = cursor?.cost ?? 0;
  for (let index = last; index >= 0 && cursor !== undefined; index--) {
    chosen[index] = cursor;
    const parentLevel = levels[index - 1];
    cursor =
      cursor.parent >= 0 && parentLevel !== undefined ? parentLevel[cursor.parent] : undefined;
  }

  const path: TState[] = [];
  const margins: number[] = [];
  const runnersUp: (TState | undefined)[] = [];

  for (let index = 0; index < levels.length; index++) {
    const level = levels[index] as LatticeNode<TState>[];
    const best = chosen[index] ?? cheapest(level);
    if (best === undefined) {
      margins.push(Infinity);
      runnersUp.push(undefined);
      continue;
    }
    path.push(best.state);

    let runnerUp: LatticeNode<TState> | undefined;
    for (const node of level) {
      if (node === best || !Number.isFinite(node.backward)) continue;
      const through = node.cost + node.backward;
      if (runnerUp === undefined || through < runnerUp.cost + runnerUp.backward) runnerUp = node;
    }
    runnersUp.push(runnerUp?.state);
    margins.push(
      runnerUp === undefined
        ? Infinity
        : runnerUp.cost + runnerUp.backward - (best.cost + best.backward),
    );
  }

  return { path, totalCost, margins, runnersUp, relaxedStages, stageNodeCounts };
}

function cheapest<TState>(level: readonly LatticeNode<TState>[]): LatticeNode<TState> | undefined {
  let best: LatticeNode<TState> | undefined;
  for (const node of level) {
    // The key breaks ties, so the same input always produces the same
    // answer -- two fingerings of identical cost must not swap between
    // runs (README rule 4).
    if (
      best === undefined ||
      node.cost < best.cost ||
      (node.cost === best.cost && node.key < best.key)
    ) {
      best = node;
    }
  }
  return best;
}
