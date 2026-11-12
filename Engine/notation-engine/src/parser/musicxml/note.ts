import type { DurationType } from '../../core/duration.js';
import type { BeamHint, LyricSyllable } from '../../core/note.js';
import { durationTypeAndDotsFromTicks, xmlDivisionsToTicks } from '../../core/duration-math.js';
import type { PitchStep } from '../../core/pitch.js';
import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { attrOf, childrenNamed, firstChildNamed, intOf, numberOf, textOf } from './dom-helpers.js';
import { parseBeamHints, parseLyrics, parseNotations, type ParsedNotations } from './notations.js';
import {
  isKnownAccidentalGlyphName,
  musicXmlAccidentalGlyphName,
  tryAccidentalGlyphName,
} from '../../geometry/accidental.js';
import { isKnownMusicXmlNotehead, isKnownSmuflNoteheadGlyphName } from '../../geometry/notehead.js';

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

export function isKnownDurationType(value: string): value is DurationType {
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
  /** True when that `<unpitched>` carried both a `<display-step>` and a `<display-octave>` -- see `Note.hasExplicitDisplayPosition`. */
  readonly hasExplicitDisplayPosition?: boolean;
  /** The <instrument id="..."> this note references, if any -- how a drum file distinguishes kick from snare from hi-hat. */
  readonly instrumentId?: string;
  /** §10.4/Phase 35: an explicit <notehead> override (e.g. "x", "diamond") -- feeds Phase 15's selectNoteheadGlyphName as its highest-priority tier. */
  readonly explicitNotehead?: string;
  /** That <notehead>'s own `smufl` attribute -- what MusicXML's `other` value carries its real shape in (`<notehead smufl="noteheadHeavyXHat">other</notehead>`). */
  readonly explicitNoteheadSmufl?: string;
  readonly noteheadFilled?: boolean;
  readonly noteheadParentheses?: boolean;
  /** MusicXML <cue/> presence; cue notes do not alter playback timing. */
  readonly isCue: boolean;
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
  /** Exact bundled SMuFL glyph selected by MusicXML's accidental value or smufl attribute. */
  readonly accidentalGlyphName?: string;
  readonly accidentalParentheses?: boolean;
  readonly accidentalBracket?: boolean;
  readonly restDisplayStep?: PitchStep;
  readonly restDisplayOctave?: number;
  /** Integration C: <notations><technical><string> -- which string a tab note is played on (1 = highest-pitched). */
  readonly stringNumber?: number;
  /** Integration C: <notations><technical><fret> -- which fret, 0 meaning an open string. */
  readonly fret?: number;
  /**
   * `<notations><technical><fingering>` -- which finger stops the note,
   * as the file numbers them: 1 index, 2 middle, 3 ring, 4 little, and
   * 0 (or "0") an open string.
   *
   * Read because a score that WRITES a fingering has already answered
   * the question, and no engine's guess should overrule the composer.
   * Absent when the file says nothing, which is most of the time.
   */
  readonly fingering?: number;
  /**
   * `<notations><slide>` / `<glissando>` -- this note slides to or from
   * another.
   *
   * A guitar slide is one finger travelling along a string, so the
   * position it draws is not a fret but a fret MOVING. Which fret it
   * arrives at is the next note's, so a renderer needs both ends: this
   * says which end this note is.
   */
  readonly slideStart?: boolean;
  readonly slideStop?: boolean;
  readonly slideStartKind?: 'slide' | 'glissando';
  readonly slideStopKind?: 'slide' | 'glissando';
  /** Phase 35 Tier 2/§10.4: this note's parsed <notations> -- articulations, ornaments, fermata, slur endpoints, tuplet endpoints. */
  readonly notations: ParsedNotations;
  /** Phase 35 Tier 2/§10.4/§10.8: the file's own <beam> hints for this note, empty when it gave none. */
  readonly beams: readonly BeamHint[];
  /** Phase 35 Tier 2/§10.4: this note's <lyric> syllables (§9.22), empty when it has none. */
  readonly lyrics: readonly LyricSyllable[];
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
  const isCue = firstChildNamed(noteEl, 'cue') !== undefined;

  // §10.7/Phase 38: a non-positive <divisions> (0, or -- in principle,
  // though never legally negative per the spec -- a negative value from
  // a genuinely malformed file) would make xmlDivisionsToTicks divide by
  // zero or invert every duration. Recovered here, at the boundary where
  // untrusted file data meets that function's own strict contract,
  // rather than by weakening xmlDivisionsToTicks itself -- its callers
  // elsewhere in this codebase pass only already-validated values and
  // should keep getting a hard failure if THEY misuse it.
  let safeDivisions = currentDivisions;
  if (safeDivisions <= 0) {
    diagnostics.push(
      diagnostic(
        'warning',
        'INVALID_DIVISIONS',
        `<divisions> must be positive, got ${safeDivisions}; assuming 1.`,
        location,
      ),
    );
    safeDivisions = 1;
  }

  const rawDuration = numberOf(firstChildNamed(noteEl, 'duration'));
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
    ticks = xmlDivisionsToTicks(safeDivisions, safeDivisions); // one quarter note's ticks
  } else {
    ticks = xmlDivisionsToTicks(rawDuration, safeDivisions);
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
  // Integration C: tablature places a note by STRING and FRET, not by
  // pitch -- both live under <notations><technical>.
  const technicalEl =
    notationsEl !== undefined ? firstChildNamed(notationsEl, 'technical') : undefined;
  const stringNumber =
    technicalEl !== undefined ? intOf(firstChildNamed(technicalEl, 'string')) : undefined;
  const fret = technicalEl !== undefined ? intOf(firstChildNamed(technicalEl, 'fret')) : undefined;
  const fingering =
    technicalEl !== undefined ? intOf(firstChildNamed(technicalEl, 'fingering')) : undefined;
  // MusicXML writes a guitar slide as <slide> and a smooth one as
  // <glissando>; both are the same gesture to a fretboard, so both are
  // read into the same pair of flags.
  const slideEls =
    notationsEl !== undefined
      ? [...childrenNamed(notationsEl, 'slide'), ...childrenNamed(notationsEl, 'glissando')]
      : [];
  const slideStartEl = slideEls.find((el) => el.getAttribute('type') === 'start');
  const slideStopEl = slideEls.find((el) => el.getAttribute('type') === 'stop');
  const slideStart = slideStartEl !== undefined;
  const slideStop = slideStopEl !== undefined;
  const slideStartKind =
    slideStartEl?.tagName === 'glissando' ? 'glissando' : slideStart ? 'slide' : undefined;
  const slideStopKind =
    slideStopEl?.tagName === 'glissando' ? 'glissando' : slideStop ? 'slide' : undefined;
  const tieStart =
    tieEls.some((el) => el.getAttribute('type') === 'start') ||
    tiedEls.some((el) => el.getAttribute('type') === 'start');
  const tieStop =
    tieEls.some((el) => el.getAttribute('type') === 'stop') ||
    tiedEls.some((el) => el.getAttribute('type') === 'stop');

  // §10.4/Phase 35 additions -- each a direct child of <note>, independent
  // of whether the note is pitched/unpitched/a rest.
  const noteheadEl = firstChildNamed(noteEl, 'notehead');
  const explicitNotehead = textOf(noteheadEl);
  const explicitNoteheadSmufl = noteheadEl?.getAttribute('smufl') ?? undefined;
  if (
    explicitNoteheadSmufl !== undefined &&
    !isKnownSmuflNoteheadGlyphName(explicitNoteheadSmufl)
  ) {
    diagnostics.push(
      diagnostic(
        'warning',
        'UNKNOWN_NOTEHEAD_SMUFL',
        `Unknown or non-notehead SMuFL glyph "${explicitNoteheadSmufl}"; falling back to the MusicXML notehead value or duration default.`,
        location,
      ),
    );
  }
  const parseYesNo = (
    raw: string | undefined,
    attribute: string,
    elementName: string,
  ): boolean | undefined => {
    if (raw === undefined) return undefined;
    if (raw === 'yes') return true;
    if (raw === 'no') return false;
    diagnostics.push(
      diagnostic(
        'warning',
        'INVALID_BOOLEAN_ATTRIBUTE',
        `Invalid ${elementName} ${attribute}="${raw}"; ignoring the attribute.`,
        location,
      ),
    );
    return undefined;
  };
  const noteheadFilled = parseYesNo(
    noteheadEl === undefined ? undefined : attrOf(noteheadEl, 'filled'),
    'filled',
    '<notehead>',
  );
  const noteheadParentheses = parseYesNo(
    noteheadEl === undefined ? undefined : attrOf(noteheadEl, 'parentheses'),
    'parentheses',
    '<notehead>',
  );
  if (explicitNotehead !== undefined && !isKnownMusicXmlNotehead(explicitNotehead)) {
    // §10.7: report, never refuse. This exact check is what a real
    // MuseScore drum chart needed -- it writes `slashed` and
    // `<notehead smufl="...">other</notehead>`, and the engine used to
    // THROW on any value outside a seven-item list, taking the whole
    // render down over one note's head.
    diagnostics.push(
      diagnostic(
        'warning',
        'UNKNOWN_NOTEHEAD',
        `Unknown <notehead> value "${explicitNotehead}"; drawing the ordinary notehead instead.`,
        location,
      ),
    );
  }
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
  const accidentalEl = firstChildNamed(noteEl, 'accidental');
  const hasExplicitAccidental = accidentalEl !== undefined;
  let accidentalParentheses = parseYesNo(
    accidentalEl === undefined ? undefined : attrOf(accidentalEl, 'parentheses'),
    'parentheses',
    '<accidental>',
  );
  let accidentalBracket = parseYesNo(
    accidentalEl === undefined ? undefined : attrOf(accidentalEl, 'bracket'),
    'bracket',
    '<accidental>',
  );
  if (accidentalParentheses === true && accidentalBracket === true) {
    diagnostics.push(
      diagnostic(
        'warning',
        'CONTRADICTORY_ACCIDENTAL_WRAPPERS',
        '<accidental> cannot request both parentheses and brackets; drawing the accidental without a wrapper.',
        location,
      ),
    );
    accidentalParentheses = undefined;
    accidentalBracket = undefined;
  }
  let accidentalGlyphName: string | undefined;
  if (accidentalEl !== undefined) {
    const accidentalValue = textOf(accidentalEl);
    const sourceAccidentalSmufl = attrOf(accidentalEl, 'smufl');
    if (sourceAccidentalSmufl !== undefined) {
      if (isKnownAccidentalGlyphName(sourceAccidentalSmufl)) {
        accidentalGlyphName = sourceAccidentalSmufl;
      } else {
        diagnostics.push(
          diagnostic(
            'warning',
            'UNKNOWN_ACCIDENTAL_SMUFL',
            `Unknown SMuFL accidental glyph "${sourceAccidentalSmufl}"; falling back to the MusicXML accidental value or pitch alteration.`,
            location,
          ),
        );
      }
    }
    if (accidentalGlyphName === undefined && accidentalValue !== undefined) {
      accidentalGlyphName = musicXmlAccidentalGlyphName(accidentalValue);
      if (accidentalGlyphName === undefined) {
        diagnostics.push(
          diagnostic(
            'warning',
            'UNSUPPORTED_ACCIDENTAL',
            `Unsupported or incomplete <accidental>${accidentalValue}</accidental>; using a supported pitch-alteration glyph when possible.`,
            location,
          ),
        );
      }
    }
    if (accidentalValue === undefined && sourceAccidentalSmufl === undefined) {
      diagnostics.push(
        diagnostic(
          'warning',
          'UNSUPPORTED_ACCIDENTAL',
          'An empty <accidental> has no symbol value; using a supported pitch-alteration glyph when possible.',
          location,
        ),
      );
    }
  }

  // §10.4 Tier 2: the rest of <notations>, plus <beam> and <lyric>.
  // Every one of these is independent of whether the note is pitched,
  // unpitched or a rest -- a rest can carry a fermata, a percussion note
  // can carry an accent -- so they are read here, before the
  // pitch/unpitched branch below, not inside it.
  const { notations, diagnostics: notationDiags } = parseNotations(noteEl, location);
  diagnostics.push(...notationDiags);
  const { beams, diagnostics: beamDiags } = parseBeamHints(noteEl, location);
  diagnostics.push(...beamDiags);
  const lyrics = parseLyrics(noteEl);

  let step: PitchStep | undefined;
  let alter: number | undefined;
  let octave: number | undefined;
  let isUnpitched = false;
  let hasExplicitDisplayPosition = false;
  let instrumentId: string | undefined;
  let restDisplayStep: PitchStep | undefined;
  let restDisplayOctave: number | undefined;
  if (isRest) {
    const restEl = firstChildNamed(noteEl, 'rest');
    const stepEl = restEl === undefined ? undefined : firstChildNamed(restEl, 'display-step');
    const octaveEl = restEl === undefined ? undefined : firstChildNamed(restEl, 'display-octave');
    if (stepEl !== undefined || octaveEl !== undefined) {
      const rawStep = textOf(stepEl);
      const rawOctave = textOf(octaveEl);
      const octave = intOf(octaveEl);
      if (
        rawStep !== undefined &&
        isKnownStep(rawStep) &&
        rawOctave !== undefined &&
        /^[-+]?\d+$/.test(rawOctave) &&
        octave !== undefined
      ) {
        restDisplayStep = rawStep;
        restDisplayOctave = octave;
      } else {
        diagnostics.push(
          diagnostic(
            'warning',
            'INVALID_REST_DISPLAY_POSITION',
            'A rest display position requires a valid <display-step> and integer <display-octave>; using its duration-based default.',
            location,
          ),
        );
      }
    }
  }
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
    const alterEl = firstChildNamed(pitchEl, 'alter');
    const parsedAlter = numberOf(alterEl);
    if (alterEl !== undefined && parsedAlter === undefined) {
      diagnostics.push(
        diagnostic(
          'warning',
          'INVALID_PITCH_ALTER',
          `Invalid decimal <alter>${textOf(alterEl) ?? ''}</alter>; assuming 0 semitones.`,
          location,
        ),
      );
    }
    alter = parsedAlter ?? 0;
    if (
      alterEl !== undefined &&
      parsedAlter !== undefined &&
      !hasExplicitAccidental &&
      tryAccidentalGlyphName(alter) === undefined
    ) {
      diagnostics.push(
        diagnostic(
          'warning',
          'UNSUPPORTED_PITCH_ALTER',
          `Pitch alteration ${alter} semitones is preserved, but no bundled accidental glyph is available; provide a supported MusicXML accidental with a SMuFL glyph.`,
          location,
        ),
      );
    }
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
    const rawOctave = textOf(firstChildNamed(unpitchedEl, 'display-octave'));
    const parsedOctave = intOf(firstChildNamed(unpitchedEl, 'display-octave'));
    // Both, or neither: half a position is not a position, and a file
    // that gives one and not the other has not said where it wants the
    // note any more than a file that gives nothing has.
    hasExplicitDisplayPosition =
      rawStep !== undefined &&
      isKnownStep(rawStep) &&
      rawOctave !== undefined &&
      /^[-+]?\d+$/.test(rawOctave) &&
      parsedOctave !== undefined;
    if (rawStep !== undefined && isKnownStep(rawStep)) {
      step = rawStep;
    } else {
      // ABSENT and WRONG are two different things here. MusicXML's own
      // DTD makes `<display-step>` optional inside `<unpitched>`, and a
      // file that leaves it out has simply not placed the note -- the
      // drum table will, which is exactly the case it exists for. A
      // value that IS there and is not a step name is a real defect in
      // the file and still an error.
      diagnostics.push(
        rawStep === undefined
          ? diagnostic(
              'info',
              'MISSING_DISPLAY_POSITION',
              'Unpitched note has no <display-step>; its staff position comes from the drum mapping.',
              location,
            )
          : diagnostic(
              'error',
              'INVALID_PITCH_STEP',
              `Invalid <display-step> "${rawStep}".`,
              location,
            ),
      );
      step = 'B'; // middle line of a treble-referenced staff -- a neutral fallback
    }
    octave = parsedOctave;
    if (octave === undefined) {
      diagnostics.push(
        rawOctave === undefined
          ? diagnostic(
              'info',
              'MISSING_DISPLAY_POSITION',
              'Unpitched note has no <display-octave>; its staff position comes from the drum mapping.',
              location,
            )
          : diagnostic(
              'error',
              'MISSING_OCTAVE',
              `Invalid <display-octave> "${rawOctave}".`,
              location,
            ),
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
    ...(hasExplicitDisplayPosition ? { hasExplicitDisplayPosition: true } : {}),
    ...(instrumentId !== undefined ? { instrumentId } : {}),
    ...(explicitNotehead !== undefined ? { explicitNotehead } : {}),
    ...(explicitNoteheadSmufl !== undefined ? { explicitNoteheadSmufl } : {}),
    ...(noteheadFilled !== undefined ? { noteheadFilled } : {}),
    ...(noteheadParentheses !== undefined ? { noteheadParentheses } : {}),
    isCue,
    isGrace,
    graceSlash,
    ...(tupletActualNotes !== undefined ? { tupletActualNotes } : {}),
    ...(tupletNormalNotes !== undefined ? { tupletNormalNotes } : {}),
    ...(explicitStemDirection !== undefined ? { explicitStemDirection } : {}),
    hasExplicitAccidental,
    ...(accidentalGlyphName !== undefined ? { accidentalGlyphName } : {}),
    ...(accidentalParentheses !== undefined ? { accidentalParentheses } : {}),
    ...(accidentalBracket !== undefined ? { accidentalBracket } : {}),
    ...(restDisplayStep !== undefined ? { restDisplayStep } : {}),
    ...(restDisplayOctave !== undefined ? { restDisplayOctave } : {}),
    ...(stringNumber !== undefined ? { stringNumber } : {}),
    ...(fingering !== undefined ? { fingering } : {}),
    ...(slideStart ? { slideStart: true } : {}),
    ...(slideStop ? { slideStop: true } : {}),
    ...(slideStartKind !== undefined ? { slideStartKind } : {}),
    ...(slideStopKind !== undefined ? { slideStopKind } : {}),
    ...(fret !== undefined ? { fret } : {}),
    notations,
    beams,
    lyrics,
  };

  return { event, diagnostics };
}
