/**
 * report.ts — why the engine did what it did (Plan Part 11 §4).
 *
 * The drum engine's reason-and-confidence tag is the model: the
 * owner should be able to look at any note and see the string, the
 * fret, the finger, the codes behind them and how sure the solver
 * was -- grouped by measure, so it reads in the order the music does.
 *
 * Everything here is data. `report()` renders it as text; nothing in
 * the engine depends on the wording.
 */
import type { TimelineNote } from '../core/timeline-schema.js';
import type { HandConfig, NoteEvent } from '../core/types.js';
import type { ValidationIssue } from '../core/validate-core.js';
import type { SolveStage } from '../guitar/stages.js';

export interface DebugNote {
  readonly noteId: string;
  readonly measure: number | undefined;
  readonly time: number;
  readonly pitch: number;
  readonly string: number;
  readonly fret: number;
  readonly finger: string;
  readonly reasons: readonly string[];
  readonly confidence: number;
  /** [SV-25] the cost features of the chosen shape, and of the one that came second. */
  readonly features: Readonly<Record<string, number>>;
  readonly runnerUpFeatures: Readonly<Record<string, number>> | undefined;
  readonly runnerUp: string | undefined;
}

export interface DebugReport {
  readonly totalCost: number;
  readonly stages: number;
  readonly widestStage: number;
  readonly notes: readonly DebugNote[];
  readonly issues: readonly ValidationIssue[];
}

export interface DebugInput {
  readonly stages: readonly SolveStage[];
  readonly path: readonly HandConfig[];
  readonly runnersUp: readonly (HandConfig | undefined)[];
  readonly margins: readonly number[];
  readonly stageNodeCounts: readonly number[];
  readonly notes: readonly TimelineNote[];
  readonly noteById: ReadonlyMap<string, NoteEvent>;
  readonly issues: readonly ValidationIssue[];
  readonly totalCost: number;
}

export function buildDebugReport(input: DebugInput): DebugReport {
  const stageOf = new Map<string, number>();
  for (const [index, stage] of input.stages.entries()) {
    for (const note of stage.onsets) stageOf.set(note.noteId, index);
  }

  const notes: DebugNote[] = input.notes.map((note) => {
    const index = stageOf.get(note.noteId) ?? 0;
    const state = input.path[index];
    const runnerUp = input.runnersUp[index];
    const source = input.noteById.get(note.noteId);
    return {
      noteId: note.noteId,
      measure: source?.sourceRef.measure,
      time: note.time,
      pitch: note.pitch,
      string: note.string,
      fret: note.fret,
      finger: note.finger ?? 'open',
      reasons: note.reasons,
      confidence: note.confidence,
      features: { ...(state?.features ?? {}) },
      runnerUpFeatures: runnerUp === undefined ? undefined : { ...runnerUp.features },
      runnerUp:
        runnerUp === undefined
          ? undefined
          : runnerUp.placements
              .map(
                (placement) =>
                  `s${placement.string}f${placement.fret}:${String(placement.finger ?? 'open')}`,
              )
              .join(' '),
    };
  });

  return {
    totalCost: input.totalCost,
    stages: input.stages.length,
    widestStage: input.stageNodeCounts.reduce((widest, count) => Math.max(widest, count), 0),
    notes,
    issues: input.issues,
  };
}

/** The same report as text, grouped by measure, for a human to read. */
export function report(debug: DebugReport): string {
  const lines: string[] = [];
  lines.push(
    `${debug.notes.length} notes over ${debug.stages} stages, total cost ${debug.totalCost.toFixed(2)}, widest search ${debug.widestStage}`,
  );
  let measure: number | undefined;
  for (const note of debug.notes) {
    if (note.measure !== measure) {
      measure = note.measure;
      lines.push(`\nmeasure ${measure ?? '?'}`);
    }
    const runnerUp = note.runnerUp === undefined ? '' : `  (instead of ${note.runnerUp})`;
    lines.push(
      `  ${note.time.toFixed(3)}s  pitch ${note.pitch}  string ${note.string} fret ${note.fret} finger ${note.finger}` +
        `  ${note.reasons.join(',')}  confidence ${note.confidence.toFixed(2)}${runnerUp}`,
    );
  }
  if (debug.issues.length > 0) {
    lines.push('\nvalidator:');
    for (const issue of debug.issues) lines.push(`  ${issue.rule} ${issue.message}`);
  }
  return lines.join('\n');
}
