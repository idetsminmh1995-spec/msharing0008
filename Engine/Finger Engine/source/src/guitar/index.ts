/**
 * index.ts — `analyzeGuitar`: the whole pipeline, once (Plan Part 01 §1).
 *
 * A part goes in, a `FingerTimeline` comes out. Everything between is
 * the plan's numbered boxes in order -- normalize, stage, solve, right
 * hand, motion, validate, serialize -- and each one is a pure
 * function of what came before it, so a failure can be traced to the
 * box that produced it.
 */
import type { DeepPartial, EngineConfig } from '../defaults.js';
import { DEFAULTS, configHash, mergeConfig } from '../defaults.js';
import type { EngineWarning, FingerTimeline, TimelineNote } from '../core/timeline-schema.js';
import {
  ENGINE_NAME,
  ENGINE_VERSION,
  TIMELINE_SCHEMA,
  TIMELINE_SCHEMA_VERSION,
  fingerKey,
  techniqueNames,
} from '../core/timeline-schema.js';
import type { InstrumentSpec, NoteEvent, ParsedPart } from '../core/types.js';
import { makeRng } from '../core/rng.js';
import { solveStages } from '../core/solver/viterbi.js';
import { validateCore } from '../core/validate-core.js';
import { normalizePart } from '../input/normalize.js';
import type { GuitarState, VariantCache } from './candidates.js';
import { expandStage } from './candidates.js';
import type { CostContext } from './left-hand-cost.js';
import { pitchesReturningSoon, transitionCost } from './left-hand-cost.js';
import { planMotion } from './motion/planner.js';
import { confidenceFrom, reasonsFor } from './reasons.js';
import { pickEvents, resolveMode } from './right-hand/pick.js';
import { buildStages, type SolveStage } from './stages.js';
import { validateGuitar } from './validate-guitar.js';
import { buildDebugReport } from '../debug/report.js';

export interface AnalyzeOptions {
  /** Tuning, capo, frets, scale length: whatever the file or the UI knows. */
  readonly instrument?: Partial<InstrumentSpec>;
  readonly config?: DeepPartial<EngineConfig>;
  readonly presetId?: string;
  /** [MP-20] the same seed gives the same video, down to the jitter. */
  readonly seed?: number;
}

/** The instrument the analysis will use: defaults, then the file, then the caller. */
export function resolveInstrument(
  part: ParsedPart,
  config: EngineConfig,
  override: Partial<InstrumentSpec> | undefined,
): InstrumentSpec {
  const base = config.instrument;
  const tuning = [...(override?.tuning ?? part.instrumentHint.tuning ?? base.tuning)];
  return {
    kind: 'guitar',
    numStrings: override?.numStrings ?? part.instrumentHint.numStrings ?? tuning.length,
    tuning,
    capo: override?.capo ?? part.instrumentHint.capo ?? base.capo,
    numFrets: override?.numFrets ?? part.instrumentHint.numFrets ?? base.numFrets,
    scaleLengthMm: override?.scaleLengthMm ?? base.scaleLengthMm,
    nutSpacingMm: override?.nutSpacingMm ?? base.nutSpacingMm,
    bridgeSpacingMm: override?.bridgeSpacingMm ?? base.bridgeSpacingMm,
  };
}

export function analyzeGuitar(part: ParsedPart, options: AnalyzeOptions = {}): FingerTimeline {
  const config = mergeConfig(DEFAULTS, options.config);
  const instrument = resolveInstrument(part, config, options.instrument);
  const geometry = { fingertipBehindFret: config.geometry.fingertipBehindFret };
  const seed = options.seed ?? 1;
  const rng = makeRng(seed);
  const warnings: EngineWarning[] = [];

  // [2] Normalize: seconds, order, range.
  const normalized = normalizePart(part, instrument, {
    graceDurationSec: config.input.graceDurationSec,
    outOfRange: config.input.outOfRange,
  });
  warnings.push(...normalized.warnings);
  const noteById = new Map(normalized.notes.map((note) => [note.noteId, note]));

  // [3] Stages.
  const openPitches = new Set(instrument.tuning);
  const stages = buildStages(
    normalized.notes,
    {
      onsetToleranceSec: config.solver.onsetToleranceSec,
      segmentGapSec: config.solver.segmentGapSec,
    },
    (pitch) => openPitches.has(pitch),
  );

  // One cache for the whole analysis: a stage's own playable shapes
  // are worked out once, however many hands arrive at it (SV-11).
  const variantCache: VariantCache = new Map();
  const costContext: CostContext = {
    instrument,
    geometry,
    leftHand: config.leftHand,
    solver: config.solver,
    weights: config.weights,
    pitchReturnsSoon: pitchesReturningSoon(normalized.notes, config.leftHand.persistWindowSec),
    noteById,
  };

  // [4]/[5] Candidates and the left-hand solver.
  const solution = solveStages<SolveStage, GuitarState>({
    stages,
    expand: (previous, stage, _index, relax) =>
      expandStage(previous, stage, { ...costContext, variantCache }, relax),
    staticCost: (state) => state.staticCost,
    transitionCost: (previous, next, stage) =>
      transitionCost(
        {
          previous: previous.placements,
          previousHandPos: previous.handPos,
          next: next.placements,
          nextHandPos: next.handPos,
          stage,
        },
        costContext,
      ),
    key: (state) => state.key,
    beamWidth: config.solver.beamWidth,
    segmentStart: (index) => stages[index]?.segmentStart ?? false,
    maxRelax: 5,
  });

  for (const [index, level] of solution.relaxedStages) {
    const stage = stages[index];
    const locked = stage?.onsets.some((note) => note.lockedFret !== undefined) ?? false;
    warnings.push({
      code: level >= 4 ? 'UNPLAYABLE_CHORD' : locked ? 'TAB_INFEASIBLE' : 'STRETCH_RELAXED',
      ...(stage === undefined ? {} : { time: stage.time }),
      noteIds: stage?.onsets.map((note) => note.noteId) ?? [],
      message:
        level >= 4
          ? 'a note had to be dropped: the rest of the chord could not be held with it'
          : locked
            ? 'the written tab needs a stretch past this hand’s limits; it was kept as written'
            : 'the span limits were loosened to find a way to play this',
    });
  }

  const relaxedNoteIds = new Set<string>();
  const tabInfeasibleNoteIds = new Set<string>();
  for (const [index, level] of solution.relaxedStages) {
    const stage = stages[index];
    const locked = stage?.onsets.some((note) => note.lockedFret !== undefined) ?? false;
    for (const note of stage?.onsets ?? []) {
      relaxedNoteIds.add(note.noteId);
      if (locked && level >= 3) tabInfeasibleNoteIds.add(note.noteId);
    }
  }

  // [7] Motion: keyframes for every finger.
  const motion = planMotion({
    stages,
    path: solution.path,
    instrument,
    geometry,
    motion: config.motion,
    humanize: config.humanize,
    noteById,
    rng,
  });
  const rushedNotes = new Set(motion.rushed.map((entry) => entry.noteId));
  if (motion.rushed.length > 0) {
    warnings.push({
      code: 'SHIFT_RUSHED',
      noteIds: [...rushedNotes],
      message: `${motion.rushed.length} shift(s) had less time than the move needs`,
    });
  }

  // [6] Right hand: which way the pick is going.
  const mode = resolveMode(config.rightHand.mode);
  if (mode.warning !== undefined) {
    warnings.push({ code: 'RIGHT_HAND_FALLBACK', message: mode.warning });
  }
  const events = pickEvents(
    stages.map((stage, index) => ({
      time: stage.time,
      tick: stage.onsets[0]?.tick ?? 0,
      notes: stage.onsets,
      placements: solution.path[index]?.placements ?? [],
    })),
    part.timeSignatures,
  );

  // [9] The timeline itself.
  const notes = buildTimelineNotes(
    stages,
    solution,
    relaxedNoteIds,
    rushedNotes,
    config.solver.confidenceScale,
  );
  const duration = notes.reduce((end, note) => Math.max(end, note.time + note.duration), 0);

  const timeline: FingerTimeline = {
    schema: TIMELINE_SCHEMA,
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    engine: {
      name: ENGINE_NAME,
      version: ENGINE_VERSION,
      presetId: options.presetId ?? 'default',
      seed,
      configHash: configHash(config),
    },
    instrument: {
      kind: 'guitar',
      numStrings: instrument.numStrings,
      stringOrder: 'lowToHigh',
      tuning: [...instrument.tuning],
      capo: instrument.capo,
      numFrets: instrument.numFrets,
    },
    duration,
    notes,
    leftHand: { hand: motion.hand, fingers: motion.fingers, barres: [] },
    rightHand: { mode: mode.mode, events },
    warnings,
  };

  // [8] Validate what came out, not what the solver believed.
  const issues = [
    ...validateCore(timeline).issues,
    ...validateGuitar(timeline, {
      instrument,
      geometry,
      leftHand: config.leftHand,
      relaxSpanFactor: config.solver.relaxSpanFactor,
      sourceNotes: noteById,
      relaxedNoteIds,
      tabInfeasibleNoteIds,
    }),
  ].filter(
    (issue) => !(issue.rule === 'V-01' && normalized.pitchTabMismatch.has(issue.noteId ?? '')),
  );

  const errors = issues.filter((issue) => issue.severity === 'error');
  const finalWarnings =
    errors.length === 0
      ? warnings
      : [
          ...warnings,
          {
            code: 'VALIDATION_FAILED',
            noteIds: errors.map((issue) => issue.noteId ?? '').filter((id) => id !== ''),
            message: `${errors.length} check(s) failed: ${errors
              .slice(0, 3)
              .map((issue) => `${issue.rule} ${issue.message}`)
              .join('; ')}`,
          },
        ];

  const withWarnings: FingerTimeline = { ...timeline, warnings: finalWarnings };
  if (!config.debug) return withWarnings;

  return {
    ...withWarnings,
    debug: buildDebugReport({
      stages,
      path: solution.path,
      runnersUp: solution.runnersUp,
      margins: solution.margins,
      stageNodeCounts: solution.stageNodeCounts,
      notes: withWarnings.notes,
      noteById,
      issues,
      totalCost: solution.totalCost,
    }),
  };
}

function buildTimelineNotes(
  stages: readonly SolveStage[],
  solution: ReturnType<typeof solveStages<SolveStage, GuitarState>>,
  relaxedNoteIds: ReadonlySet<string>,
  rushedNotes: ReadonlySet<string>,
  confidenceScale: number,
): readonly TimelineNote[] {
  const out: TimelineNote[] = [];
  for (const [index, stage] of stages.entries()) {
    const state = solution.path[index];
    if (state === undefined) continue;
    const confidence = confidenceFrom(solution.margins[index] ?? Infinity, confidenceScale);
    for (const note of stage.onsets) {
      const placement = state.placements.find((candidate) => candidate.noteId === note.noteId);
      if (placement === undefined) continue;
      out.push({
        noteId: note.noteId,
        time: note.time,
        duration: note.duration,
        pitch: note.pitch,
        string: placement.string,
        fret: placement.fret,
        finger: fingerKey(placement.finger),
        techniques: techniqueNames(note.techniques),
        locked: {
          string: note.lockedString !== undefined,
          fret: note.lockedFret !== undefined,
          finger: note.lockedFinger !== undefined,
        },
        reasons: reasonsFor({
          placement,
          note,
          state,
          previous: solution.path[index - 1],
          runnerUp: solution.runnersUp[index],
          stage,
          relaxed: relaxedNoteIds.has(note.noteId),
          rushed: rushedNotes.has(note.noteId),
        }),
        confidence,
      });
    }
  }
  return out.sort((a, b) => a.time - b.time || a.string - b.string);
}

export type { NoteEvent };
