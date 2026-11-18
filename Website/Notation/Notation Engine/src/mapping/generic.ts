/**
 * The generic mapping every instrument falls back to.
 *
 * PLAN.md Part E's completion test is stated in terms of THIS profile: a
 * valid note must render whether or not any profile names its instrument.
 * So it is the registry's last tier, and the one that must never drop a
 * note. It is not a "piano" mapping or a "violin" mapping -- it is the
 * answer for an instrument this engine has never heard of, which is the
 * whole point of the layer.
 *
 * Position comes from the clef (the one public fact that decides where a
 * pitch sits on a staff). The notehead comes from §9.7's own selection
 * order, which already encodes the file-override-default precedence this
 * layer documents -- so the two are the same rule, stated once. Every
 * input is passed straight through to that rule, so this profile cannot
 * disagree with the renderer it replaces.
 */

import { staffPositionForPitch } from '../geometry/clef.js';
import { selectNoteheadGlyphName, harmonicNoteheadGlyphName } from '../geometry/notehead.js';
import type {
  InstrumentProfile,
  MappingContext,
  MappingNoteResult,
  MappingSource,
} from './types.js';

/**
 * Which tier §9.7's rule actually used, derived from the same inputs in
 * the same order as `selectNoteheadGlyphName` -- kept beside the call it
 * mirrors so the two cannot drift. It reports a fact; it never changes
 * which glyph is chosen.
 */
function noteheadSource(ctx: MappingContext): MappingSource {
  const fileStatedHead =
    ctx.explicitNotehead !== undefined || ctx.explicitNoteheadSmufl !== undefined;
  if (fileStatedHead) return 'explicit-file';
  if (ctx.isHarmonic === true && ctx.pitch.kind === 'pitched') return 'fallback';

  const key =
    ctx.pitch.kind === 'pitched'
      ? `${ctx.pitch.step}${ctx.pitch.octave}`
      : ctx.gmNote !== undefined
        ? String(ctx.gmNote)
        : `${ctx.pitch.displayStep}${ctx.pitch.displayOctave}`;
  if (ctx.overridesByKey?.[key] !== undefined) return 'user-override';
  return 'fallback';
}

/** Resolve a note with no instrument-specific profile: clef for the line, §9.7 for the head. */
export function resolveGenericPitched(ctx: MappingContext): MappingNoteResult {
  const { step, octave } =
    ctx.pitch.kind === 'pitched'
      ? { step: ctx.pitch.step, octave: ctx.pitch.octave }
      : { step: ctx.pitch.displayStep, octave: ctx.pitch.displayOctave };

  const fileStatedHead =
    ctx.explicitNotehead !== undefined || ctx.explicitNoteheadSmufl !== undefined;
  const glyph =
    ctx.isHarmonic === true && ctx.pitch.kind === 'pitched' && !fileStatedHead
      ? harmonicNoteheadGlyphName(ctx.durationType, ctx.filled)
      : selectNoteheadGlyphName({
          pitch: ctx.pitch,
          durationType: ctx.durationType,
          ...(ctx.filled !== undefined ? { filled: ctx.filled } : {}),
          ...(ctx.explicitNotehead !== undefined ? { explicitNotehead: ctx.explicitNotehead } : {}),
          ...(ctx.explicitNoteheadSmufl !== undefined
            ? { explicitNoteheadSmufl: ctx.explicitNoteheadSmufl }
            : {}),
          ...(ctx.gmNote !== undefined ? { midiNote: ctx.gmNote } : {}),
          ...(ctx.overridesByKey !== undefined ? { overridesByKey: ctx.overridesByKey } : {}),
          ...(ctx.defaultShape !== undefined ? { defaultShape: ctx.defaultShape } : {}),
        });

  return {
    // No `staffLines` argument: the renderer positions pitched notes with
    // this function's own 5-line default and handles a shorter/taller staff
    // through its ledger-line and stem rules instead. Passing the line count
    // here would move notes the renderer does not move.
    staffPosition: staffPositionForPitch(ctx.clef, step, octave),
    staffPositionSource: ctx.pitch.kind === 'unpitched' ? 'explicit-file' : 'fallback',
    noteheadGlyph: glyph,
    noteheadSource: noteheadSource(ctx),
  };
}

/**
 * The last-resort profile. It matches everything -- a pitched instrument
 * this engine has no profile for, and an unpitched note whose GM number
 * the percussion profile did not take. Both are still notes, and dropping
 * either because no table knew it would violate Part E's completion test.
 */
export const GENERIC_PITCHED_PROFILE: InstrumentProfile = {
  id: 'generic-pitched',
  description:
    'Any instrument with no specific profile: the clef (or display-step) decides the line, the §9.7 rule decides the head.',
  matches: () => true,
  resolve: resolveGenericPitched,
};
