/**
 * rule05-pattern.ts — RULE 5: PATTERN, GROOVE, FILL & PHRASE
 * CLASSIFICATION
 *
 * "Classification is probabilistic and contextual; labels guide later
 * decisions but do not force them." Nothing downstream may treat a
 * PatternContext as a hard constraint -- only as a bias.
 */

import type {
  DensityContext,
  DrumEvent,
  Instrument,
  PatternContext,
  PatternRole,
  TimingContext,
} from './datamodel.js';
import { newId } from './core/ids.js';

const MELODIC_TOMS: ReadonlySet<Instrument> = new Set<Instrument>([
  'tom_high',
  'tom_mid',
  'tom_low',
  'floor_tom',
]);
const GROOVE_KEEPERS: ReadonlySet<Instrument> = new Set<Instrument>([
  'hihat_closed',
  'hihat_open',
  'ride',
  'ride_bell',
]);

export function classifyPatterns(
  events: readonly DrumEvent[],
  timing: readonly TimingContext[],
  _density: readonly DensityContext[],
  measureGroupSize = 1,
): PatternContext[] {
  const timByeId = new Map(timing.map((t) => [t.eventId, t]));

  // Group by measure. A Map preserves insertion order, which is what
  // Python's dict does -- and the phrase IDs below are handed out in
  // that order, so it has to be the same order in both.
  const measures = new Map<number, DrumEvent[]>();
  for (const ev of events) {
    const t = timByeId.get(ev.eventId);
    if (t === undefined) continue;
    const m = Math.floor(t.measure / measureGroupSize);
    const bucket = measures.get(m);
    if (bucket === undefined) measures.set(m, [ev]);
    else bucket.push(ev);
  }

  let total = 0;
  for (const evs of measures.values()) total += evs.length;
  const avgCount = measures.size > 0 ? total / measures.size : 0;

  const out: PatternContext[] = [];
  // A single section for simple inputs; a full song-structure detector
  // could split this further without changing the contract.
  const sectionId = newId('section');

  for (const evs of measures.values()) {
    const phraseId = newId('phrase');
    const tomHits = evs.filter((e) => MELODIC_TOMS.has(e.instrument)).length;
    const grooveHits = evs.filter((e) => GROOVE_KEEPERS.has(e.instrument)).length;
    const count = evs.length;

    let role: PatternRole;
    let conf: number;
    if (count === 0) {
      role = 'break';
      conf = 0.9;
    } else if (avgCount > 0 && count < 0.35 * avgCount) {
      role = 'break';
      conf = 0.6;
    } else if (tomHits >= Math.max(2, Math.trunc(0.4 * count)) && grooveHits < 0.2 * count) {
      role = 'fill';
      conf = 0.65;
    } else if (grooveHits >= 0.4 * count) {
      role = 'groove';
      conf = 0.7;
    } else {
      role = 'unknown';
      conf = 0.4;
    }

    for (const ev of evs) {
      out.push({ eventId: ev.eventId, phraseId, sectionId, role, roleConfidence: conf });
    }
  }
  return out;
}
