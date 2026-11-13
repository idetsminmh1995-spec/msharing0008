/**
 * rule34-grammar.ts — RULE 34: ADVANCED STICKING GRAMMAR, TECHNIQUE
 * LIBRARY & HAND-PATTERN GENERATOR
 *
 * "Generate != Select": this module creates the technical vocabulary;
 * Rule 8/29's solver is what picks. It MUST NOT commit anything.
 */

import type { Limb, StickingPatternCandidate } from './datamodel.js';

const R: Limb = 'RH';
const L: Limb = 'LH';

/** Named rudiments as an R/L template, tileable over any run of N manual events. */
export const RUDIMENT_LIBRARY: Readonly<Record<string, readonly Limb[]>> = {
  singles_RL: [R, L],
  singles_LR: [L, R],
  doubles_RRLL: [R, R, L, L],
  paradiddle_RLRR_LRLL: [R, L, R, R, L, R, L, L],
  double_paradiddle: [R, L, R, L, R, R, L, R, L, R, L, L],
  triple_paradiddle: [R, L, R, L, R, L, R, R, L, R, L, R, L, R, L, L],
  paradiddlediddle: [R, L, R, R, L, L],
  inverted_paradiddle: [R, R, L, R, L, L, R, L],
  triplets_RLL_LRR: [R, L, L, L, R, R],
};

/**
 * How ordinary a rudiment is.
 *
 * Length is the honest proxy: a two-element template (singles) is the
 * default motion of two hands, and every longer one is a deliberate
 * figure a drummer chooses for a reason. Expressed as a weight on Rule
 * 34's prior rather than a score of its own, because the library's job
 * is to offer vocabulary, not to rank it against physics.
 */
export function priorWeight(template: readonly Limb[]): number {
  return template.length > 0 ? 2.0 / template.length : 0.0;
}

/** Repeat/truncate a rudiment template to exactly `length` limb slots. */
export function tilePattern(template: readonly Limb[], length: number): Limb[] {
  if (length <= 0) return [];
  const out: Limb[] = [];
  for (let i = 0; i < length; i++) out.push(template[i % template.length] as Limb);
  return out;
}

/**
 * For a contiguous run of manual events, propose grammatically valid
 * multi-note hand-pattern candidates. The solver scores and picks among
 * these, or overrides them with plain per-note candidates from Rule 7.
 */
export function generatePatternCandidates(
  eventIds: readonly string[],
  styleHint = 'generic',
  startingLimb?: Limb,
): StickingPatternCandidate[] {
  const n = eventIds.length;
  if (n === 0) return [];

  const candidates: StickingPatternCandidate[] = [];
  for (const [name, template] of Object.entries(RUDIMENT_LIBRARY)) {
    let seq = tilePattern(template, n);
    if (startingLimb !== undefined && seq[0] !== startingLimb) {
      // A rotated variant that starts on the requested limb, since
      // continuity (Rule 8) may require matching the previous hand.
      const rotated = tilePattern([...template.slice(1), template[0] as Limb], n);
      if (rotated[0] === startingLimb) seq = rotated;
    }
    candidates.push({
      patternName: name,
      limbSequence: seq,
      eventIds: [...eventIds],
      grammarTags: [styleHint],
      priorWeight: priorWeight(template),
    });
  }
  return candidates;
}
