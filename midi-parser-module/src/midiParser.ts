// src/midiParser.ts
// Parses a raw MIDI file (ArrayBuffer) into our internal ParsedMidi shape.
// Uses @tonejs/midi so we don't hand-roll a MIDI byte-stream parser.
//
// Design notes:
// - We deliberately do NOT filter notes to "channel 10 / drum channel only".
//   Per the spec, the app is asset-driven: whatever note numbers exist in the
//   file are looked up against the selected Drum Set's available assets later.
//   A note with no matching asset is skipped gracefully downstream, not here.
// - Timing is taken directly from @tonejs/midi's already-tempo-resolved
//   seconds values, so tempo changes are automatically reflected in note
//   timing — we don't need to do our own tick->seconds math for notes.
// - We still surface the raw tempo/time-signature change lists separately,
//   because the Timing Display overlay needs them independently of note data.

import { Midi } from '@tonejs/midi';
import {
  MAX_MIDI_DURATION_SECONDS,
  MidiParseError,
  MidiTooLongError,
  ParsedMidi,
  ParsedNote,
  TempoChange,
  TimeSignatureChange,
} from './types';

export interface ParseMidiOptions {
  /** Override the max duration cap (seconds). Defaults to MAX_MIDI_DURATION_SECONDS. */
  maxDurationSeconds?: number;
}

/**
 * Parse a raw MIDI file buffer into a ParsedMidi.
 * Throws MidiParseError (or MidiTooLongError) on any invalid/unsupported input —
 * callers must catch and surface these to the user; never swallow them.
 */
export function parseMidiFile(buffer: ArrayBuffer, options: ParseMidiOptions = {}): ParsedMidi {
  const maxDuration = options.maxDurationSeconds ?? MAX_MIDI_DURATION_SECONDS;

  let midi: Midi;
  try {
    midi = new Midi(buffer);
  } catch (err) {
    throw new MidiParseError(
      'Could not parse this file as MIDI. It may be corrupted or not a valid .mid/.midi file.',
      err
    );
  }

  if (!midi.tracks || midi.tracks.length === 0) {
    throw new MidiParseError('This MIDI file has no tracks / no note data.');
  }

  // Flatten notes across all tracks. Sort by time so downstream consumers
  // (timeline builder, preview) can rely on chronological order.
  const notes: ParsedNote[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({
        midiNote: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity, // @tonejs/midi already normalizes to 0..1
      });
    }
  }

  if (notes.length === 0) {
    throw new MidiParseError('This MIDI file contains no notes.');
  }

  notes.sort((a, b) => a.time - b.time);

  const tempoChanges: TempoChange[] = (midi.header.tempos ?? []).map((t) => ({
    time: t.time,
    bpm: t.bpm,
  }));
  if (tempoChanges.length === 0) {
    // @tonejs/midi always yields at least a default tempo; this guards
    // against unexpected library behavior rather than assuming.
    tempoChanges.push({ time: 0, bpm: 120 });
  }

  const timeSignatures: TimeSignatureChange[] = (midi.header.timeSignatures ?? []).map((ts) => ({
    time: ts.ticks !== undefined ? midi.header.ticksToSeconds(ts.ticks) : 0,
    numerator: ts.timeSignature[0],
    denominator: ts.timeSignature[1],
  }));
  if (timeSignatures.length === 0) {
    // Spec: read the actual time signature; fall back to 4/4 only if absent.
    timeSignatures.push({ time: 0, numerator: 4, denominator: 4 });
  }

  const durationSeconds = midi.duration;

  if (durationSeconds > maxDuration) {
    throw new MidiTooLongError(durationSeconds, maxDuration);
  }

  return {
    notes,
    tempoChanges,
    timeSignatures,
    durationSeconds,
    ppq: midi.header.ppq,
  };
}
