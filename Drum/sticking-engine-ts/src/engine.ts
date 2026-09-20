/**
 * engine.ts — the orchestrator.
 *
 * RULE 28 — ENGINE MODULE ARCHITECTURE: "orchestrator owns WHEN;
 *   specialized modules own WHAT/HOW; circular hidden dependencies are
 *   forbidden." `run()` is the ONLY place that decides call order, and
 *   no rule module imports back into this file.
 * RULE 36 — END-TO-END SOLVER: "Perceive -> Understand -> Remember ->
 *   Predict -> Generate -> Simulate -> Decide -> Move -> Impact ->
 *   Recover -> Adapt -> Continue." `run()` follows exactly that order.
 * RULE 37 — "One decision, one owner, one source of truth." The solver
 *   owns HAND, Rule 9 owns TECHNIQUE, Rules 10/13–19 own MOTION, Rule 25
 *   owns APPROVAL. The engine never re-derives a decision another module
 *   already owns.
 * RULE 40 — FAST/HIGH are the same code path with a narrower or wider
 *   beam and window, so results differ in thoroughness, never in logic.
 */

import type {
  DrumEvent,
  DrummerStyleProfile,
  FinalValidatedPerformance,
  Limb,
  MotionPlan,
  PerformanceEvent,
  PerformanceIntentContext,
  Point3,
  SequenceDecision,
  TechniquePlan,
} from './datamodel.js';
import { LIMBS, drummerState, drummerStyle, fatigueState, performanceIntent } from './datamodel.js';
import { fromNoteList, type NoteListEntry } from './rule01-input.js';
import { drumMappingProfile, mapEvents, type DrumMappingProfile } from './rule02-mapping.js';
import { analyzeDensity, analyzeTiming } from './rule03-04-timing-density.js';
import { classifyPatterns } from './rule05-pattern.js';
import { neutralPosition } from './rule06-reachability.js';
import { assignFeet, solveSticking } from './rule08-11-29-39-solver.js';
import { selectTechnique } from './rule09-technique.js';
import { planRecovery } from './rule10-recovery.js';
import { humanizeTiming, humanizeVelocity } from './rule12-humanization.js';
import {
  appendRecoveryKeyframe,
  applyRigEnvelope,
  assembleTimeline,
  checkAudioAnimationSync,
  computeBodyState,
  computeImpact,
} from './rule13-19-24-motion.js';
import { PerformanceMemory } from './rule20-31-33-memory.js';
import {
  ProfileCalibrator,
  buildEffectiveStyle,
  makeIdiomContext,
  updateFatigue,
} from './rule21-23-32-35-profile.js';
import { validateAndRepair } from './rule25-validation.js';
import { DrummerStateMachine } from './rule30-state-machine.js';

/** RULE 40 — search-effort presets. Same code path, different thoroughness. */
export const SEARCH_PRESETS: Readonly<Record<string, { windowSize: number; beamWidth: number }>> = {
  FAST: { windowSize: 6, beamWidth: 3 },
  HIGH: { windowSize: 14, beamWidth: 8 },
};

/**
 * The engine's one explicit configuration surface. Nothing inside
 * `run()` reads ambient or global config -- everything flows through here.
 */
export interface EngineConfig {
  style: DrummerStyleProfile;
  intent: PerformanceIntentContext;
  genre: string;
  seed: number;
  /** "FAST" | "HIGH" (Rule 40). */
  mode: string;
  mappingProfile?: DrumMappingProfile;
}

export function engineConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    style: overrides.style ?? drummerStyle(),
    intent: overrides.intent ?? performanceIntent(),
    genre: overrides.genre ?? 'generic',
    seed: overrides.seed ?? 42,
    mode: overrides.mode ?? 'HIGH',
    ...(overrides.mappingProfile !== undefined ? { mappingProfile: overrides.mappingProfile } : {}),
  };
}

export class Engine {
  readonly config: EngineConfig;
  readonly memory = new PerformanceMemory();
  readonly calibrator = new ProfileCalibrator();

  constructor(config?: Partial<EngineConfig>) {
    this.config = engineConfig(config ?? {});
  }

  /** RULE 36's end-to-end loop. */
  run(input: { noteList: readonly NoteListEntry[] }): FinalValidatedPerformance {
    const cfg = this.config;
    // An unrecognized mode falls back to HIGH rather than failing --
    // Rule 40's own behaviour, and the two modes differ only in search
    // thoroughness, so the fallback is never the wrong ANSWER.
    const preset = SEARCH_PRESETS[cfg.mode] ?? SEARCH_PRESETS['HIGH'];
    if (preset === undefined) throw new Error('SEARCH_PRESETS has lost its HIGH preset');

    // ---- Perceive (Rule 1) ----
    const normalized = fromNoteList(input.noteList);

    // ---- Understand (Rules 2-5) ----
    const mappingProfile = cfg.mappingProfile ?? drumMappingProfile();
    let drumEvents: DrumEvent[] = mapEvents(normalized.events, mappingProfile);
    drumEvents = drumEvents.filter((e) => e.isPlayable);
    drumEvents.sort((a, b) => a.timeSeconds - b.timeSeconds);

    const timing = analyzeTiming(drumEvents, normalized.tempoMap, normalized.timeSignatureMap);
    const density = analyzeDensity(drumEvents);
    // Timing/density/pattern context is available to any rule that wants
    // it; the reference solver uses reachability and style scoring
    // directly, which already reacts to density through available-time
    // windows. Computed anyway because the Python computes it, and
    // because Rule 5 consumes ID-counter values -- skipping it would
    // shift every later ID and make a parity diff unreadable.
    classifyPatterns(drumEvents, timing, density);

    // ---- Remember / Predict (Rules 20/31/32/35 setup) ----
    const idiom = makeIdiomContext(cfg.genre);
    const effectiveStyle = buildEffectiveStyle(
      cfg.style,
      this.calibrator.learned,
      cfg.intent,
      fatigueState(),
      idiom,
    );

    const state = drummerState({ style: effectiveStyle, intent: cfg.intent });
    for (const limb of LIMBS) {
      const ls = state.limbs[limb];
      ls.position = neutralPosition(limb);
      ls.lastActionTimeS = -999.0;
      ls.readyTimeS = -999.0;
    }
    const sm = new DrummerStateMachine(state);

    // ---- Generate / Simulate / Decide (Rules 6-12, 29, 39) ----
    const manualEvents = drumEvents.filter((e) => !e.target.isFootTarget);
    const footEvents = drumEvents.filter((e) => e.target.isFootTarget);

    const stickingDecisions = solveSticking(
      manualEvents,
      sm.state,
      preset.windowSize,
      preset.beamWidth,
    );
    const footDecisions = assignFeet(footEvents, sm.state);
    const allDecisions: SequenceDecision[] = [...stickingDecisions, ...footDecisions];

    this.memory.recordCommitted(allDecisions);
    const eventById = new Map(drumEvents.map((e) => [e.eventId, e]));

    // ---- Move / Impact / Recover (Rules 9-10, 13-19, 23-24) ----
    // A deterministic time-ordered replay. The solver already fixed
    // WHICH limb plays WHAT; this pass owns HOW, and touches nothing the
    // solver decided (Rule 37's ownership rule).
    const replayPosition = {} as Record<Limb, Point3>;
    const replayReadyTime = {} as Record<Limb, number>;
    const replayLastTime = {} as Record<Limb, number | undefined>;
    for (const limb of LIMBS) {
      replayPosition[limb] = neutralPosition(limb);
      replayReadyTime[limb] = -999.0;
      replayLastTime[limb] = undefined;
    }
    let fatigue = fatigueState();

    const ordered = [...allDecisions].sort(
      (a, b) =>
        (eventById.get(a.eventId) as DrumEvent).timeSeconds -
        (eventById.get(b.eventId) as DrumEvent).timeSeconds,
    );

    const performanceEvents: PerformanceEvent[] = [];
    const motionPlans: MotionPlan[] = [];
    const techniqueByEvent = new Map<string, TechniquePlan>();

    for (const decision of ordered) {
      const ev = eventById.get(decision.eventId) as DrumEvent;
      const limb = decision.limb;

      const technique = selectTechnique(ev, limb, effectiveStyle, replayLastTime[limb]);
      techniqueByEvent.set(ev.eventId, technique);

      const recovery = planRecovery(ev.timeSeconds, limb, technique);

      const humanTiming = humanizeTiming(ev.eventId, ev.timeSeconds, effectiveStyle, cfg.seed);
      const humanizedVelocity = humanizeVelocity(ev.eventId, ev.velocity, effectiveStyle, cfg.seed);

      const targetPos: Point3 = [ev.target.x, ev.target.y, ev.target.height];
      let plan = buildMotionPlanFor(
        ev.eventId,
        limb,
        technique,
        replayPosition[limb],
        targetPos,
        humanTiming,
        replayReadyTime[limb],
      );
      plan = applyRigEnvelope(plan);
      plan = appendRecoveryKeyframe(plan, recovery);
      motionPlans.push(plan);

      computeImpact(plan, ev.instrument, technique);

      fatigue = updateFatigue(fatigue, limb, technique, ev.timeSeconds);

      replayPosition[limb] = [ev.target.x, ev.target.y, ev.target.height + recovery.reboundHeightM];
      replayReadyTime[limb] = recovery.readyTimeS;
      replayLastTime[limb] = ev.timeSeconds;

      computeBodyState(ev.timeSeconds, replayPosition);

      const isDominantHand =
        (limb === 'RH' || limb === 'LH') && limb === `${effectiveStyle.dominantHand}H`;
      // Body-crossing is scored inside Rule 7's candidate search, but a
      // committed SequenceDecision does not carry that tag forward;
      // `false` is the safe default here, and the interface leaves room
      // to thread the real flag through in a future revision.
      this.calibrator.observe(isDominantHand, false);

      performanceEvents.push({
        eventId: ev.eventId,
        sourceId: ev.sourceId,
        timeSeconds: humanTiming.performedTimeS,
        limb,
        instrument: ev.instrument,
        strokeType: technique.strokeType,
        velocity: humanizedVelocity,
        microtimingOffsetMs: humanTiming.microtimingOffsetMs,
        dynamicLevel: technique.dynamicLevel,
        ruleTrace: ['rule08/29', 'rule09', 'rule10', 'rule12', 'rule13-19'],
      });
    }

    // ---- Assemble timeline (Rule 19) & sync (Rule 24) ----
    const timeline = assembleTimeline(motionPlans, techniqueByEvent);
    checkAudioAnimationSync(timeline);

    // ---- Validate & repair (Rule 25) ----
    const validation = validateAndRepair(performanceEvents);

    return {
      events: performanceEvents,
      animation: timeline,
      validation,
      durationS: timeline.durationS,
      seed: cfg.seed,
      engineVersion: '1.0.0',
    };
  }
}

// Imported separately so `engine.ts` reads as orchestration rather than
// as a wall of imports; `buildMotionPlan`'s own module owns the physics.
import { buildMotionPlan as buildMotionPlanFor } from './rule13-19-24-motion.js';
