import type { StemDirection } from './stem.js';

export type GraceNoteKind = 'acciaccatura' | 'appoggiatura';

const GLYPH_NAMES: Readonly<Record<GraceNoteKind, Readonly<Record<StemDirection, string>>>> = {
  acciaccatura: {
    up: 'graceNoteAcciaccaturaStemUp',
    down: 'graceNoteAcciaccaturaStemDown',
  },
  appoggiatura: {
    up: 'graceNoteAppoggiaturaStemUp',
    down: 'graceNoteAppoggiaturaStemDown',
  },
};

/**
 * §9.24's grace-note glyph: a real, precomposed, direction-aware SMuFL
 * glyph for the entire small notehead+stem+flag(+slash) figure --
 * confirmed to exist before assuming this phase would need the same
 * missing-text-font workaround Phases 31-33 all needed. The
 * acciaccatura (slashed stem) vs appoggiatura (unslashed) distinction is
 * simply which glyph family is selected, not a separate overlay drawn on
 * top of a shared base glyph. Stem direction reuses §9.8's existing
 * rule directly ("their stems follow the same direction rules as
 * regular notes") -- this function doesn't compute direction itself,
 * only selects the glyph for whichever direction the caller already
 * resolved.
 */
export function graceNoteGlyphName(kind: GraceNoteKind, direction: StemDirection): string {
  return GLYPH_NAMES[kind][direction];
}
