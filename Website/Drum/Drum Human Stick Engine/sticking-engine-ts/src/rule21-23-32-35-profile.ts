/**
 * rule21-23-32-35-profile.ts
 *
 * The five layers of ONE profile-blending pipeline, in Rule 32's
 * documented order:
 *   BaseProfile -> LearnedProfile -> Idiom(35) -> Intent(21) -> Fatigue(23)
 *
 * None of them may touch physical feasibility -- only the soft scoring
 * parameters Rule 7/9 read.
 */

import type {
  DrummerStyleProfile,
  FatigueState,
  IdiomContext,
  LearnedDrummerProfile,
  Limb,
  PerformanceIntentContext,
  StrokeType,
  TechniquePlan,
} from './datamodel.js';
import { loadFor } from './datamodel.js';

// ---------------------------------------------------------------------------
// RULE 23 — Fatigue
// ---------------------------------------------------------------------------

const STROKE_LOAD: Readonly<Record<StrokeType, number>> = {
  ghost: 0.3,
  single: 1.0,
  double: 0.8,
  accent: 1.6,
  rim_shot: 1.7,
  cross_stick: 1.1,
  flam: 1.4,
  drag: 1.2,
  choke: 1.8,
  bell: 1.2,
  open: 1.3,
  closed: 1.0,
};
const FATIGUE_DECAY_PER_SECOND = 0.15;
const FATIGUE_CAP = 10.0;

/** Called once per committed decision. Mutates and returns the same object, as the Python does. */
export function updateFatigue(
  fatigue: FatigueState,
  limb: Limb,
  technique: TechniquePlan,
  eventTime: number,
): FatigueState {
  const idle = Math.max(0.0, eventTime - fatigue.timeSeconds);
  const decay = idle * FATIGUE_DECAY_PER_SECOND;
  for (const l of Object.keys(fatigue.limbLoad) as Limb[]) {
    fatigue.limbLoad[l] = Math.max(0.0, fatigue.limbLoad[l] - decay);
  }
  const load = (STROKE_LOAD[technique.strokeType] ?? 1.0) * (0.6 + 0.8 * technique.dynamicLevel);
  fatigue.limbLoad[limb] = Math.min(FATIGUE_CAP, fatigue.limbLoad[limb] + load);
  fatigue.timeSeconds = eventTime;
  return fatigue;
}

/**
 * Fatigue nudges soft preferences, never hard physics. A tired
 * non-dominant hand raises dominance bias and lowers its own max rate;
 * it never claims an impossible stroke is possible.
 */
export function fatigueAdjustedStyle(
  style: DrummerStyleProfile,
  fatigue: FatigueState,
): DrummerStyleProfile {
  const handLoad = (loadFor(fatigue, 'RH') + loadFor(fatigue, 'LH')) / 2.0;
  const fatigueFrac = Math.min(1.0, handLoad / FATIGUE_CAP);
  return {
    ...style,
    dominanceBias: style.dominanceBias + 0.1 * fatigueFrac,
    maxSingleHandRateHz: style.maxSingleHandRateHz * (1.0 - 0.15 * fatigueFrac),
  };
}

// ---------------------------------------------------------------------------
// RULE 32 — Learned profile calibration
// ---------------------------------------------------------------------------

/**
 * Aggregates evidence into a slowly-updated profile using a bounded
 * exponential moving average, so a handful of outlier passages cannot
 * whiplash the drummer's identity.
 */
export class ProfileCalibrator {
  readonly emaAlpha: number;
  readonly learned: LearnedDrummerProfile;

  constructor(emaAlpha = 0.05) {
    this.emaAlpha = emaAlpha;
    this.learned = {
      observedDominanceBias: 0.15,
      observedCrossingAversion: 0.6,
      sampleCount: 0,
      confidence: 0.0,
    };
  }

  observe(chosenDominant: boolean, crossed: boolean): void {
    const a = this.emaAlpha;
    const targetDom = chosenDominant ? 1.0 : 0.0;
    const targetCross = crossed ? 1.0 : 0.0;
    this.learned.observedDominanceBias =
      (1 - a) * this.learned.observedDominanceBias + a * (0.3 * targetDom);
    this.learned.observedCrossingAversion =
      (1 - a) * this.learned.observedCrossingAversion + a * (1.0 - targetCross);
    this.learned.sampleCount += 1;
    this.learned.confidence = Math.min(
      0.95,
      this.learned.sampleCount / (this.learned.sampleCount + 50),
    );
  }
}

/** The keys of DrummerStyleProfile an idiom preset is allowed to weight. */
const WEIGHTABLE = new Set<string>([
  'dominanceBias',
  'crossingAversion',
  'alternationPreference',
  'maxSingleHandRateHz',
  'ghostNoteVelocityThreshold',
  'accentVelocityThreshold',
  'variationAmount',
]);

export function buildEffectiveStyle(
  base: DrummerStyleProfile,
  learned: LearnedDrummerProfile,
  intent: PerformanceIntentContext,
  fatigue: FatigueState,
  idiom: IdiomContext,
): DrummerStyleProfile {
  const eff: DrummerStyleProfile = { ...base };

  // Learned layer: a confidence-weighted blend toward the observed stats.
  const c = learned.confidence;
  eff.dominanceBias = (1 - c) * eff.dominanceBias + c * learned.observedDominanceBias;
  eff.crossingAversion = (1 - c) * eff.crossingAversion + c * learned.observedCrossingAversion;

  // Idiom (Rule 35): bounded multiplicative weighting.
  for (const [fieldName, multiplier] of Object.entries(idiom.weighting)) {
    if (!WEIGHTABLE.has(fieldName)) continue;
    const key = fieldName as keyof DrummerStyleProfile;
    const current = eff[key];
    if (typeof current !== 'number') continue;
    const boundedMult = Math.max(0.5, Math.min(1.5, multiplier));
    (eff[key] as number) = current * boundedMult;
  }

  // Intent (Rule 21): more energy/intensity -> more willing to cross and
  // vary; groove commitment pulls alternation preference up.
  eff.crossingAversion *= 1.0 - 0.2 * intent.intensity;
  eff.variationAmount = Math.min(1.0, eff.variationAmount + 0.3 * intent.fillFreedom);
  eff.alternationPreference = Math.min(
    1.0,
    eff.alternationPreference + 0.15 * intent.grooveCommitment,
  );

  // Fatigue (Rule 23) last, closest to "physical now".
  return fatigueAdjustedStyle(eff, fatigue);
}

// ---------------------------------------------------------------------------
// RULE 35 — Genre idiom presets
// ---------------------------------------------------------------------------

/**
 * Keys are DrummerStyleProfile field names. The Python's are snake_case
 * (`alternation_preference`); the port's are camelCase, and this table
 * is the ONE place that difference lives -- `buildEffectiveStyle` looks
 * the key up on the profile object, so a preset written with the wrong
 * casing would silently do nothing. `WEIGHTABLE` above is what turns
 * that silence into a no-op that a test can catch.
 */
export const IDIOM_PRESETS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  rock: { alternationPreference: 1.1, crossingAversion: 1.0 },
  metal: { alternationPreference: 1.3, crossingAversion: 0.9, dominanceBias: 0.9 },
  jazz: { alternationPreference: 0.85, crossingAversion: 0.8, variationAmount: 1.3 },
  funk: { alternationPreference: 1.0, crossingAversion: 0.85, variationAmount: 1.2 },
  latin: { alternationPreference: 0.9, crossingAversion: 0.75 },
  generic: {},
};

export function makeIdiomContext(genre: string): IdiomContext {
  return { genre, weighting: { ...(IDIOM_PRESETS[genre.toLowerCase()] ?? {}) } };
}
