import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import {
  attrOf,
  childElements,
  childrenNamed,
  firstChildNamed,
  intOf,
  textOf,
} from './dom-helpers.js';

/**
 * Phase 35 Tier 2/§10.4 -- `<direction>`'s own sub-elements, the v2
 * elements that attach to a measure POSITION rather than to any single
 * note: `<dynamics>`, `<wedge>`, `<words>` and `<rehearsal>`.
 * (`<metronome>` is deliberately NOT here: Integration D already owns it
 * in `parse.ts`, feeding the `tempoMarks` side-table, and moving it now
 * would churn working code for no gain.)
 *
 * Per §4.1 the parser depends on `core/` only, so the level/kind unions
 * below are declared structurally here rather than imported from
 * `geometry/` -- the same explicitly-documented arrangement
 * `config/config.ts` already uses for `DrumMapEntryOverride`. They are
 * written to match `geometry/dynamic.ts`'s `DynamicLevel` and
 * `geometry/hairpin.ts`'s `HairpinKind` exactly, so a renderer can pass
 * one straight to the other with no cast.
 */

/** Structurally identical to `geometry/dynamic.ts`'s `DynamicLevel` -- see this file's header. */
export type ParsedDynamicLevel = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz';

/** 'crescendo'/'decrescendo' are structurally identical to `geometry/hairpin.ts`'s `HairpinKind`; 'stop' is this parser's own marker for the wedge's closing element, which has no geometry of its own. */
export type ParsedWedgeType = 'crescendo' | 'decrescendo' | 'stop';

export interface ParsedWedge {
  readonly type: ParsedWedgeType;
  /** From the element's `number` attribute, defaulting to 1 -- how two overlapping wedges stay distinguishable. */
  readonly number: number;
}

export interface ParsedDirectionContent {
  readonly dynamics: readonly ParsedDynamicLevel[];
  readonly wedges: readonly ParsedWedge[];
  /** `<words>` text, preserved though §9.21 cannot draw arbitrary text yet (no text-font system) -- §10.7's no-silent-loss rule. */
  readonly words: readonly string[];
  /** `<rehearsal>` text, preserved for the same reason as `words`. */
  readonly rehearsals: readonly string[];
  /** `<sound tempo="...">` -- a playback tempo with no `<beat-unit>`; MusicXML defines it as quarter-notes per minute. */
  readonly soundTempo?: number;
}

const DYNAMIC_ELEMENTS: Readonly<Record<string, ParsedDynamicLevel>> = {
  ppp: 'ppp',
  pp: 'pp',
  p: 'p',
  mp: 'mp',
  mf: 'mf',
  f: 'f',
  ff: 'ff',
  fff: 'fff',
  sfz: 'sfz',
};

const WEDGE_TYPES: Readonly<Record<string, ParsedWedgeType>> = {
  crescendo: 'crescendo',
  // MusicXML's own name for the closing wedge is "diminuendo"; §9.21's
  // geometry calls the same shape "decrescendo". Two names, one mark --
  // which is why this is a table, not a cast.
  diminuendo: 'decrescendo',
  stop: 'stop',
};

function numberAttr(el: Element): number {
  const raw = attrOf(el, 'number');
  if (raw === undefined) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? 1 : n;
}

/** `<sound tempo="...">` as a positive number, or undefined. Accepts a decimal (the spec's own type is a decimal, not an integer). */
export function parseSoundTempo(soundEl: Element): number | undefined {
  const raw = attrOf(soundEl, 'tempo');
  if (raw === undefined) return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Parses one `<direction>`'s recognized content. `<metronome>` is skipped
 * silently here (its own caller handles it); anything genuinely
 * unrecognized becomes an `info` diagnostic naming it, per §10.7.
 */
export function parseDirectionElement(
  directionEl: Element,
  location: DiagnosticLocation,
): { content: ParsedDirectionContent; diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const dynamics: ParsedDynamicLevel[] = [];
  const wedges: ParsedWedge[] = [];
  const words: string[] = [];
  const rehearsals: string[] = [];

  for (const directionTypeEl of childrenNamed(directionEl, 'direction-type')) {
    for (const el of childElements(directionTypeEl)) {
      switch (el.tagName) {
        case 'dynamics':
          for (const child of childElements(el)) {
            const level = DYNAMIC_ELEMENTS[child.tagName];
            if (level !== undefined) {
              dynamics.push(level);
            } else {
              diagnostics.push(
                diagnostic(
                  'info',
                  'UNSUPPORTED_DYNAMIC',
                  `Ignored <dynamics><${child.tagName}>; §9.21 supports ppp, pp, p, mp, mf, f, ff, fff and sfz.`,
                  location,
                ),
              );
            }
          }
          break;
        case 'wedge': {
          const rawType = attrOf(el, 'type');
          const mapped = rawType !== undefined ? WEDGE_TYPES[rawType] : undefined;
          if (mapped !== undefined) {
            wedges.push({ type: mapped, number: numberAttr(el) });
          } else if (rawType !== 'continue') {
            // 'continue' is a legal mid-wedge marker that neither starts
            // nor ends the span -- §9.21 draws only the two endpoints, so
            // it needs no record and is not "unsupported".
            diagnostics.push(
              diagnostic(
                'info',
                'UNSUPPORTED_WEDGE',
                `Ignored <wedge type="${rawType ?? ''}">; expected crescendo, diminuendo or stop.`,
                location,
              ),
            );
          }
          break;
        }
        case 'words': {
          const text = textOf(el);
          if (text !== undefined && text.length > 0) words.push(text);
          break;
        }
        case 'rehearsal': {
          const text = textOf(el);
          if (text !== undefined && text.length > 0) rehearsals.push(text);
          break;
        }
        case 'metronome':
          // Owned by Integration D's own branch in parse.ts.
          break;
        default:
          diagnostics.push(
            diagnostic(
              'info',
              'UNKNOWN_ELEMENT',
              `Ignored <direction-type><${el.tagName}> (not handled by the v2 parser).`,
              location,
            ),
          );
      }
    }
  }

  const soundEl = firstChildNamed(directionEl, 'sound');
  const soundTempo = soundEl !== undefined ? parseSoundTempo(soundEl) : undefined;

  return {
    content: {
      dynamics,
      wedges,
      words,
      rehearsals,
      ...(soundTempo !== undefined ? { soundTempo } : {}),
    },
    diagnostics,
  };
}

/** `<direction staff="N">`'s staff, defaulting to 1 -- which staff of a grand staff the marking belongs under. */
export function directionStaff(directionEl: Element): number {
  return intOf(firstChildNamed(directionEl, 'staff')) ?? 1;
}

/** `<direction placement="above|below">`, if stated. §9.21's own default placement applies when it isn't. */
export function directionPlacement(directionEl: Element): 'above' | 'below' | undefined {
  const raw = attrOf(directionEl, 'placement');
  return raw === 'above' || raw === 'below' ? raw : undefined;
}
