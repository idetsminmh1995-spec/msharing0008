import type { PitchStep } from '../../core/pitch.js';
import { attrOf, firstChildNamed, intOf, textOf } from './dom-helpers.js';

/**
 * Phase 35 Tier 2/§10.4 -- `<harmony>` (lead-sheet chord symbols).
 *
 * **Parsed and preserved, deliberately not reduced.** §9.23's own stated
 * limitation is that a chord symbol cannot be RENDERED yet: Bravura has
 * no Latin letters, so the root letter (and a slash bass note) cannot be
 * drawn, and §9.23 says in as many words that assembly logic is
 * "meaningless to build before the root letter itself can be drawn."
 *
 * That makes the `<kind>` mapping question important to get right *by not
 * answering it*. Collapsing e.g. `minor-seventh` onto §9.23's `minor`
 * quality glyph would draw "Cm" for a file that says "Cm7" -- a silent
 * musical error, exactly what §10.7 forbids. So the raw kind string is
 * carried through untouched, and the decision of what can be drawn from
 * it is left to whichever later phase builds the text-font system §9.21/
 * §9.22/§9.23 all three wait on.
 */
export interface ParsedHarmony {
  readonly rootStep?: PitchStep;
  /** `<root-alter>`: -1 = flat, 1 = sharp, 0/absent = natural. */
  readonly rootAlter: number;
  /** The raw `<kind>` text exactly as the file wrote it (e.g. "minor-seventh", "half-diminished"). */
  readonly kind?: string;
  /** `<kind text="...">` -- the exact display text the file wants (e.g. "m7"), when it states one. */
  readonly kindText?: string;
  readonly bassStep?: PitchStep;
  readonly bassAlter: number;
}

const STEPS: ReadonlySet<string> = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);

function stepOf(parent: Element | undefined, childName: string): PitchStep | undefined {
  if (parent === undefined) return undefined;
  const raw = textOf(firstChildNamed(parent, childName));
  return raw !== undefined && STEPS.has(raw) ? (raw as PitchStep) : undefined;
}

function alterOf(parent: Element | undefined, childName: string): number {
  if (parent === undefined) return 0;
  return intOf(firstChildNamed(parent, childName)) ?? 0;
}

/** Parses one `<harmony>` element. Never throws: every field is optional, and a `<harmony>` missing all of them simply yields an all-undefined record rather than a diagnostic storm. */
export function parseHarmonyElement(harmonyEl: Element): ParsedHarmony {
  const rootEl = firstChildNamed(harmonyEl, 'root');
  const bassEl = firstChildNamed(harmonyEl, 'bass');
  const kindEl = firstChildNamed(harmonyEl, 'kind');

  const rootStep = stepOf(rootEl, 'root-step');
  const kind = textOf(kindEl);
  const kindText = kindEl !== undefined ? attrOf(kindEl, 'text') : undefined;
  const bassStep = stepOf(bassEl, 'bass-step');

  return {
    ...(rootStep !== undefined ? { rootStep } : {}),
    rootAlter: alterOf(rootEl, 'root-alter'),
    ...(kind !== undefined ? { kind } : {}),
    ...(kindText !== undefined ? { kindText } : {}),
    ...(bassStep !== undefined ? { bassStep } : {}),
    bassAlter: alterOf(bassEl, 'bass-alter'),
  };
}
