import type { DurationType } from '../../core/duration.js';
import { durationTypeAndDotsFromTicks, xmlDivisionsToTicks } from '../../core/duration-math.js';
import type { PitchStep } from '../../core/pitch.js';
import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { childrenNamed, firstChildNamed, intOf, textOf } from './dom-helpers.js';

const KNOWN_DURATION_TYPES: ReadonlySet<string> = new Set([
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th',
  '32nd',
  '64th',
  '128th',
  '256th',
  '512th',
  '1024th',
]);

function isKnownDurationType(value: string): value is DurationType {
  return KNOWN_DURATION_TYPES.has(value);
}

const KNOWN_STEPS: ReadonlySet<string> = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

function isKnownStep(value: string): value is PitchStep {
  return KNOWN_STEPS.has(value);
}

export interface ParsedNoteEvent {
  readonly isRest: boolean;
  readonly isChordMember: boolean;
  readonly isUnsupported: boolean;
  readonly voice: number;
  readonly staff?: number;
  readonly ticks: number;
  readonly durationType: DurationType;
  readonly dots: number;
  readonly tieStart: boolean;
  readonly tieStop: boolean;
  readonly step?: PitchStep;
  readonly alter?: number;
  readonly octave?: number;
}

/**
 * Parses one `<note>` element. Never throws (§10.7): a missing/unrecognized
 * `<type>` is derived from `<duration>` via Phase 4's
 * `durationTypeAndDotsFromTicks`; a missing `<duration>` falls back to one
 * quarter note's worth of ticks; a note that is neither `<pitch>` nor
 * `<rest>` (i.e. `<unpitched>`, which is v2-only per §10.4) is marked
 * `isUnsupported` so the caller can skip it while still advancing past it
 * correctly.
 */
export function parseNoteElement(
  noteEl: Element,
  currentDivisions: number,
  location: DiagnosticLocation,
): { event: ParsedNoteEvent; diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];

  const isChordMember = firstChildNamed(noteEl, 'chord') !== undefined;
  const isRest = firstChildNamed(noteEl, 'rest') !== undefined;
  const pitchEl = firstChildNamed(noteEl, 'pitch');
  const isUnsupported = !isRest && pitchEl === undefined;

  const voice = intOf(firstChildNamed(noteEl, 'voice')) ?? 1;
  const staff = intOf(firstChildNamed(noteEl, 'staff'));

  const rawDuration = intOf(firstChildNamed(noteEl, 'duration'));
  let ticks: number;
  if (rawDuration === undefined) {
    diagnostics.push(
      diagnostic(
        'warning',
        'MISSING_DURATION',
        'Note has no <duration>; assuming one quarter note.',
        location,
      ),
    );
    ticks = xmlDivisionsToTicks(currentDivisions, currentDivisions); // one quarter note's ticks
  } else {
    ticks = xmlDivisionsToTicks(rawDuration, currentDivisions);
  }

  const dots = childrenNamed(noteEl, 'dot').length;
  const rawType = textOf(firstChildNamed(noteEl, 'type'));
  let durationType: DurationType;
  if (rawType !== undefined && isKnownDurationType(rawType)) {
    durationType = rawType;
  } else {
    if (rawType !== undefined) {
      diagnostics.push(
        diagnostic(
          'warning',
          'UNKNOWN_DURATION_TYPE',
          `Unknown <type> "${rawType}"; deriving from duration.`,
          location,
        ),
      );
    }
    const derived = durationTypeAndDotsFromTicks(ticks);
    durationType = derived?.type ?? 'quarter';
  }

  const tieEls = childrenNamed(noteEl, 'tie');
  const tieStart = tieEls.some((el) => el.getAttribute('type') === 'start');
  const tieStop = tieEls.some((el) => el.getAttribute('type') === 'stop');

  let step: PitchStep | undefined;
  let alter: number | undefined;
  let octave: number | undefined;
  if (pitchEl !== undefined) {
    const rawStep = textOf(firstChildNamed(pitchEl, 'step'));
    if (rawStep !== undefined && isKnownStep(rawStep)) {
      step = rawStep;
    } else {
      diagnostics.push(
        diagnostic(
          'error',
          'INVALID_PITCH_STEP',
          `Invalid or missing <step> "${rawStep ?? ''}".`,
          location,
        ),
      );
    }
    alter = intOf(firstChildNamed(pitchEl, 'alter')) ?? 0;
    octave = intOf(firstChildNamed(pitchEl, 'octave'));
    if (octave === undefined) {
      diagnostics.push(
        diagnostic('error', 'MISSING_OCTAVE', 'Pitched note has no <octave>.', location),
      );
      octave = 4;
    }
  }

  const event: ParsedNoteEvent = {
    isRest,
    isChordMember,
    isUnsupported,
    voice,
    ...(staff !== undefined ? { staff } : {}),
    ticks,
    durationType,
    dots,
    tieStart,
    tieStop,
    ...(step !== undefined ? { step } : {}),
    ...(alter !== undefined ? { alter } : {}),
    ...(octave !== undefined ? { octave } : {}),
  };

  return { event, diagnostics };
}
