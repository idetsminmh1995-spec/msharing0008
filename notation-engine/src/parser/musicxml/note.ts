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
  /** For a pitched note this is <pitch><step>; for an unpitched (percussion) note it is <unpitched><display-step>. */
  readonly step?: PitchStep;
  readonly alter?: number;
  /** For a pitched note this is <pitch><octave>; for an unpitched note it is <unpitched><display-octave>. */
  readonly octave?: number;
  /** True when this note came from <unpitched> rather than <pitch> -- percussion, where step/octave are a STAFF POSITION, not a sounding pitch. */
  readonly isUnpitched: boolean;
  /** The <instrument id="..."> this note references, if any -- how a drum file distinguishes kick from snare from hi-hat. */
  readonly instrumentId?: string;
  /** §10.4/Phase 35: an explicit <notehead> override (e.g. "x", "diamond") -- feeds Phase 15's selectNoteheadGlyphName as its highest-priority tier. */
  readonly explicitNotehead?: string;
  /** §10.4/Phase 35: <grace/> presence and its slash attribute -- true for an acciaccatura (slash="yes"), false for an appoggiatura. */
  readonly isGrace: boolean;
  readonly graceSlash: boolean;
  /** §10.4/Phase 35: <time-modification>'s actual-notes/normal-notes -- feeds Phase 4's applyTuplet and Phase 3's Duration.tuplet field. */
  readonly tupletActualNotes?: number;
  readonly tupletNormalNotes?: number;
  /** §10.4/Phase 35: an explicit <stem> element ('up'|'down') -- feeds Phase 16's resolveStemDirection explicitDirection tier. MusicXML's 'double'/'none' values are not directional and are left unset. */
  readonly explicitStemDirection?: 'up' | 'down';
  /** §10.4/Phase 35: an explicit <accidental> element's presence -- feeds Phase 19's evaluateAccidental hasExplicitAccidental (courtesy-accidental) parameter. */
  readonly hasExplicitAccidental: boolean;
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
  const unpitchedEl = firstChildNamed(noteEl, 'unpitched');
  // A note that is neither pitched, unpitched, nor a rest is genuinely
  // unrepresentable -- everything else now has a home.
  const isUnsupported = !isRest && pitchEl === undefined && unpitchedEl === undefined;

  const voice = intOf(firstChildNamed(noteEl, 'voice')) ?? 1;
  const staff = intOf(firstChildNamed(noteEl, 'staff'));

  // <grace/> notes must be checked before duration parsing: by MusicXML's
  // own design they legitimately have NO <duration> at all (they borrow
  // time from the adjacent main note rather than occupying any of their
  // own), so an absent <duration> here is normal, not an error -- treating
  // it as MISSING_DURATION would both warn spuriously and, worse, give
  // the grace note a full quarter note's worth of ticks, incorrectly
  // advancing the shared tick cursor as if it were a real rhythmic event.
  const isGrace = firstChildNamed(noteEl, 'grace') !== undefined;

  const rawDuration = intOf(firstChildNamed(noteEl, 'duration'));
  let ticks: number;
  if (isGrace) {
    ticks = 0;
  } else if (rawDuration === undefined) {
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

  // §10.8: real software diverges on whether a tie is encoded as <tie>
  // (the sound-level element, a direct child of <note>), <tied> (the
  // notation-level element, under <notations>), or both -- the MusicXML
  // spec's own recommended practice is to emit both together, but not
  // every real exporter reliably does. Treat either one's presence as
  // sufficient, rather than only ever reading <tie> and silently missing
  // a file that expressed the same tie only via <tied>.
  const tieEls = childrenNamed(noteEl, 'tie');
  const notationsEl = firstChildNamed(noteEl, 'notations');
  const tiedEls = notationsEl !== undefined ? childrenNamed(notationsEl, 'tied') : [];
  const tieStart =
    tieEls.some((el) => el.getAttribute('type') === 'start') ||
    tiedEls.some((el) => el.getAttribute('type') === 'start');
  const tieStop =
    tieEls.some((el) => el.getAttribute('type') === 'stop') ||
    tiedEls.some((el) => el.getAttribute('type') === 'stop');

  // §10.4/Phase 35 additions -- each a direct child of <note>, independent
  // of whether the note is pitched/unpitched/a rest.
  const explicitNotehead = textOf(firstChildNamed(noteEl, 'notehead'));
  const graceEl = firstChildNamed(noteEl, 'grace');
  const graceSlash = graceEl?.getAttribute('slash') === 'yes';
  const timeModEl = firstChildNamed(noteEl, 'time-modification');
  const tupletActualNotes =
    timeModEl !== undefined ? intOf(firstChildNamed(timeModEl, 'actual-notes')) : undefined;
  const tupletNormalNotes =
    timeModEl !== undefined ? intOf(firstChildNamed(timeModEl, 'normal-notes')) : undefined;
  const rawStemText = textOf(firstChildNamed(noteEl, 'stem'));
  const explicitStemDirection =
    rawStemText === 'up' || rawStemText === 'down' ? rawStemText : undefined;
  const hasExplicitAccidental = firstChildNamed(noteEl, 'accidental') !== undefined;

  let step: PitchStep | undefined;
  let alter: number | undefined;
  let octave: number | undefined;
  let isUnpitched = false;
  let instrumentId: string | undefined;
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
  } else if (unpitchedEl !== undefined) {
    // Percussion: <display-step>/<display-octave> say where on the staff
    // the notehead goes, NOT what pitch sounds -- exactly the distinction
    // Phase 3's UnpitchedPitch models. Same recovery rules as a pitched
    // note so a malformed drum file degrades identically.
    isUnpitched = true;
    const rawStep = textOf(firstChildNamed(unpitchedEl, 'display-step'));
    if (rawStep !== undefined && isKnownStep(rawStep)) {
      step = rawStep;
    } else {
      diagnostics.push(
        diagnostic(
          'error',
          'INVALID_PITCH_STEP',
          `Invalid or missing <display-step> "${rawStep ?? ''}".`,
          location,
        ),
      );
      step = 'B'; // middle line of a treble-referenced staff -- a neutral fallback
    }
    octave = intOf(firstChildNamed(unpitchedEl, 'display-octave'));
    if (octave === undefined) {
      diagnostics.push(
        diagnostic('error', 'MISSING_OCTAVE', 'Unpitched note has no <display-octave>.', location),
      );
      octave = 4;
    }
    // <instrument id="..."> links this note to the part's own instrument
    // list, which is how a drum file distinguishes kick from snare from
    // hi-hat. Kept as the raw id; mapping it to a notehead shape is the
    // caller's job via Phase 15's notehead mapping.
    const instrumentEl = firstChildNamed(noteEl, 'instrument');
    instrumentId = instrumentEl?.getAttribute('id') ?? undefined;
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
    isUnpitched,
    ...(instrumentId !== undefined ? { instrumentId } : {}),
    ...(explicitNotehead !== undefined ? { explicitNotehead } : {}),
    isGrace,
    graceSlash,
    ...(tupletActualNotes !== undefined ? { tupletActualNotes } : {}),
    ...(tupletNormalNotes !== undefined ? { tupletNormalNotes } : {}),
    ...(explicitStemDirection !== undefined ? { explicitStemDirection } : {}),
    hasExplicitAccidental,
  };

  return { event, diagnostics };
}
