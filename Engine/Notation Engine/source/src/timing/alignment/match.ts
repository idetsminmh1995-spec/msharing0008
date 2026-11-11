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
  const afterExact: FlatCoreNote[] = [];
  for (const cn of coreNotes) {
    const idx =
      cn.noteNumber !== undefined
        ? midiNotes.findIndex(
            (mn, i) =>
              !claimedMidi.has(i) && mn.tick === cn.tick && mn.noteNumber === cn.noteNumber,
          )
        : -1;
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
  const afterTolerance: FlatCoreNote[] = [];
  for (const cn of afterExact) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    if (cn.noteNumber !== undefined) {
      midiNotes.forEach((mn, i) => {
        if (claimedMidi.has(i) || mn.noteNumber !== cn.noteNumber) return;
        const distance = Math.abs(mn.tick - cn.tick);
        if (distance <= toleranceTicks && distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      });
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
