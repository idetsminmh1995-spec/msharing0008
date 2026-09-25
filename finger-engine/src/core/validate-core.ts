/**
 * validate-core.ts — the checks that do not know about guitars
 * (Plan Part 11 §1).
 *
 * The validator re-reads the FINISHED timeline and asks whether it is
 * physically possible, independently of the solver that produced it.
 * That independence is the point: a solver bug that produces a
 * plausible-looking wrong answer is caught here, because this code
 * does not share the solver's assumptions.
 *
 * Phase 0 implements V-01 and V-08; the guitar-specific checks
 * (V-02..V-07, V-09, V-10) arrive with the phases that can break them.
 */
import type { FingerTimeline } from './timeline-schema.js';
import { FINGER_KEYS, TIMELINE_SCHEMA, TIMELINE_SCHEMA_VERSION } from './timeline-schema.js';

export interface ValidationIssue {
  /** The rule's own ID, so a failure points at the plan. */
  readonly rule: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly noteId?: string;
  readonly time?: number;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

function finite(...values: number[]): boolean {
  return values.every((value) => Number.isFinite(value));
}

/**
 * [V-01] Every note sounds the pitch it claims.
 *
 * `tuning[string] + fret === pitch`. This is the check that catches a
 * string-numbering mistake, which is the one bug in this engine that
 * would look completely normal in the output and completely wrong in
 * the video.
 */
export function checkPitches(timeline: FingerTimeline): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { tuning, numStrings } = timeline.instrument;
  for (const note of timeline.notes) {
    if (note.string < 1 || note.string > numStrings) {
      issues.push({
        rule: 'V-01',
        severity: 'error',
        message: `note ${note.noteId} is on string ${note.string}, which this instrument does not have`,
        noteId: note.noteId,
        time: note.time,
      });
      continue;
    }
    const open = tuning[note.string - 1];
    if (open === undefined) continue;
    if (open + note.fret !== note.pitch) {
      issues.push({
        rule: 'V-01',
        severity: 'error',
        message:
          `note ${note.noteId} says pitch ${note.pitch}, but string ${note.string} ` +
          `fret ${note.fret} sounds ${open + note.fret}`,
        noteId: note.noteId,
        time: note.time,
      });
    }
  }
  return issues;
}

/**
 * [V-08] Keyframes go forward in time, and nothing is NaN.
 *
 * A NaN in a keyframe does not crash anything: it draws a finger
 * nowhere, silently, for one frame of a published video. Catching it
 * here is the whole reason this check exists.
 */
export function checkKeyframes(timeline: FingerTimeline): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const key of FINGER_KEYS) {
    const frames = timeline.leftHand.fingers[key] ?? [];
    let previous = -Infinity;
    for (const frame of frames) {
      if (
        !finite(frame.t, frame.string, frame.fret) ||
        (frame.bend !== undefined && !finite(frame.bend))
      ) {
        issues.push({
          rule: 'V-08',
          severity: 'error',
          message: `finger ${key} has a keyframe with a value that is not a number`,
          ...(Number.isFinite(frame.t) ? { time: frame.t } : {}),
        });
        continue;
      }
      if (frame.t <= previous) {
        issues.push({
          rule: 'V-08',
          severity: 'error',
          message: `finger ${key} has keyframes out of order at t=${frame.t}`,
          time: frame.t,
        });
      }
      previous = frame.t;
    }
  }

  let previousHand = -Infinity;
  for (const frame of timeline.leftHand.hand) {
    if (!finite(frame.t, frame.fret)) {
      issues.push({ rule: 'V-08', severity: 'error', message: 'a hand keyframe is not a number' });
      continue;
    }
    if (frame.t <= previousHand) {
      issues.push({
        rule: 'V-08',
        severity: 'error',
        message: `hand keyframes out of order at t=${frame.t}`,
        time: frame.t,
      });
    }
    previousHand = frame.t;
  }

  for (const note of timeline.notes) {
    if (!finite(note.time, note.duration, note.pitch, note.string, note.fret, note.confidence)) {
      issues.push({
        rule: 'V-08',
        severity: 'error',
        message: `note ${note.noteId} carries a value that is not a number`,
        noteId: note.noteId,
      });
    }
  }
  return issues;
}

/** The schema a reader is being handed is the one it knows. */
export function checkSchema(timeline: FingerTimeline): readonly ValidationIssue[] {
  if (timeline.schema !== TIMELINE_SCHEMA || timeline.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
    return [
      {
        rule: 'OUT-00',
        severity: 'error',
        message: `timeline is ${String(timeline.schema)}@${String(timeline.schemaVersion)}, expected ${TIMELINE_SCHEMA}@${TIMELINE_SCHEMA_VERSION}`,
      },
    ];
  }
  return [];
}

/**
 * Every core check, in one call.
 *
 * In tests a failure is a bug; in production the caller turns the
 * issues into a `VALIDATION_FAILED` warning rather than throwing, so
 * a questionable fingering still renders instead of losing the video.
 */
export function validateCore(timeline: FingerTimeline): ValidationResult {
  const issues = [...checkSchema(timeline), ...checkPitches(timeline), ...checkKeyframes(timeline)];
  return { ok: issues.every((issue) => issue.severity !== 'error'), issues };
}
