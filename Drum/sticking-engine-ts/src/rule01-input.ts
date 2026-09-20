/**
 * rule01-input.ts — RULE 1: INPUT / MIDI PREPARATION
 *
 * "Source data is immutable; parsing must never invent musical intent;
 * every source event keeps a stable ID."
 *
 * This module ONLY parses. It never assigns hands, instruments-as-drum-
 * roles, or musical meaning beyond raw note/velocity/time. That is
 * Rule 2's job.
 *
 * PORT NOTE — the MIDI-file path is deliberately NOT here. The Python
 * reads `.mid` with `mido`; this port's caller (the drum page) already
 * has a parsed score and feeds a note list, and reimplementing a second
 * MIDI parser inside this module would be a second place for MIDI bugs
 * to live when the repo already has two. `midi-adapter.ts` builds a note
 * list from `notation-engine`'s own `parseMidiFile` instead, and is
 * documented as EQUIVALENT rather than byte-identical -- see
 * `Drum/INTEGRATION-PLAN.md`.
 */

import type { NormalizedMidiData, SourceMidiEvent } from './datamodel.js';
import { newId } from './core/ids.js';

/** One entry of the plain note-list input: `{time, note, velocity, channel?}`. */
export interface NoteListEntry {
  readonly time: number;
  readonly note: number;
  readonly velocity?: number;
  readonly channel?: number;
  readonly trackName?: string;
}

/**
 * The constructor for synthetic/programmatic input (tests, demos, or a
 * non-MIDI source such as a parsed MusicXML score). Produces the same
 * canonical `NormalizedMidiData` contract Rule 1 promises downstream.
 */
export function fromNoteList(notes: readonly NoteListEntry[]): NormalizedMidiData {
  const events: SourceMidiEvent[] = notes.map((n) => ({
    sourceId: newId('src'),
    timeSeconds: Number(n.time),
    // Nominal, and not used downstream -- the Python says the same.
    timeTicks: Math.trunc(n.time * 480 * 2),
    channel: Math.trunc(n.channel ?? 9),
    note: Math.trunc(n.note),
    velocity: Math.trunc(n.velocity ?? 100),
    trackName: n.trackName ?? '',
  }));

  for (const event of events) {
    if (!(event.velocity >= 0 && event.velocity <= 127)) {
      throw new Error(`velocity out of MIDI range: ${event.velocity}`);
    }
  }

  // Python's `list.sort` is stable, and so is JavaScript's since ES2019 --
  // which matters, because simultaneous notes keep their written order and
  // Rule 11 solves them as a group in exactly that order.
  events.sort((a, b) => a.timeSeconds - b.timeSeconds);

  return {
    events,
    tempoMap: [{ timeSeconds: 0.0, timeTicks: 0, bpm: 120.0 }],
    timeSignatureMap: [{ timeSeconds: 0.0, timeTicks: 0, numerator: 4, denominator: 4 }],
    ticksPerBeat: 960,
    malformedEventCount: 0,
  };
}
