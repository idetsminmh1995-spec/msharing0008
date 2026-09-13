/** §11's own specified output shape -- MIDI has no notation concepts (spelling, voices, beaming), so this is intentionally just a note list plus a tempo/meta timeline, not anything notation-shaped. */
export interface MidiFile {
  readonly format: 0 | 1;
  /** Header division: ticks per quarter note (PPQ), from the file's own header -- NOT yet normalized. Downstream code should use each event's already-normalized `tick` field instead of re-deriving from this. */
  readonly ppq: number;
  readonly tracks: readonly MidiTrack[];
  readonly tempoEvents: readonly TempoEvent[];
  readonly timeSignatureEvents: readonly TimeSignatureEvent[];
  readonly keySignatureEvents: readonly KeySignatureEvent[];
}

export interface MidiTrack {
  readonly notes: readonly MidiNote[];
}

/** §11.2: every tick here is already normalized to the engine's 480-per-quarter internal unit (§6.2) -- downstream code never sees the file's own PPQ. */
export interface MidiNote {
  readonly tick: number;
  readonly durationTicks: number;
  readonly channel: number;
  readonly noteNumber: number;
  readonly velocity: number;
}

export interface TempoEvent {
  readonly tick: number;
  readonly microsecondsPerQuarter: number;
}

export interface TimeSignatureEvent {
  readonly tick: number;
  readonly numerator: number;
  /** The printed denominator (4, 8, 16, ...), already converted from the file's own 2^dd encoding (§11.1) -- not the raw dd byte. */
  readonly denominator: number;
}

export interface KeySignatureEvent {
  readonly tick: number;
  /** Signed: -7..+7 = flats..sharps, matching MusicXML's own <fifths> convention (§10's key-signature handling) so both parsers produce directly comparable values. */
  readonly sharpsFlats: number;
  readonly isMinor: boolean;
}
