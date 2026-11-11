import type { Chord } from './chord.js';
import type { Note } from './note.js';
import type { Rest } from './rest.js';

/** Anything that can occupy a moment in time within a Voice. */
export type MeasureEvent = Note | Rest | Chord;
