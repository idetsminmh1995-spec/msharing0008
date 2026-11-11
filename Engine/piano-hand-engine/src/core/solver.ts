/**
 * solver.ts — the cheapest way through time.
 *
 * Fingering is not a per-note decision. The finger that plays this note
 * is the one that leaves the hand able to play the next four, and a
 * solver that answers one note at a time cannot know that: it is the
 * reason an automatic fingering puts the thumb somewhere a player never
 * would and then has to leap. So the whole phrase is searched at once --
 * every stage offers several ways to play it, holding each costs
 * something, moving between two costs something, and the cheapest path
 * through the lot is the fingering.
 *
 * This is a Viterbi with a beam. Nothing in it knows about pianos: it is
 * handed stages, a way to expand each one, and two cost functions. The
 * piano's own rules live in `fingering/`, which is what lets them be
 * changed without touching the search.
 *
 * The four hooks are declared as PROPERTIES holding functions rather
 * than as methods, which is what they are: the solver pulls them off
 * the object and calls them on their own, and a method signature would
 * be promising a `this` that never arrives.
 */

export interface LatticeNode<TState> {
  readonly state: TState;
  readonly cost: number;
  /** Which stage this node plays. Not always the node's depth: a stage nothing could play is skipped. */
  readonly stageIndex: number;
  readonly previous: LatticeNode<TState> | undefined;
}

export interface StageSolverInput<TStage, TState> {
  readonly stages: readonly TStage[];
  /**
   * Every way this stage could be played, given what came before.
   *
   * `relax` counts how many times the solver has had to ask again
   * because nothing came back. A stage that cannot be played the strict
   * way has to be playable somehow -- refusing to finger a bar because
   * a rule says it is a stretch leaves the hand with nothing to do.
   */
  readonly expand: (
    previous: TState | undefined,
    stage: TStage,
    index: number,
    relax: number,
  ) => readonly TState[];
  /** What it costs to hold this configuration at all. */
  readonly stateCost: (state: TState, stage: TStage, index: number) => number;
  /** What it costs to get here from there -- the travel, the crossing, the shift. */
  readonly transitionCost: (from: TState, to: TState, fromStage: TStage, toStage: TStage) => number;
  /**
   * Two states with the same key are the same hand, so only the cheaper
   * survives. This is what keeps the lattice from doubling at every
   * stage of a long piece.
   */
  readonly stateKey: (state: TState) => string;
  /** How many states to carry forward. */
  readonly beamWidth?: number;
  /** How many times to ask `expand` again before giving up on a stage. */
  readonly maxRelax?: number;
}

export interface StageSolverResult<TState> {
  /**
   * One entry per stage, in the stages' own order and the same length.
   *
   * `undefined` where nothing could play that stage -- which is why it
   * is not simply a list. A list would renumber everything after the
   * hole, and the caller would hand the wrong answer to the wrong note.
   */
  readonly path: readonly (TState | undefined)[];
  readonly totalCost: number;
  /** Stages that needed the rules relaxed, by index -- a report, not a failure. */
  readonly relaxedStages: readonly number[];
  /** Stages nothing could play, even relaxed. */
  readonly skippedStages: readonly number[];
  /** True when any stage was skipped. */
  readonly incomplete: boolean;
}

const DEFAULT_BEAM_WIDTH = 64;
const DEFAULT_MAX_RELAX = 3;

export function solveStages<TStage, TState>(
  input: StageSolverInput<TStage, TState>,
): StageSolverResult<TState> {
  const beamWidth = input.beamWidth ?? DEFAULT_BEAM_WIDTH;
  const maxRelax = input.maxRelax ?? DEFAULT_MAX_RELAX;
  const relaxedStages: number[] = [];

  let beam: LatticeNode<TState>[] = [];
  const skippedStages: number[] = [];

  for (let index = 0; index < input.stages.length; index++) {
    const stage = input.stages[index];
    if (stage === undefined) continue;
    const previousStage = index > 0 ? input.stages[index - 1] : undefined;

    const next = new Map<string, LatticeNode<TState>>();
    let relax = 0;
    while (next.size === 0 && relax <= maxRelax) {
      if (beam.length === 0) {
        for (const state of input.expand(undefined, stage, index, relax)) {
          offer(
            next,
            {
              state,
              cost: input.stateCost(state, stage, index),
              stageIndex: index,
              previous: undefined,
            },
            input.stateKey,
          );
        }
      } else {
        for (const node of beam) {
          for (const state of input.expand(node.state, stage, index, relax)) {
            const cost =
              node.cost +
              input.stateCost(state, stage, index) +
              (previousStage === undefined
                ? 0
                : input.transitionCost(node.state, state, previousStage, stage));
            offer(next, { state, cost, stageIndex: index, previous: node }, input.stateKey);
          }
        }
      }
      if (next.size === 0) relax++;
    }

    if (next.size === 0) {
      // Nothing can play this stage, even with every rule relaxed. The
      // hand holds what it had rather than the whole phrase failing:
      // one unfingerable chord must not cost the bar around it. The
      // stage is recorded and comes back as a hole in the path.
      skippedStages.push(index);
      continue;
    }
    if (relax > 0) relaxedStages.push(index);
    beam = prune([...next.values()], beamWidth);
  }

  const best = beam.reduce<LatticeNode<TState> | undefined>(
    (lowest, node) => (lowest === undefined || node.cost < lowest.cost ? node : lowest),
    undefined,
  );
  const path: (TState | undefined)[] = new Array<TState | undefined>(input.stages.length).fill(
    undefined,
  );
  if (best === undefined) {
    return {
      path,
      totalCost: 0,
      relaxedStages,
      skippedStages: input.stages.map((_, index) => index),
      incomplete: input.stages.length > 0,
    };
  }
  for (let node: LatticeNode<TState> | undefined = best; node !== undefined; node = node.previous) {
    path[node.stageIndex] = node.state;
  }
  return {
    path,
    totalCost: best.cost,
    relaxedStages,
    skippedStages,
    incomplete: skippedStages.length > 0,
  };
}

function offer<TState>(
  into: Map<string, LatticeNode<TState>>,
  node: LatticeNode<TState>,
  stateKey: (state: TState) => string,
): void {
  // A refused shape is not a candidate. The cost model says so with an
  // infinite cost, and letting one into the beam would mean the solver
  // never asks for its rules to be relaxed -- it would carry the
  // impossible shape forward and call the stage solved.
  if (!Number.isFinite(node.cost)) return;
  const key = stateKey(node.state);
  const existing = into.get(key);
  if (existing === undefined || node.cost < existing.cost) into.set(key, node);
}

function prune<TState>(
  nodes: readonly LatticeNode<TState>[],
  width: number,
): LatticeNode<TState>[] {
  if (nodes.length <= width) return [...nodes];
  return [...nodes].sort((a, b) => a.cost - b.cost).slice(0, width);
}
