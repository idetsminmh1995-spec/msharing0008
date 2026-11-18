/**
 * The unpitched-percussion profile.
 *
 * §13.3's drum table, stated as one profile instead of being open-coded
 * inside the renderer. The behavior is exactly what the renderer already
 * did -- this file is the extraction, not a rewrite -- so the extraction
 * is verifiable by the render tests staying byte-identical.
 *
 * The rule that matters, restated because it is the one that is easy to
 * get backwards: **the FILE decides, where the file has said anything.**
 * `<display-step>`/`<display-octave>` are not a hint -- they are how a
 * percussion note says which line it goes on -- so the drum table adapts
 * to the file, never the file to the table. The table is the answer only
 * for a file that stated no position, which is the only case left for it.
 */

import { staffPositionForPitch } from '../geometry/clef.js';
import { selectNoteheadGlyphName } from '../geometry/notehead.js';
import { isUnpitched } from '../core/pitch.js';
import { lookupDrumMapEntry, type DrumMapEntry } from '../drums/drum-map.js';
import { mappingDiagnostic } from './diagnostic.js';
import type {
  InstrumentProfile,
  MappingContext,
  MappingNoteResult,
  MappingSource,
} from './types.js';

/** The drum table entry for this context, if the note has a GM number the table knows. */
function drumEntryFor(ctx: MappingContext): DrumMapEntry | undefined {
  if (ctx.gmNote === undefined) return undefined;
  return lookupDrumMapEntry(ctx.gmNote, ctx.drumMap).entry;
}

/**
 * §9.7's selection order with the drum table's two override sources merged
 * in precedence order: the drum table's own shape for this GM note is the
 * engine's default opinion, and `config.noteheadMapping.overridesByKey` is
 * the user's -- so the user's entry for the same key wins.
 *
 * The table's opinion is withheld for a note the FILE placed, for the same
 * reason its position is: a file's own `<notehead>` is read and defaults
 * to a plain one, so a file that wants an X on the hi-hat line says so, and
 * one that says nothing means a plain oval.
 */
function percussionNotehead(
  ctx: MappingContext,
  drumEntry: DrumMapEntry | undefined,
  positionedByFile: boolean,
): { glyph: string; source: MappingSource } {
  const drumOverride =
    ctx.gmNote !== undefined && drumEntry !== undefined && !positionedByFile
      ? { [String(ctx.gmNote)]: drumEntry.noteheadShape }
      : undefined;
  // A drum the table names ONE glyph for -- the china cymbal, the slap --
  // cannot go through the shape-family override above, because no family
  // contains that glyph. It travels the same road an explicit
  // `<notehead smufl="...">` does, and loses to one.
  const drumGlyph =
    ctx.gmNote !== undefined &&
    drumEntry?.noteheadGlyph !== undefined &&
    !positionedByFile &&
    ctx.explicitNotehead === undefined &&
    ctx.explicitNoteheadSmufl === undefined
      ? drumEntry.noteheadGlyph
      : undefined;
  const configOverrides = ctx.overridesByKey;
  const overridesByKey =
    drumOverride !== undefined || configOverrides !== undefined
      ? { ...drumOverride, ...configOverrides }
      : undefined;

  const glyph = selectNoteheadGlyphName({
    pitch: ctx.pitch,
    durationType: ctx.durationType,
    ...(ctx.filled !== undefined ? { filled: ctx.filled } : {}),
    ...(ctx.explicitNotehead !== undefined ? { explicitNotehead: ctx.explicitNotehead } : {}),
    ...(ctx.explicitNoteheadSmufl !== undefined
      ? { explicitNoteheadSmufl: ctx.explicitNoteheadSmufl }
      : drumGlyph !== undefined
        ? { explicitNoteheadSmufl: drumGlyph }
        : {}),
    ...(ctx.gmNote !== undefined ? { midiNote: ctx.gmNote } : {}),
    ...(overridesByKey !== undefined ? { overridesByKey } : {}),
    ...(ctx.defaultShape !== undefined ? { defaultShape: ctx.defaultShape } : {}),
  });

  const source: MappingSource =
    ctx.explicitNotehead !== undefined || ctx.explicitNoteheadSmufl !== undefined
      ? 'explicit-file'
      : drumGlyph !== undefined || drumOverride !== undefined
        ? 'instrument-profile'
        : configOverrides !== undefined && overridesByKey !== undefined
          ? 'user-override'
          : 'fallback';
  return { glyph, source };
}

export function resolvePercussion(ctx: MappingContext): MappingNoteResult {
  const positionedByFile = ctx.hasExplicitDisplayPosition === true;
  const drumEntry = drumEntryFor(ctx);

  const position =
    drumEntry !== undefined && !positionedByFile
      ? drumEntry.staffPosition
      : staffPositionForPitch(
          ctx.clef,
          ctx.pitch.kind === 'unpitched' ? ctx.pitch.displayStep : 'B',
          ctx.pitch.kind === 'unpitched' ? ctx.pitch.displayOctave : 4,
        );
  const positionSource: MappingSource =
    drumEntry !== undefined && !positionedByFile
      ? 'instrument-profile'
      : positionedByFile
        ? 'explicit-file'
        : 'fallback';

  const { glyph, source } = percussionNotehead(ctx, drumEntry, positionedByFile);

  return {
    staffPosition: position,
    staffPositionSource: positionSource,
    noteheadGlyph: glyph,
    noteheadSource: source,
    ...(drumEntry?.stemDirection !== undefined
      ? { stemDirection: drumEntry.stemDirection, stemSource: 'instrument-profile' as const }
      : {}),
  };
}

/**
 * The percussion profile. It matches an UNPITCHED note whose `<instrument>`
 * resolves to a GM number -- the case §13.3 is about. An unpitched note
 * with no GM number, or one whose number the table does not know, is left
 * to the generic fallback, which places it from its own display position.
 *
 * `resolve` still reports a lookup warning when the GM number is outside
 * the documented 35-81 range, through the same `lookupDrumMapEntry` the
 * renderer's diagnostic pass calls -- one rule, one place.
 */
export const UNPITCHED_PERCUSSION_PROFILE: InstrumentProfile = {
  id: 'unpitched-percussion',
  description:
    'GM-mapped percussion: the drum table places the notehead, unless the file stated its own position.',
  matches: (ctx) => isUnpitched(ctx.pitch) && ctx.gmNote !== undefined,
  resolve: resolvePercussion,
};

/**
 * The drum-table lookup warning for one GM note, in the mapping layer's
 * own diagnostic type. This is the ONE rule the renderer's score-wide
 * diagnostic pass and the registry both call -- so a GM number outside
 * the documented range is reported once, by the same code, whichever
 * path reaches it first.
 */
export function drumLookupDiagnostics(
  gmNote: number,
  drumMap: MappingContext['drumMap'],
): readonly ReturnType<typeof mappingDiagnostic>[] {
  return lookupDrumMapEntry(gmNote, drumMap).diagnostics.map((d) =>
    mappingDiagnostic(d.severity, d.code, d.message),
  );
}

/**
 * The lookup warning for a GM note the drum table does not know, so the
 * registry can surface it through its own diagnostic channel. Exported
 * separately because `resolve` returns facts, not diagnostics -- the
 * registry decides which findings to report.
 */
export function percussionLookupDiagnostics(
  ctx: MappingContext,
): readonly ReturnType<typeof mappingDiagnostic>[] {
  if (ctx.gmNote === undefined) return [];
  return drumLookupDiagnostics(ctx.gmNote, ctx.drumMap);
}
