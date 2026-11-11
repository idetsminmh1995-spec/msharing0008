/**
 * validate-guitar.ts — re-reading the answer as a guitarist (Plan Part 11 §1).
 *
 * The core validator checks arithmetic; this one checks a HAND. It
 * reads the finished timeline without knowing what the solver was
 * thinking, and asks whether a person could actually have played it:
 * two notes are not on one string, the fingers lie along the neck in
 * order, nothing is stretched further than a hand stretches, and what
 * the file wrote down is still what came out.
 *
 * Phase 1's rules are here (V-02..V-07, V-09, V-10). The chord and
 * technique checks join them with the phases that can break them.
 */
import type { GeometryConfig } from '../core/geometry.js';
import { fingertipDistanceMm, fingertipPoint } from '../core/geometry.js';
import type { FingerTimeline, TimelineNote } from '../core/timeline-schema.js';
import type { InstrumentSpec, LHFinger, NoteEvent } from '../core/types.js';
import type { ValidationIssue } from '../core/validate-core.js';
import { isLegatoTarget } from './right-hand/pick.js';
import type { LeftHandConfig } from './left-hand-rules.js';
import { spanLimit } from './left-hand-rules.js';

export interface GuitarValidationContext {
  readonly instrument: InstrumentSpec;
  readonly geometry: GeometryConfig;
  readonly leftHand: LeftHandConfig;
  readonly relaxSpanFactor: number;
  /** The notes as they arrived, to check nothing written down was changed (V-06). */
  readonly sourceNotes: ReadonlyMap<string, NoteEvent>;
  /** Notes whose span limits were deliberately loosened (SV-14), so V-05 judges them by the looser one. */
  readonly relaxedNoteIds: ReadonlySet<string>;
  /**
   * Notes whose own written tab needs a stretch no hand makes
   * (TAB_INFEASIBLE).
   *
   * V-05 does not measure these at all. The engine did not choose the
   * stretch -- the file did, and P-001 says it is kept as written; the
   * warning has already said so once, and reporting it again as an
   * engine error would blame the engine for obeying the rule.
   */
  readonly tabInfeasibleNoteIds: ReadonlySet<string>;
}

/** Two notes sound together when their times overlap by more than a rounding error. */
function overlaps(a: TimelineNote, b: TimelineNote): boolean {
  const start = Math.max(a.time, b.time);
  const end = Math.min(a.time + a.duration, b.time + b.duration);
  return end - start > 1e-6;
}

export function validateGuitar(
  timeline: FingerTimeline,
  context: GuitarValidationContext,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const notes = timeline.notes;

  for (let i = 0; i < notes.length; i++) {
    const a = notes[i] as TimelineNote;

    // [V-06] whatever the file decided is still what came out.
    const source = context.sourceNotes.get(a.noteId);
    if (source !== undefined) {
      if (source.lockedString !== undefined && source.lockedString !== a.string) {
        issues.push(
          problem(
            'V-06',
            `note ${a.noteId} was written on string ${source.lockedString} and came out on ${a.string}`,
            a,
          ),
        );
      }
      if (source.lockedFret !== undefined && source.lockedFret !== a.fret) {
        issues.push(
          problem(
            'V-06',
            `note ${a.noteId} was written at fret ${source.lockedFret} and came out at ${a.fret}`,
            a,
          ),
        );
      }
      if (source.lockedFinger !== undefined && String(source.lockedFinger) !== String(a.finger)) {
        issues.push(
          problem(
            'V-06',
            `note ${a.noteId} was written for finger ${String(source.lockedFinger)} and came out on ${String(a.finger)}`,
            a,
          ),
        );
      }
      // [V-09] a hammer-on, pull-off or slide is tied to the note it
      // comes from: same string, and a slide keeps the same finger.
      for (const link of source.techniqueLinks ?? []) {
        if (link.fromNoteId === undefined) continue;
        const from = notes.find((note) => note.noteId === link.fromNoteId);
        if (from === undefined) continue;
        if (from.string !== a.string) {
          issues.push(
            problem(
              'V-09',
              `${link.type} into ${a.noteId} crosses from string ${from.string} to ${a.string}`,
              a,
            ),
          );
        } else if (link.type === 'slide' && from.finger !== a.finger) {
          issues.push(
            problem(
              'V-09',
              `a slide into ${a.noteId} changes finger ${String(from.finger)} to ${String(a.finger)}`,
              a,
            ),
          );
        }
      }
    }

    for (let j = i + 1; j < notes.length; j++) {
      const b = notes[j] as TimelineNote;
      // The notes are in time order, so once one starts after this
      // one has finished, nothing later can overlap it either. Without
      // this the validator reads every pair in the song -- four and a
      // half million of them in a five-minute solo, and the slowest
      // thing in the engine by far.
      if (b.time >= a.time + a.duration) break;
      if (!overlaps(a, b)) continue;

      // [V-02] one string can only sound one note at a time.
      if (a.string === b.string) {
        issues.push(
          problem(
            'V-02',
            `notes ${a.noteId} and ${b.noteId} sound at once on string ${a.string}`,
            b,
          ),
        );
      }
      if (a.finger === null || b.finger === null) continue;

      // [V-03] and one finger can only be in one place at a time.
      if (a.finger === b.finger && (a.fret !== b.fret || a.string !== b.string)) {
        issues.push(
          problem(
            'V-03',
            `finger ${a.finger} is at fret ${a.fret} and fret ${b.fret} at the same time`,
            b,
          ),
        );
        continue;
      }
      if (a.finger === b.finger) continue;

      // [V-04] the index finger is always nearest the nut.
      const fa = Number(a.finger);
      const fb = Number(b.finger);
      if (Number.isFinite(fa) && Number.isFinite(fb)) {
        if ((a.fret < b.fret && fa > fb) || (b.fret < a.fret && fb > fa)) {
          issues.push(
            problem(
              'V-04',
              `finger ${a.finger} at fret ${a.fret} is behind finger ${b.finger} at fret ${b.fret}`,
              b,
            ),
          );
        }
      }

      // [V-05] and the hand only stretches so far.
      const limit = spanLimit(context.leftHand, a.finger as LHFinger, b.finger as LHFinger);
      const writtenStretch =
        context.tabInfeasibleNoteIds.has(a.noteId) || context.tabInfeasibleNoteIds.has(b.noteId);
      if (limit !== undefined && a.fret > 0 && b.fret > 0 && !writtenStretch) {
        const distance = fingertipDistanceMm(
          fingertipPoint(context.instrument, context.geometry, a.string, a.fret),
          fingertipPoint(context.instrument, context.geometry, b.string, b.fret),
        ).distanceMm;
        const allowed =
          context.relaxedNoteIds.has(a.noteId) || context.relaxedNoteIds.has(b.noteId)
            ? limit.max * context.relaxSpanFactor
            : limit.max;
        if (distance > allowed + 1e-6) {
          issues.push(
            problem(
              'V-05',
              `fingers ${a.finger} and ${b.finger} are ${distance.toFixed(0)} mm apart, past ${allowed.toFixed(0)} mm`,
              b,
            ),
          );
        }
      }
    }

    // [V-07] the finger is on the string before the note sounds, and
    // stays while it sounds. A dot that arrives late has already been
    // seen by the viewer as a mistake.
    if (a.finger !== null && a.fret > 0) {
      const track = timeline.leftHand.fingers[a.finger] ?? [];
      const press = track.find((frame) => frame.noteId === a.noteId);
      if (press === undefined) {
        issues.push(
          problem(
            'V-07',
            `note ${a.noteId} has no keyframe where finger ${a.finger} presses it`,
            a,
          ),
        );
      } else {
        if (press.t > a.time + 1e-6) {
          issues.push(
            problem('V-07', `finger ${a.finger} arrives after note ${a.noteId} has sounded`, a),
          );
        }
        const holdUntil = a.time + Math.min(a.duration, 0.05);
        const release = track.find((frame) => frame.t > press.t && !frame.pressed);
        if (release !== undefined && release.t < holdUntil - 1e-6) {
          issues.push(
            problem('V-07', `finger ${a.finger} leaves note ${a.noteId} before it has sounded`, a),
          );
        }
      }
    }
  }

  // [V-10] every note is either picked or sounded by the left hand,
  // and exactly one of the two.
  const picked = new Map<string, number>();
  for (const event of timeline.rightHand.events) {
    for (const noteId of event.noteIds) picked.set(noteId, (picked.get(noteId) ?? 0) + 1);
  }
  for (const note of notes) {
    const source = context.sourceNotes.get(note.noteId);
    const legato = source !== undefined && isLegatoTarget(source);
    const count = picked.get(note.noteId) ?? 0;
    if (legato && count > 0) {
      issues.push(
        problem('V-10', `note ${note.noteId} is sounded by the left hand but also picked`, note),
      );
    } else if (!legato && count !== 1) {
      issues.push(
        problem('V-10', `note ${note.noteId} has ${count} right-hand events, expected one`, note),
      );
    }
  }

  return issues;
}

function problem(rule: string, message: string, note: TimelineNote): ValidationIssue {
  return { rule, severity: 'error', message, noteId: note.noteId, time: note.time };
}
