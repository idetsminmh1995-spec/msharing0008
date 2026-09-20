/**
 * rule07-hand-candidates.ts — RULE 7: HAND CANDIDATE GENERATION
 *
 * "Hand preference is a bias, not a hard rule; future targets must
 * influence candidate quality."
 *
 * Hard physical impossibilities are rejected outright (Rule 6
 * reachable=false); soft preferences are scored; multiple valid
 * alternatives stay alive for Rule 8/29's sequence solver.
 */

import type { DrumEvent, DrummerState, Limb, StickingCandidate } from './datamodel.js';
import { checkReachability } from './rule06-reachability.js';

export const MANUAL_LIMBS: readonly Limb[] = ['RH', 'LH'];

export function generateHandCandidates(
  event: DrumEvent,
  state: DrummerState,
  availableTimeByLimb: Partial<Record<Limb, number>>,
): StickingCandidate[] {
  const style = state.style;
  const candidates: StickingCandidate[] = [];

  for (const limb of MANUAL_LIMBS) {
    const limbState = state.limbs[limb];
    const avail = availableTimeByLimb[limb] ?? 999.0;
    const reach = checkReachability(limb, limbState, event.target, avail, event.eventId);

    if (!reach.reachable) {
      // Hard physical impossibility -> rejected, not scored (Rule 6).
      candidates.push({
        eventId: event.eventId,
        limb,
        score: -Infinity,
        reachable: false,
        crossesBody: reach.crossesBody,
        sourceRule: 'rule07',
        tags: ['unreachable'],
      });
      continue;
    }

    let score = 0.0;
    const tags: string[] = [];

    // Dominance bias (Rule 22 style profile).
    const dominantLimb: Limb = style.dominantHand === 'R' ? 'RH' : 'LH';
    if (limb === dominantLimb) {
      score += style.dominanceBias;
      tags.push('dominant');
    }

    // Alternation preference: prefer the hand that did NOT play last.
    const recent = state.memory.recentLimbSequence;
    const lastLimb = recent.length > 0 ? recent[recent.length - 1] : undefined;
    if (lastLimb !== undefined) {
      if (limb !== lastLimb) {
        score += 0.25 * style.alternationPreference;
      } else {
        score -= 0.25 * style.alternationPreference;
        tags.push('repeat_hand');
      }
    }

    // Crossing aversion, proportional to the profile setting.
    if (reach.crossesBody) {
      score -= style.crossingAversion * 0.4;
      tags.push('crossing');
    }

    // Economy of motion: prefer targets close to where the hand already is.
    score -= 0.05 * reach.distanceM;

    // Prefer a generous timing margin -- it keeps future options open.
    score += Math.min(0.15, reach.safetyMarginS * 0.5);

    candidates.push({
      eventId: event.eventId,
      limb,
      score,
      reachable: true,
      crossesBody: reach.crossesBody,
      sourceRule: 'rule07',
      tags,
    });
  }

  return candidates;
}
