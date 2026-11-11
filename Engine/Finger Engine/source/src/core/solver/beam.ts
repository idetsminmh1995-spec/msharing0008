/**
 * beam.ts — keeping the search small (Plan SV-13).
 *
 * A guitar offers the same note in five places and four fingers for
 * each, so the number of ways to play a phrase multiplies by roughly
 * twenty at every note. Two things stop that from exploding: states
 * that end up identical are MERGED (only the cheaper path survives,
 * because nothing after this moment can tell them apart), and what is
 * left is cut to the best `beamWidth`.
 *
 * Nothing here knows about guitars: it sorts and trims nodes.
 */

/** One surviving way of having played everything up to a stage. */
export interface LatticeNode<TState> {
  readonly state: TState;
  /** What makes two states the same for merging (SV-12). */
  readonly key: string;
  /** Total cost from the start of the segment to here. */
  cost: number;
  /** Index of this node's predecessor in the previous stage, or -1. */
  parent: number;
  /** The cost of the edge that got us here, kept for the backward pass. */
  edgeCost: number;
  /** Cheapest cost of the REST of the phrase from here (SV-21). Infinity = leads nowhere. */
  backward: number;
}

/**
 * [SV-12] Merge nodes that describe the same hand, keeping the cheaper.
 *
 * The merge is what makes this a Viterbi search rather than an
 * exhaustive one: two different histories that leave the hand in
 * exactly the same configuration are interchangeable from here on, so
 * the more expensive history can be forgotten.
 */
export function mergeByKey<TState>(nodes: readonly LatticeNode<TState>[]): LatticeNode<TState>[] {
  const best = new Map<string, LatticeNode<TState>>();
  for (const node of nodes) {
    const seen = best.get(node.key);
    if (seen === undefined || node.cost < seen.cost) best.set(node.key, node);
  }
  return [...best.values()];
}

/**
 * [SV-13] Keep the best `width` nodes.
 *
 * Ties are broken by key so a run is reproducible: two nodes with the
 * same cost must not swap places between runs, or the same input
 * would produce two different videos (README rule 4).
 */
export function pruneBeam<TState>(
  nodes: readonly LatticeNode<TState>[],
  width: number,
): LatticeNode<TState>[] {
  const sorted = [...nodes].sort((a, b) => a.cost - b.cost || (a.key < b.key ? -1 : 1));
  return sorted.slice(0, Math.max(1, width));
}
