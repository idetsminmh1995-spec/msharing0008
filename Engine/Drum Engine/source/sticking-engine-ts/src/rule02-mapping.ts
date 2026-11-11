/**
 * rule02-mapping.ts — RULE 2: INSTRUMENT, SURFACE & TARGET MAPPING
 *
 * "Mapping is deterministic and configurable; mapping does not choose
 * the hand or final stroke." This module NEVER decides Hand/Limb. It
 * only resolves *what* was hit and *where* it physically is.
 */

import type { DrumEvent, Instrument, SourceMidiEvent, Target } from './datamodel.js';
import { target } from './datamodel.js';
import { newId } from './core/ids.js';

/** General MIDI Percussion Key Map (channel 10 / index 9) -> Instrument. */
export const GM_DRUM_MAP: Readonly<Record<number, Instrument>> = {
  35: 'kick',
  36: 'kick',
  37: 'snare_cross_stick',
  38: 'snare',
  39: 'snare_cross_stick', // hand clap approximated as a cross-stick surface
  40: 'snare_rim',
  41: 'floor_tom',
  42: 'hihat_closed',
  43: 'floor_tom',
  44: 'hihat_pedal',
  45: 'tom_low',
  46: 'hihat_open',
  47: 'tom_low',
  48: 'tom_mid',
  49: 'crash_1',
  50: 'tom_high',
  51: 'ride',
  52: 'crash_2',
  53: 'ride_bell',
  55: 'crash_1',
  57: 'crash_2',
  59: 'ride',
};

/**
 * Configurable kit geometry: a canonical drummer-frame top-down layout
 * in meters. Approximates a standard 5-piece kit and is meant to be
 * overridden per song or per kit.
 */
export interface DrumMappingProfile {
  readonly noteMap: Readonly<Record<number, Instrument>>;
  readonly targets: Readonly<Partial<Record<Instrument, Target>>>;
}

export function drumMappingProfile(
  overrides: Partial<DrumMappingProfile> = {},
): DrumMappingProfile {
  return {
    noteMap: overrides.noteMap ?? { ...GM_DRUM_MAP },
    targets: overrides.targets ?? {
      kick: target('kick', 0.0, 0.35, { isFootTarget: true, preferredLimb: 'RF', radius: 0.2 }),
      hihat_pedal: target('hihat_pedal', -0.55, 0.3, {
        isFootTarget: true,
        preferredLimb: 'LF',
        radius: 0.15,
      }),
      snare: target('snare', -0.05, 0.3, { radius: 0.17 }),
      snare_rim: target('snare_rim', -0.05, 0.3, { radius: 0.17 }),
      snare_cross_stick: target('snare_cross_stick', -0.05, 0.3, { radius: 0.17 }),
      hihat_closed: target('hihat_closed', -0.45, 0.32, { radius: 0.18 }),
      hihat_open: target('hihat_open', -0.45, 0.32, { radius: 0.18 }),
      hihat_bell: target('hihat_bell', -0.45, 0.28, { radius: 0.1 }),
      tom_high: target('tom_high', 0.1, 0.45, { height: 0.05, radius: 0.16 }),
      tom_mid: target('tom_mid', 0.35, 0.48, { height: 0.05, radius: 0.16 }),
      tom_low: target('tom_low', 0.55, 0.45, { height: 0.0, radius: 0.17 }),
      floor_tom: target('floor_tom', 0.62, 0.2, { height: -0.1, radius: 0.19 }),
      ride: target('ride', 0.7, 0.4, { height: 0.15, radius: 0.2 }),
      ride_bell: target('ride_bell', 0.7, 0.4, { height: 0.15, radius: 0.08 }),
      crash_1: target('crash_1', -0.35, 0.55, { height: 0.2, radius: 0.2 }),
      crash_2: target('crash_2', 0.45, 0.6, { height: 0.2, radius: 0.2 }),
    },
  };
}

export function resolveInstrument(profile: DrumMappingProfile, note: number): Instrument {
  return profile.noteMap[note] ?? 'unknown';
}

export function targetFor(profile: DrumMappingProfile, instrument: Instrument): Target {
  const found = profile.targets[instrument];
  if (found !== undefined) return found;
  // Deterministic fallback: an unknown instrument is placed at the snare
  // position rather than silently dropped, and flagged non-playable.
  return target('unknown', -0.05, 0.3, { radius: 0.17 });
}

export function mapEvents(
  sourceEvents: readonly SourceMidiEvent[],
  profile: DrumMappingProfile,
): DrumEvent[] {
  return sourceEvents.map((se) => {
    const instrument = resolveInstrument(profile, se.note);
    const playable = instrument !== 'unknown';
    return {
      eventId: newId('evt'),
      sourceId: se.sourceId,
      timeSeconds: se.timeSeconds,
      instrument,
      target: targetFor(profile, instrument),
      velocity: se.velocity,
      isPlayable: playable,
      mappingNotes: playable ? '' : `unmapped note ${se.note}`,
    };
  });
}
