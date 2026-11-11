/**
 * reasons.ts — why this fingering and not the other one (Plan SV-23/SV-24).
 *
 * The drum engine taught the same lesson: a machine that picks well
 * and cannot say why is one nobody trusts. Every note carries the
 * codes that explain it and a confidence, and both come from the same
 * place -- the comparison between what was chosen and the best thing
 * that was not.
 */
import type { HandConfig, NoteEvent, Placement } from '../core/types.js';
import type { SolveStage } from './stages.js';

/** [SV-23] 0..1: how much better the winner was than the runner-up. */
export function confidenceFrom(margin: number, scale: number): number {
  if (!Number.isFinite(margin)) return 1;
  if (margin <= 0) return 0;
  return 1 - Math.exp(-margin / Math.max(1e-6, scale));
}

export interface ReasonInput {
  readonly placement: Placement;
  readonly note: NoteEvent;
  readonly state: HandConfig;
  readonly previous: HandConfig | undefined;
  readonly runnerUp: HandConfig | undefined;
  readonly stage: SolveStage;
  readonly relaxed: boolean;
  readonly rushed: boolean;
}

/**
 * [SV-24] Up to three codes, strongest first.
 *
 * What the file decided comes first, because it is not a choice at
 * all; then what the hand did; then the one feature where the chosen
 * shape beat the runner-up by the most.
 */
export function reasonsFor(input: ReasonInput): readonly string[] {
  const { placement, note, state, previous, stage } = input;
  const reasons: string[] = [];

  if (note.lockedString !== undefined && note.lockedFret !== undefined) reasons.push('TAB_LOCKED');
  if (note.lockedFinger !== undefined) reasons.push('FINGER_LOCKED');
  if (placement.finger === null) reasons.push('OPEN_STRING');

  for (const link of note.techniqueLinks ?? []) {
    if (link.fromNoteId === undefined) continue;
    reasons.push(link.type === 'slide' ? 'SLIDE_SAME_FINGER' : 'LEGATO_SAME_STRING');
  }

  if (previous !== undefined) {
    const moved = Math.abs(state.handPos - previous.handPos) > 0.5;
    if (!moved) reasons.push('STAY_IN_POSITION');
    else if (input.rushed) reasons.push('SHIFT_RUSHED');
    else reasons.push(stage.freeTime >= 0.2 ? 'SHIFT_WITH_TIME' : 'SHIFT_RUSHED');
    if (
      moved &&
      previous.placements.some(
        (before) =>
          before.finger !== null &&
          state.placements.some(
            (after) => after.finger === before.finger && after.string === before.string,
          ),
      )
    ) {
      reasons.push('GUIDE_FINGER');
    }
  }

  const advantage = biggestAdvantage(state, input.runnerUp);
  if (advantage !== undefined) reasons.push(advantage);
  if (input.relaxed) reasons.push('FALLBACK_RELAXED');

  return [...new Set(reasons)].slice(0, 3);
}

/** The one feature where the chosen shape is most clearly the easier one. */
function biggestAdvantage(state: HandConfig, runnerUp: HandConfig | undefined): string | undefined {
  if (runnerUp === undefined) return undefined;
  const codes: Readonly<Record<string, string>> = {
    span: 'AVOID_STRETCH',
    fingerDifficulty: 'AVOID_PINKY',
    crossing: 'AVOID_STRETCH',
    highFret: 'STAY_IN_POSITION',
  };
  let best: { code: string; gain: number } | undefined;
  for (const [feature, code] of Object.entries(codes)) {
    const mine = state.features[feature] ?? 0;
    const theirs = runnerUp.features[feature] ?? 0;
    const gain = theirs - mine;
    if (gain > 1e-6 && (best === undefined || gain > best.gain)) best = { code, gain };
  }
  const openGain = (state.features['openStrings'] ?? 0) - (runnerUp.features['openStrings'] ?? 0);
  if (openGain > 0 && (best === undefined || openGain > best.gain)) return 'OPEN_STRING';
  return best?.code;
}
