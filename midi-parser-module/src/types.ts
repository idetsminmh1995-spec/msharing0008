// src/types.ts
// Shared types for MIDI parsing + animation timeline building.
// These mirror the data contracts the rest of the app (preview renderer,
// final video renderer, timing-display overlay) will consume.

/** A single parsed MIDI note event. */
export interface ParsedNote {
  midiNote: number;
  /** Note-on time, in seconds, from the start of the file. */
  time: number;
  /** Note duration, in seconds (note-on to note-off). */
  duration: number;
  /** Normalized velocity, 0..1. */
  velocity: number;
}

/** A tempo change event. */
export interface TempoChange {
  /** Time in seconds this tempo takes effect. */
  time: number;
  bpm: number;
}

/** A time signature change event. */
export interface TimeSignatureChange {
  /** Time in seconds this signature takes effect. */
  time: number;
  numerator: number;
  denominator: number;
}

/** Fully parsed MIDI file, ready for timeline building. */
export interface ParsedMidi {
  notes: ParsedNote[];
  tempoChanges: TempoChange[];
  timeSignatures: TimeSignatureChange[];
  /** Total duration of the performance, in seconds. */
  durationSeconds: number;
  /** Pulses (ticks) per quarter note — useful later for subdivision math. */
  ppq: number;
}

export type Hand = 'R' | 'L';

/** One entry in the deterministic animation timeline. */
export interface AnimationEvent {
  /** Time in seconds this hit occurs. */
  time: number;
  midiNote: number;
  hand: Hand;
  velocity: number;
  duration: number;
}

/** Thrown for any invalid/corrupted/unsupported MIDI input. Never fail silently. */
export class MidiParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'MidiParseError';
  }
}

/** Thrown when a MIDI file exceeds the app's supported duration. */
export class MidiTooLongError extends MidiParseError {
  constructor(public readonly durationSeconds: number, public readonly maxSeconds: number) {
    super(
      `MIDI duration (${durationSeconds.toFixed(1)}s) exceeds the maximum supported duration (${maxSeconds}s).`
    );
    this.name = 'MidiTooLongError';
  }
}

/** App-wide constant: MIDI files longer than this are rejected (Section 21 / 15 of the spec). */
export const MAX_MIDI_DURATION_SECONDS = 10 * 60; // 10 minutes
