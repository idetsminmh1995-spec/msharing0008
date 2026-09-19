import type { ArticulationType, BeamHint, LyricSyllable, OrnamentType } from '../../core/note.js';
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

export interface ParsedNotations {
  readonly articulations: readonly ArticulationType[];
  readonly ornaments: readonly OrnamentType[];
  readonly hasFermata: boolean;
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
      case 'fermata':
        hasFermata = true;
        break;
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
