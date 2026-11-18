import { TICKS_PER_QUARTER } from '../../core/duration-math.js';
import type { MidiNote } from '../../parser/midi/midi-file.js';
import { alignmentDiagnostic, type AlignmentDiagnostic } from './diagnostic.js';
import { coreNoteRefKey, type FlatCoreNote } from './flatten.js';

/** §13.2's own tolerance: within ±(1/32 note) ticks. A 32nd note is 1/8 of a quarter note. */
const DEFAULT_TOLERANCE_TICKS = TICKS_PER_QUARTER / 8;

export type MatchTier = 'exact' | 'tolerance' | 'ordinal';

export interface AlignedEntry {
  readonly midiNote: MidiNote;
  readonly tier: MatchTier;
}

export interface AlignmentResult {
  /** §13.2's own output shape: the XML note stays the thing that gets drawn; the MIDI note supplies its sounding time. Keyed by coreNoteRefKey(ref), since a structural ref can't be a Map key directly. */
  readonly alignment: ReadonlyMap<string, AlignedEntry>;
  readonly diagnostics: readonly AlignmentDiagnostic[];
}

/**
 * §13.2: matches `coreNotes` (already flattened via `flattenPartNotes`)
 * against `midiNotes`, tick-based (both sides already normalized to the
 * same 480-per-quarter unit -- §6.2/§11.2), through four tiers run as a
 * cascade, exactly in the order §13.2 lists them -- each tier only
 * considers notes the earlier tiers left unmatched, and a MIDI note
 * claimed by one core note is never claimed by another.
 */
export function alignNotes(
  coreNotes: readonly FlatCoreNote[],
  midiNotes: readonly MidiNote[],
  toleranceTicks: number = DEFAULT_TOLERANCE_TICKS,
): AlignmentResult {
  const alignment = new Map<string, AlignedEntry>();
  const claimedMidi = new Set<number>();

  // Tier 1: exact tick + pitch match -- the common case, both files from the same source.
  //
  // Bucketed by (tick, note number) rather than scanned, because tier 1
  // runs for EVERY note of a well-matched pair: a linear `findIndex` here
  // makes the whole alignment quadratic in the note count (measured:
  // 1600 notes cost ~15ms, four times the 800-note cost). Each bucket
  // holds its MIDI indices in ascending order, so the first unclaimed one
  // is exactly the lowest matching index the old scan returned.
  const exactBuckets = new Map<string, number[]>();
  midiNotes.forEach((mn, i) => {
    const key = `${mn.tick}:${mn.noteNumber}`;
    const bucket = exactBuckets.get(key);
    if (bucket === undefined) exactBuckets.set(key, [i]);
    else bucket.push(i);
  });
  const exactCursor = new Map<string, number>();

  const afterExact: FlatCoreNote[] = [];
  for (const cn of coreNotes) {
    let idx = -1;
    if (cn.noteNumber !== undefined) {
      const key = `${cn.tick}:${cn.noteNumber}`;
      const bucket = exactBuckets.get(key);
      if (bucket !== undefined) {
        let cursor = exactCursor.get(key) ?? 0;
        while (cursor < bucket.length) {
          const candidate = bucket[cursor];
          if (candidate === undefined || !claimedMidi.has(candidate)) break;
          cursor++;
        }
        exactCursor.set(key, cursor);
        if (cursor < bucket.length) idx = bucket[cursor] ?? -1;
      }
    }
    if (idx !== -1) {
      const midiNote = midiNotes[idx];
      if (midiNote !== undefined) {
        alignment.set(coreNoteRefKey(cn.ref), { midiNote, tier: 'exact' });
        claimedMidi.add(idx);
        continue;
      }
    }
    afterExact.push(cn);
  }

  // Tier 2: tolerance match -- within ±(1/32 note) ticks, same pitch, closest wins.
  //
  // Bucketed by note number and sorted by tick, so only the candidates
  // actually inside the ±tolerance window are examined instead of every
  // same-pitch note in the score. A score whose every tick is shifted by a
  // constant (a pickup offset, say) misses tier 1 entirely and lands here
  // for every note, which a full scan would make quadratic. Ties resolve
  // to the lowest index, exactly as the old ascending scan did.
  const byNoteNumber = new Map<number, { readonly index: number; readonly tick: number }[]>();
  midiNotes.forEach((mn, i) => {
    const bucket = byNoteNumber.get(mn.noteNumber);
    if (bucket === undefined) byNoteNumber.set(mn.noteNumber, [{ index: i, tick: mn.tick }]);
    else bucket.push({ index: i, tick: mn.tick });
  });
  for (const bucket of byNoteNumber.values()) bucket.sort((a, b) => a.tick - b.tick);

  /** The `[start, end)` index range of `bucket` whose tick is within `toleranceTicks` of `tick` -- two binary searches on the tick-sorted bucket, since the matching candidates are always a contiguous run. */
  function toleranceRange(
    bucket: readonly { readonly index: number; readonly tick: number }[],
    tick: number,
  ): readonly [number, number] {
    let low = 0;
    let high = bucket.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      const entry = bucket[mid];
      if (entry !== undefined && entry.tick < tick - toleranceTicks) low = mid + 1;
      else high = mid;
    }
    const start = low;
    high = bucket.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      const entry = bucket[mid];
      if (entry !== undefined && entry.tick <= tick + toleranceTicks) low = mid + 1;
      else high = mid;
    }
    return [start, low];
  }

  const afterTolerance: FlatCoreNote[] = [];
  for (const cn of afterExact) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    if (cn.noteNumber !== undefined) {
      const bucket = byNoteNumber.get(cn.noteNumber);
      if (bucket !== undefined) {
        const [start, end] = toleranceRange(bucket, cn.tick);
        for (let b = start; b < end; b++) {
          const candidate = bucket[b];
          if (candidate === undefined || claimedMidi.has(candidate.index)) continue;
          const distance = Math.abs(candidate.tick - cn.tick);
          if (
            distance < bestDistance ||
            (distance === bestDistance && candidate.index < bestIndex)
          ) {
            bestDistance = distance;
            bestIndex = candidate.index;
          }
        }
      }
    }
    if (bestIndex !== -1) {
      const midiNote = midiNotes[bestIndex];
      if (midiNote !== undefined) {
        alignment.set(coreNoteRefKey(cn.ref), { midiNote, tier: 'tolerance' });
        claimedMidi.add(bestIndex);
        continue;
      }
    }
    afterTolerance.push(cn);
  }

  // Tier 3: ordinal fallback -- only when the two REMAINING pools are the
  // same size (§13.2's own condition: "if counts match but ticks do
  // not"), aligned by index within the part/file, e.g. a pickup-measure
  // offset shifting every tick by a constant amount.
  const remainingMidiIndices = midiNotes.map((_, i) => i).filter((i) => !claimedMidi.has(i));
  const diagnostics: AlignmentDiagnostic[] = [];

  if (afterTolerance.length > 0 && afterTolerance.length === remainingMidiIndices.length) {
    afterTolerance.forEach((cn, i) => {
      const midiIndex = remainingMidiIndices[i];
      const midiNote = midiIndex !== undefined ? midiNotes[midiIndex] : undefined;
      if (midiIndex !== undefined && midiNote !== undefined) {
        alignment.set(coreNoteRefKey(cn.ref), { midiNote, tier: 'ordinal' });
        claimedMidi.add(midiIndex);
      }
    });
  } else {
    // Tier 4: unmatched -- record a diagnostic and keep both; never silently drop.
    for (const cn of afterTolerance) {
      diagnostics.push(
        alignmentDiagnostic(
          'warning',
          'UNMATCHED_CORE_NOTE',
          `No matching MIDI note found for the note at measure ${cn.ref.measureNumber}, voice ${cn.ref.voiceId}, event ${cn.ref.eventIndex} (tick ${cn.tick}).`,
        ),
      );
    }
    const stillUnclaimedMidi = midiNotes.map((_, i) => i).filter((i) => !claimedMidi.has(i));
    for (const midiIndex of stillUnclaimedMidi) {
      const mn = midiNotes[midiIndex];
      diagnostics.push(
        alignmentDiagnostic(
          'warning',
          'UNMATCHED_MIDI_NOTE',
          `No matching core note found for the MIDI note at tick ${mn?.tick ?? '?'} (note number ${mn?.noteNumber ?? '?'}).`,
        ),
      );
    }
  }

  return { alignment, diagnostics };
}
