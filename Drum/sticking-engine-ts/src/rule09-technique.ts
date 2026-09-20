/**
 * rule09-technique.ts — RULE 9: STROKE TECHNIQUE & ARTICULATION SELECTION
 *
 * "Technique is constrained by timing, physical state, and next-stroke
 * preparation."
 */

import type {
  DrumEvent,
  DrummerStyleProfile,
  Instrument,
  Limb,
  StrokeType,
  TechniquePlan,
} from './datamodel.js';

const RIM_CAPABLE: ReadonlySet<Instrument> = new Set<Instrument>(['snare']);
const CHOKE_CAPABLE: ReadonlySet<Instrument> = new Set<Instrument>([
  'crash_1',
  'crash_2',
  'hihat_open',
]);

/**
 * Deterministic technique selection from:
 *   - the style profile's ghost/accent velocity thresholds,
 *   - instrument capability (a rim shot only where there is a rim),
 *   - the inter-onset interval for the SAME limb, which is what turns a
 *     fast repeat into the second stroke of a double rather than a
 *     fresh single.
 */
export function selectTechnique(
  event: DrumEvent,
  limb: Limb,
  style: DrummerStyleProfile,
  sameLimbPrevTime: number | undefined,
): TechniquePlan {
  const velocity = event.velocity;
  const dynamicLevel = velocity / 127.0;

  let stroke: StrokeType;
  if (event.instrument === 'snare_cross_stick') {
    stroke = 'cross_stick';
  } else if (CHOKE_CAPABLE.has(event.instrument) && velocity >= style.accentVelocityThreshold) {
    stroke = 'choke';
  } else if (RIM_CAPABLE.has(event.instrument) && velocity >= style.accentVelocityThreshold) {
    stroke = 'rim_shot';
  } else if (event.instrument === 'hihat_bell' || event.instrument === 'ride_bell') {
    stroke = 'bell';
  } else if (event.instrument === 'hihat_open') {
    stroke = 'open';
  } else if (velocity <= style.ghostNoteVelocityThreshold) {
    stroke = 'ghost';
  } else if (velocity >= style.accentVelocityThreshold) {
    stroke = 'accent';
  } else {
    stroke = 'single';
  }

  if (sameLimbPrevTime !== undefined) {
    const dt = event.timeSeconds - sameLimbPrevTime;
    if (dt < 1.0 / style.maxSingleHandRateHz && stroke === 'single') {
      stroke = 'double';
    }
  }

  return { eventId: event.eventId, limb, strokeType: stroke, dynamicLevel };
}
