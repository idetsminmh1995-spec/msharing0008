import type { MidiNote } from '../../parser/midi/midi-file.js';
import { type AlignmentDiagnostic } from './diagnostic.js';
import { type FlatCoreNote } from './flatten.js';
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
export declare function alignNotes(coreNotes: readonly FlatCoreNote[], midiNotes: readonly MidiNote[], toleranceTicks?: number): AlignmentResult;
