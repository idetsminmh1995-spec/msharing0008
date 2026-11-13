import type {
  ArpeggioDirection,
  ArticulationType,
  BeamHint,
  FermataPlacement,
  FermataShape,
  LyricSyllable,
  OrnamentType,
  TremoloType,
} from '../../core/note.js';
import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { attrOf, childElements, childrenNamed, firstChildNamed, textOf } from './dom-helpers.js';

/**
 * Phase 35 Tier 2/§10.4 -- every v2 element that hangs off a single
 * `<note>`: its `<notations>` subtree (slurs, tuplets, articulations,
 * ornaments, fermata), its `<beam>` hints, and its `<lyric>` syllables.
 * Grouped in one file because they share exactly one property that
 * matters here: each is read from a `<note>` element and attaches to the
 * `Note` that element produces. Measure-level v2 elements
 * (`<direction>`, `<harmony>`, `<print>`) live in their own files, since
 * they attach to no note at all.
 *
 * Per §10.7, nothing here ever throws and nothing is silently dropped: a
 * recognized element becomes data, an unrecognized one becomes an `info`
 * diagnostic naming it.
 */

/**
 * MusicXML's own element names for §9.19's five articulations. Note
 * `strong-accent` -> `marcato`: those are the same mark under two names
 * (MusicXML calls the wedge "strong-accent", engraving convention calls
 * it "marcato"), which is exactly why this is a table and not a cast.
 */
const ARTICULATION_BY_ELEMENT: Readonly<Record<string, ArticulationType>> = {
  accent: 'accent',
  'strong-accent': 'marcato',
  staccato: 'staccato',
  tenuto: 'tenuto',
  staccatissimo: 'staccatissimo',
};

/**
 * MusicXML's own element names for §9.20's four ornaments.
 * `inverted-mordent` is deliberately absent: §9.20 records that no simple
 * inverted-mordent glyph exists in this SMuFL build, so mapping it to the
 * plain `mordent` glyph would draw a different ornament than the file
 * asked for. It falls through to the UNSUPPORTED_ORNAMENT diagnostic
 * below instead.
 */
const ORNAMENT_BY_ELEMENT: Readonly<Record<string, OrnamentType>> = {
  'trill-mark': 'trill',
  mordent: 'mordent',
  turn: 'turn',
  'inverted-turn': 'turnInverted',
};

const BEAM_VALUES: ReadonlySet<string> = new Set([
  'begin',
  'continue',
  'end',
  'forward hook',
  'backward hook',
]);

const SYLLABIC_VALUES: ReadonlySet<string> = new Set(['single', 'begin', 'middle', 'end']);

/**
 * Phase 56/§9.24: the most strokes a tremolo can be drawn with.
 *
 * MusicXML allows 0-8, and a file really does use 4 for a measured
 * sixteenth roll. Bravura ships `tremolo1`-`tremolo3` and nothing above,
 * so a 4-or-more stroke tremolo is drawn with 3 and says so, rather than
 * silently drawing something a reader would count wrong.
 */
export const MAX_TREMOLO_STROKES = 3;

export interface ParsedNotations {
  readonly articulations: readonly ArticulationType[];
  readonly ornaments: readonly OrnamentType[];
  readonly hasFermata: boolean;
  /** Phase 56/§9.24: `<tremolo>` stroke count, 1-3, when the note has one. */
  readonly tremoloStrokes?: number;
  /** Phase 56/§9.24: `<tremolo type>`; omitted means `single`. */
  readonly tremoloType?: TremoloType;
  /** Phase 56/§9.26: `<harmonic>` present -- the note is drawn with a diamond head. */
  readonly isHarmonic: boolean;
  /** Phase 56/§9.25: `<arpeggiate direction>`, when the note's chord is rolled. */
  readonly arpeggiate?: ArpeggioDirection;
  /** Phase 56/§9.25: `<non-arpeggiate>` present -- the chord is bracketed as not rolled. */
  readonly nonArpeggiate: boolean;
  readonly fermataPlacement?: FermataPlacement;
  readonly fermataShape?: FermataShape;
  /** `<slur type="start">` numbers beginning at this note. A slur with no `number` attribute is number 1, per MusicXML's own default. */
  readonly slurStarts: readonly number[];
  readonly slurStops: readonly number[];
  readonly tupletStart: boolean;
  readonly tupletStop: boolean;
}

const EMPTY_NOTATIONS: ParsedNotations = {
  articulations: [],
  ornaments: [],
  hasFermata: false,
  isHarmonic: false,
  nonArpeggiate: false,
  slurStarts: [],
  slurStops: [],
  tupletStart: false,
  tupletStop: false,
};

/** A `number` attribute as an integer, defaulting to 1 -- MusicXML's own default for `<slur>`/`<tuplet>`/`<beam>`/`<lyric>` numbering. */
function numberAttr(el: Element): number {
  const raw = attrOf(el, 'number');
  if (raw === undefined) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? 1 : n;
}

/**
 * Parses one `<note>`'s `<notations>` child, if it has one. `<tied>` and
 * `<technical>` are deliberately NOT read here -- `parseNoteElement`
 * already owns both (ties since §10.8's tie/tied divergence work,
 * string/fret since Integration C), and reading them twice in two places
 * is how the two copies eventually disagree.
 */
export function parseNotations(
  noteEl: Element,
  location: DiagnosticLocation,
): { notations: ParsedNotations; diagnostics: readonly Diagnostic[] } {
  const notationsEl = firstChildNamed(noteEl, 'notations');
  if (notationsEl === undefined) {
    return { notations: EMPTY_NOTATIONS, diagnostics: [] };
  }

  const diagnostics: Diagnostic[] = [];
  const articulations: ArticulationType[] = [];
  const ornaments: OrnamentType[] = [];
  const slurStarts: number[] = [];
  const slurStops: number[] = [];
  let hasFermata = false;
  let fermataPlacement: FermataPlacement | undefined;
  let fermataShape: FermataShape | undefined;
  let tremoloStrokes: number | undefined;
  let tremoloType: TremoloType | undefined;
  let isHarmonic = false;
  let arpeggiate: ArpeggioDirection | undefined;
  let nonArpeggiate = false;
  let tupletStart = false;
  let tupletStop = false;

  for (const el of childElements(notationsEl)) {
    switch (el.tagName) {
      case 'slur': {
        const type = attrOf(el, 'type');
        if (type === 'start') slurStarts.push(numberAttr(el));
        else if (type === 'stop') slurStops.push(numberAttr(el));
        // 'continue' needs no record: the span is defined by its start and
        // stop, and §9.16 draws only those two endpoints anyway.
        break;
      }
      case 'tuplet': {
        const type = attrOf(el, 'type');
        if (type === 'start') tupletStart = true;
        else if (type === 'stop') tupletStop = true;
        break;
      }
      case 'fermata': {
        hasFermata = true;
        const type = attrOf(el, 'type');
        if (type === undefined || type === 'upright') fermataPlacement = 'above';
        else if (type === 'inverted') fermataPlacement = 'below';
        else {
          fermataPlacement = 'above';
          diagnostics.push(
            diagnostic(
              'info',
              'UNSUPPORTED_FERMATA_TYPE',
              `Unsupported fermata type "${type}"; using the MusicXML default upright orientation.`,
              location,
            ),
          );
        }
        const shape = textOf(el)?.trim();
        if (shape === 'normal') fermataShape = 'normal';
        else if (shape !== undefined && shape !== '') {
          diagnostics.push(
            diagnostic(
              'info',
              'UNSUPPORTED_FERMATA_SHAPE',
              `Unsupported fermata shape "${shape}"; using the normal fermata glyph.`,
              location,
            ),
          );
        }
        break;
      }
      case 'articulations':
        for (const child of childElements(el)) {
          const mapped = ARTICULATION_BY_ELEMENT[child.tagName];
          if (mapped !== undefined) {
            articulations.push(mapped);
          } else {
            diagnostics.push(
              diagnostic(
                'info',
                'UNSUPPORTED_ARTICULATION',
                `Ignored <${child.tagName}>; §9.19 supports accent, staccato, tenuto, strong-accent (marcato) and staccatissimo.`,
                location,
              ),
            );
          }
        }
        break;
      case 'ornaments':
        for (const child of childElements(el)) {
          const mapped = ORNAMENT_BY_ELEMENT[child.tagName];
          if (mapped !== undefined) {
            ornaments.push(mapped);
          } else if (child.tagName !== 'accidental-mark') {
            // <accidental-mark> modifies the ornament above rather than
            // being one; naming it "unsupported ornament" would be wrong.
            diagnostics.push(
              diagnostic(
                'info',
                'UNSUPPORTED_ORNAMENT',
                `Ignored <${child.tagName}>; §9.20 supports trill-mark, mordent, turn and inverted-turn.`,
                location,
              ),
            );
          }
        }
        break;
      case 'tremolo': {
        // §9.24: the ELEMENT's text is the stroke count, not its attribute.
        // MusicXML's own default when the text is missing is 3.
        const raw = Number.parseInt(textOf(el)?.trim() ?? '', 10);
        const requested = Number.isNaN(raw) ? MAX_TREMOLO_STROKES : raw;
        const type = attrOf(el, 'type');
        tremoloType =
          type === 'start' || type === 'stop' ? type : type === 'single' ? 'single' : 'single';
        if (requested > MAX_TREMOLO_STROKES) {
          diagnostics.push(
            diagnostic(
              'info',
              'TREMOLO_STROKES_CLAMPED',
              `A <tremolo> with ${requested} strokes is drawn with ${MAX_TREMOLO_STROKES}; ` +
                'the bundled font has no glyph above three.',
              location,
            ),
          );
        }
        // A zero-stroke tremolo is not a mark at all.
        const clamped = Math.min(Math.max(requested, 1), MAX_TREMOLO_STROKES);
        if (requested > 0) tremoloStrokes = clamped;
        break;
      }
      case 'harmonic':
        // §9.26: any of <natural>, <artificial> or <base-pitch> means the
        // same thing to a reader -- a diamond head. The difference between
        // them is how the note is PRODUCED, which a fretboard shows by the
        // head alone.
        isHarmonic = true;
        break;
      case 'arpeggiate': {
        const direction = attrOf(el, 'direction');
        arpeggiate = direction === 'down' ? 'down' : 'up';
        break;
      }
      case 'non-arpeggiate':
        nonArpeggiate = true;
        break;
      case 'slide':
      case 'glissando':
        // Owned by parseNoteElement so the source kind is preserved.
        break;
      case 'tied':
      case 'technical':
        // Owned by parseNoteElement -- see this function's own doc comment.
        break;
      default:
        diagnostics.push(
          diagnostic(
            'info',
            'UNKNOWN_ELEMENT',
            `Ignored <notations><${el.tagName}> (not handled by the v2 parser).`,
            location,
          ),
        );
    }
  }

  return {
    notations: {
      articulations,
      ornaments,
      hasFermata,
      ...(tremoloStrokes !== undefined ? { tremoloStrokes } : {}),
      ...(tremoloType !== undefined ? { tremoloType } : {}),
      isHarmonic,
      ...(arpeggiate !== undefined ? { arpeggiate } : {}),
      nonArpeggiate,
      ...(fermataPlacement !== undefined ? { fermataPlacement } : {}),
      ...(fermataShape !== undefined ? { fermataShape } : {}),
      slurStarts,
      slurStops,
      tupletStart,
      tupletStop,
    },
    diagnostics,
  };
}

/**
 * Parses a `<note>`'s own `<beam>` hints (§10.4/§10.8). An unrecognized
 * value is dropped WITH a diagnostic rather than guessed at -- a wrong
 * beam hint silently changes how the music is grouped, which is a
 * musical error, not a cosmetic one.
 */
export function parseBeamHints(
  noteEl: Element,
  location: DiagnosticLocation,
): { beams: readonly BeamHint[]; diagnostics: readonly Diagnostic[] } {
  const els = childrenNamed(noteEl, 'beam');
  if (els.length === 0) return { beams: [], diagnostics: [] };

  const diagnostics: Diagnostic[] = [];
  const beams: BeamHint[] = [];
  for (const el of els) {
    const value = textOf(el);
    if (value !== undefined && BEAM_VALUES.has(value)) {
      beams.push({ number: numberAttr(el), value: value as BeamHint['value'] });
    } else {
      diagnostics.push(
        diagnostic(
          'info',
          'UNSUPPORTED_BEAM_VALUE',
          `Ignored <beam>${value ?? ''}</beam>; expected begin, continue, end, forward hook or backward hook.`,
          location,
        ),
      );
    }
  }
  return { beams, diagnostics };
}

/**
 * Parses a `<note>`'s `<lyric>` syllables (§9.22/§10.4). A `<lyric>` with
 * no `<text>` at all (a bare `<extend/>` continuing a previous melisma is
 * the common real case) is kept with an empty string rather than dropped,
 * so the extend flag itself survives -- §10.7's no-silent-loss rule.
 */
export function parseLyrics(noteEl: Element): readonly LyricSyllable[] {
  const els = childrenNamed(noteEl, 'lyric');
  if (els.length === 0) return [];

  const lyrics: LyricSyllable[] = [];
  for (const el of els) {
    // A word split across notes can legally carry several <syllabic>/<text>
    // pairs in one <lyric> (an elision); joining their text keeps the
    // syllable whole instead of silently keeping only the first piece.
    const text = childrenNamed(el, 'text')
      .map((t) => textOf(t) ?? '')
      .join('');
    const rawSyllabic = textOf(firstChildNamed(el, 'syllabic'));
    const syllabic =
      rawSyllabic !== undefined && SYLLABIC_VALUES.has(rawSyllabic)
        ? (rawSyllabic as LyricSyllable['syllabic'])
        : undefined;
    lyrics.push({
      number: numberAttr(el),
      ...(syllabic !== undefined ? { syllabic } : {}),
      text,
      extend: firstChildNamed(el, 'extend') !== undefined,
    });
  }
  return lyrics;
}
