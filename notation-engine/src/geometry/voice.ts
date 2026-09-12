import type { StemDirection } from './stem.js';

/**
 * §9.14's universal, non-negotiable rule -- confirmed independently across
 * MuseScore's handbook, LilyPond's reference manual, and two general
 * notation-pedagogy sources, all stating the identical rule with no
 * disagreement: the odd-numbered voice(s) always get up stems, the
 * even-numbered voice(s) always get down stems, "upper up, lower down,
 * always" -- regardless of any individual note's own position relative to
 * the middle line. This is what Phase 16's `forcedDirection` parameter on
 * `resolveStemDirection` was built for; nothing computed it until now.
 */
export function voiceForcedDirection(voiceId: number): StemDirection {
  return voiceId % 2 === 1 ? 'up' : 'down';
}

/**
 * §9.14's rest-separation offset (fed into Phase 18's existing
 * `restY(..., voiceOffset)`): the odd (upper) voice's rests shift toward
 * the top of the staff, the even (lower) voice's shift toward the bottom,
 * so with both voices otherwise defaulting to the same shared middle line
 * (Phase 18's own default), they land a full 2 staff-spaces apart instead
 * of stacking on top of each other -- a chosen, sensible value, the same
 * kind of choice Phase 24 made for its beam-slope cap where no source gave
 * one universal exact number either.
 */
export function voiceRestOffset(voiceId: number): number {
  return voiceId % 2 === 1 ? -1 : 1;
}

const NOTEHEAD_COLLISION_THRESHOLD = 1.0;

export interface NoteheadCollisionResolution {
  readonly offsetA: number;
  readonly offsetB: number;
}

/**
 * §9.14's horizontal-collision rule: at the same tick, if two different
 * voices' notes sit within `NOTEHEAD_COLLISION_THRESHOLD` staff-spaces of
 * each other (confirmed by an independent source -- Clairnote, citing
 * LilyPond's own collision engine -- that the real threshold is notes one
 * vertical staff position apart or closer; this engine's 1.0sp is chosen
 * slightly more generous than that bare minimum so near-misses aren't left
 * looking cramped), the higher-numbered voice's notehead shifts right by
 * one notehead-width so the two never visually merge. Below the
 * threshold, neither moves. The choice of "higher voice number moves" is
 * arbitrary but consistent -- it never depends on which note happens to
 * be higher in pitch, only on voice identity, so the same two voices
 * always resolve the same way regardless of which one is on top at a
 * given moment.
 */
export function resolveNoteheadCollision(
  positionA: number,
  voiceIdA: number,
  positionB: number,
  voiceIdB: number,
  noteheadWidth: number,
): NoteheadCollisionResolution {
  const distance = Math.abs(positionA - positionB);
  if (distance >= NOTEHEAD_COLLISION_THRESHOLD) {
    return { offsetA: 0, offsetB: 0 };
  }
  if (voiceIdA < voiceIdB) {
    return { offsetA: 0, offsetB: noteheadWidth };
  }
  return { offsetA: noteheadWidth, offsetB: 0 };
}
