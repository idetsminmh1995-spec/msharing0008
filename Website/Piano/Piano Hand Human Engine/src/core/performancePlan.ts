import type {
  Finger,
  FingerSource,
  PianoPerformancePlan,
  PerformanceNote,
  SolvedPerformanceNote,
} from './types.js';
import { keyPositionsFor, type Keyboard } from '../keyboard/keyPosition.js';
import { solveFingering } from '../fingering/fingeringSolver.js';
import { splitHands } from '../fingering/handSplit.js';
import type { HandProfile } from '../kinematics/handPose.js';

export interface PerformancePlanOptions {
  readonly keyboard: Keyboard;
  readonly profile?: HandProfile;
  readonly overrides?: ReadonlyMap<string, Finger>;
}

/**
 * Resolve the Phase 1–3 serialisable performance model.
 *
 * This deliberately stops before wrist motion, IK and rendering. Every note
 * gets its source hand decision, finger decision, and exact key strike point;
 * later phases consume this plan instead of re-deciding musical ownership.
 */
export function solvePerformancePlan(
  notes: readonly PerformanceNote[],
  options: PerformancePlanOptions,
): PianoPerformancePlan {
  const handSplit = splitHands(notes, options);
  const positions = keyPositionsFor(notes, options.keyboard);
  const positionById = new Map(positions.positions.map((position) => [position.id, position]));
  const notesByHand = new Map<'left' | 'right', PerformanceNote[]>([
    ['left', []],
    ['right', []],
  ]);

  for (const note of notes) {
    const decision = handSplit.byNoteId.get(note.id);
    if (decision === undefined) continue;
    notesByHand.get(decision.hand)?.push(note);
  }

  const left = solveFingering(notesByHand.get('left') ?? [], 'left', options);
  const right = solveFingering(notesByHand.get('right') ?? [], 'right', options);
  const assignments = new Map([
    ...left.assignments.map((assignment) => [assignment.noteId, assignment] as const),
    ...right.assignments.map((assignment) => [assignment.noteId, assignment] as const),
  ]);
  const strainedTimes = new Set([...left.strainedOnsets, ...right.strainedOnsets]);
  const incomplete = left.incomplete || right.incomplete || positions.outOfRange.length > 0;
  const outOfRange = new Set(positions.outOfRange.map((note) => note.id));

  const solvedNotes: SolvedPerformanceNote[] = notes.map((note) => {
    const handDecision = handSplit.byNoteId.get(note.id);
    const assignment = assignments.get(note.id);
    const position = positionById.get(note.id);
    const fingerSource = sourceOf(note.id, note, options.overrides);
    const diagnostics = [
      ...(outOfRange.has(note.id) ? (['out-of-range'] as const) : []),
      ...(assignment === undefined ? (['unfingered'] as const) : []),
      ...(strainedTimes.has(note.timeMs) ? (['strained-fingering'] as const) : []),
    ];

    return {
      ...note,
      hand: handDecision?.hand ?? 'right',
      handReason: handDecision?.reason ?? 'inferred',
      handConfidence: handDecision?.confidence ?? 0,
      fingerConfidence: assignment === undefined ? 0 : fingerSource === 'automatic' ? 0.6 : 1,
      diagnostics,
      ...(assignment === undefined ? {} : { finger: assignment.finger, fingerSource }),
      ...(position === undefined ? {} : { keyPosition: position.strike }),
    };
  });

  return {
    version: 1,
    notes: solvedNotes,
    handCrossingsMs: handSplit.crossings,
    incomplete,
  };
}

function sourceOf(
  noteId: string,
  note: PerformanceNote,
  overrides: ReadonlyMap<string, Finger> | undefined,
): FingerSource {
  if (overrides?.has(noteId)) return 'override';
  if (note.statedFinger !== undefined) return 'stated';
  return 'automatic';
}
