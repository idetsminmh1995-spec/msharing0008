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

import type {
  DrumEvent,
  DrummerState,
  DrummerStyleProfile,
  EventRoleContext,
  Limb,
  StickingCandidate,
} from './datamodel.js';
import { inOstinato, neutralRole } from './datamodel.js';
import { checkReachability } from './rule06-reachability.js';

export const MANUAL_LIMBS: readonly Limb[] = ['RH', 'LH'];

// --- role weights -----------------------------------------------------
// All of these are BIASES. Rule 7's Core Principle is explicit that hand
// preference is never a hard rule, so none is large enough to outrank
// Rule 6's reachable=false, which is the only hard rejection.
//
// The lead-hand bonus is deliberately the largest soft term in the whole
// engine, because on a time-keeping stream it describes what a drummer
// actually does. A hi-hat pattern is ONE arm moving continuously; the
// alternation term below, left to itself, turns it into two arms taking
// turns -- which is both wrong and, once the other hand is also needed
// for the backbeat, physically ridiculous.
export const OSTINATO_LEAD_BONUS = 1.2;
// What the OTHER hand gets for covering a note that lands while a stream
// runs. Smaller than the lead bonus: the stream's hand being busy is a
// strong hint, not a law.
export const OSTINATO_OFF_HAND_BONUS = 0.6;

/**
 * Is this stream too fast for one hand to hold?
 *
 * The single consumer of style.maxSingleHandRateHz, and the line between
 * "the right hand rides the hi-hat" and "both hands share it". Shared
 * with Rule 8's sequence scoring so the two cannot disagree about which
 * kind of stream they are looking at.
 */
export function isTwoHandedStream(role: EventRoleContext, style: DrummerStyleProfile): boolean {
  return (
    inOstinato(role) &&
    style.maxSingleHandRateHz > 0 &&
    role.ostinatoRateHz > style.maxSingleHandRateHz
  );
}

/**
 * Which hand is holding this stream.
 *
 * Once a stream's first note is committed the answer is recorded in
 * state (Rule 39), and every later note reads it back -- that is what
 * makes the hand STAY. Before then the dominant hand is the prior,
 * which is why an ordinary right-handed groove ends up with the right
 * hand on the hi-hat without anyone hard-coding that.
 */
function leadHandFor(role: EventRoleContext, state: DrummerState, dominantLimb: Limb): Limb {
  return state.ostinatoLeadHand.get(role.ostinatoId) ?? dominantLimb;
}

export function generateHandCandidates(
  event: DrumEvent,
  state: DrummerState,
  availableTimeByLimb: Partial<Record<Limb, number>>,
  roleContext?: EventRoleContext,
): StickingCandidate[] {
  const style = state.style;
  const candidates: StickingCandidate[] = [];
  const role = roleContext ?? neutralRole(event.eventId);

  const dominantLimb: Limb = style.dominantHand === 'R' ? 'RH' : 'LH';

  // A stream faster than one hand can sustain is not a one-hand stream.
  const twoHandedOstinato = isTwoHandedStream(role, style);
  const holdsStream = inOstinato(role) && !twoHandedOstinato;
  // A note that is NOT part of the stream but sounds while one runs:
  // the backbeat under a hi-hat pattern.
  const underStream = role.ostinatoActive && !inOstinato(role);
  const leadLimb = role.ostinatoActive ? leadHandFor(role, state, dominantLimb) : undefined;
  // Alternation is a statement about ONE musical line. It belongs to
  // fills, and to a stream so fast that both hands have to share it --
  // and nowhere else. Applied to a one-hand stream it flips the hand
  // every note; applied between a hi-hat and a snare it compares two
  // voices that have nothing to do with each other.
  const alternationApplies = !holdsStream && !underStream;

  for (const limb of MANUAL_LIMBS) {
    const limbState = state.limbs[limb];
    const avail = availableTimeByLimb[limb] ?? 999.0;
    const reach = checkReachability(
      limb,
      limbState,
      event.target,
      avail,
      event.eventId,
      style.maxSingleHandRateHz,
    );

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
    if (limb === dominantLimb) {
      score += style.dominanceBias;
      tags.push('dominant');
    }

    // --- Rule 5 role (the musical job this note is doing) ------------
    if (holdsStream) {
      // Keeping time. One hand owns the stream and does not hand it
      // back note by note.
      if (limb === leadLimb) {
        score += OSTINATO_LEAD_BONUS;
        tags.push('ostinato_lead');
      } else {
        tags.push('ostinato_off_lead');
      }
    } else if (underStream) {
      // A backbeat, kick-accent or accent landing underneath a running
      // stream: the stream's hand is already committed, so this note
      // belongs to the other one.
      if (limb !== leadLimb) {
        score += OSTINATO_OFF_HAND_BONUS;
        tags.push('under_ostinato');
      }
    } else if (twoHandedOstinato) {
      tags.push('ostinato_two_handed');
    }

    // Alternation preference: prefer the hand that did NOT play last.
    // See `alternationApplies`: skipped on a one-hand stream and on the
    // notes underneath it, kept for fills and for a stream fast enough
    // that both hands must share it -- which is the one place a hi-hat
    // SHOULD alternate.
    const recent = state.memory.recentLimbSequence;
    const lastLimb = recent.length > 0 ? recent[recent.length - 1] : undefined;
    if (lastLimb !== undefined && alternationApplies) {
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
