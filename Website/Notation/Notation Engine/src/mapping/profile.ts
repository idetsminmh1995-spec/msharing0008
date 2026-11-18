/**
 * A caller's own mapping profile, as plain data.
 *
 * E-5 asks for "MappingProfile customization/persistence" -- a way for a
 * host (or a user of the app) to say "this instrument draws like THIS",
 * save it, and load it back. The persistence is the host's job (this
 * engine has no storage of its own); what the engine owes is a plain,
 * serialisable shape and the one function that turns it into a live
 * `InstrumentProfile`.
 *
 * The profile it produces sits AHEAD of the built-ins in a
 * `MappingRegistry` -- see `registry.ts` -- so a custom mapping wins over
 * the default kit. It can NOT win over the file: `matches` is consulted
 * only after a profile is chosen, and the resolver it builds defers to an
 * explicit `<notehead>`/`<display-step>` the same way every built-in does.
 */

import { staffPositionForPitch } from '../geometry/clef.js';
import { selectNoteheadGlyphName } from '../geometry/notehead.js';
import { isUnpitched } from '../core/pitch.js';
import { mappingDiagnostic } from './diagnostic.js';
import type { InstrumentProfile, MappingContext, MappingNoteResult } from './types.js';

/**
 * One instrument's custom rendering, as data a host can store as JSON and
 * load back. Every field is optional; a field left out falls through to
 * the profile the engine would otherwise have used, so a `MappingProfile`
 * that names only a notehead does not also have to restate the position.
 */
export interface MappingProfile {
  /** A stable id, e.g. `the owner's kit`. Also the profile id in diagnostics. */
  readonly id: string;
  /** One line, shown beside the id wherever profiles are listed. */
  readonly description?: string;
  /**
   * When to use this profile. Every field is optional and all stated
   * fields must match (logical AND). An empty `match` matches everything,
   * which is only useful as the single profile in a registry.
   */
  readonly match?: {
    /** `<part-name>` or instrument name, exact match. */
    readonly instrumentName?: string;
    /** True for unpitched percussion parts, false for pitched. */
    readonly unpitched?: boolean;
    /** GM note number, for a profile that names one drum. */
    readonly gmNote?: number;
  };
  /**
   * Overrides keyed by GM note number (unpitched) or `<step><octave>`
   * (pitched) -- the same key scheme `noteheadMappingKey` uses, so a
   * profile's entry and a `config.noteheadMapping` entry speak the same
   * language. A shape FAMILY name ('x', 'diamond', ...), not a glyph.
   */
  readonly noteheadByKey?: Readonly<Record<string, string>>;
  /** Overrides keyed the same way, giving a staff position (bottom line 0, up negative). */
  readonly staffPositionByKey?: Readonly<Record<string, number>>;
  /** A stem direction pinned for every note this profile matches (percussion). */
  readonly stemDirection?: 'up' | 'down';
}

/** The key a `MappingProfile`'s per-note maps use -- mirrors `noteheadMappingKey`. */
function keyFor(ctx: MappingContext): string {
  if (isUnpitched(ctx.pitch)) {
    return ctx.gmNote !== undefined
      ? String(ctx.gmNote)
      : `${ctx.pitch.displayStep}${ctx.pitch.displayOctave}`;
  }
  return `${ctx.pitch.step}${ctx.pitch.octave}`;
}

function matchesProfile(profile: MappingProfile, ctx: MappingContext): boolean {
  const m = profile.match;
  if (m === undefined) return true;
  if (m.instrumentName !== undefined && m.instrumentName !== ctx.instrumentName) return false;
  if (m.unpitched !== undefined && m.unpitched !== isUnpitched(ctx.pitch)) return false;
  if (m.gmNote !== undefined && m.gmNote !== ctx.gmNote) return false;
  return true;
}

/**
 * Turn a stored `MappingProfile` into a live profile a registry can hold.
 *
 * The profile is matched against `ctx.instrumentName` -- the part name the
 * renderer threads onto each note's context -- so one `MappingProfile` can
 * be loaded once and applied wherever its instrument appears.
 */
export function mappingProfileToInstrumentProfile(profile: MappingProfile): InstrumentProfile {
  return {
    id: profile.id,
    description: profile.description ?? `Custom mapping "${profile.id}".`,
    matches: (ctx) => matchesProfile(profile, ctx),
    resolve: (ctx): MappingNoteResult => {
      const key = keyFor(ctx);
      const shape = profile.noteheadByKey?.[key];
      const explicitPosition = profile.staffPositionByKey?.[key];

      const { step, octave } = isUnpitched(ctx.pitch)
        ? { step: ctx.pitch.displayStep, octave: ctx.pitch.displayOctave }
        : { step: ctx.pitch.step, octave: ctx.pitch.octave };
      const staffPosition =
        explicitPosition !== undefined
          ? explicitPosition
          : staffPositionForPitch(ctx.clef, step, octave);

      // A file's own `<notehead>` outranks the profile's shape, exactly as
      // it outranks every other default -- the profile only speaks where
      // the file was silent.
      const fileStatedHead =
        ctx.explicitNotehead !== undefined || ctx.explicitNoteheadSmufl !== undefined;
      const glyph =
        shape !== undefined && !fileStatedHead
          ? selectNoteheadGlyphName({
              pitch: ctx.pitch,
              durationType: ctx.durationType,
              defaultShape: shape,
              ...(ctx.filled !== undefined ? { filled: ctx.filled } : {}),
            })
          : selectNoteheadGlyphName({
              pitch: ctx.pitch,
              durationType: ctx.durationType,
              ...(ctx.filled !== undefined ? { filled: ctx.filled } : {}),
              ...(ctx.explicitNotehead !== undefined
                ? { explicitNotehead: ctx.explicitNotehead }
                : {}),
              ...(ctx.explicitNoteheadSmufl !== undefined
                ? { explicitNoteheadSmufl: ctx.explicitNoteheadSmufl }
                : {}),
              ...(ctx.overridesByKey !== undefined ? { overridesByKey: ctx.overridesByKey } : {}),
              ...(ctx.defaultShape !== undefined ? { defaultShape: ctx.defaultShape } : {}),
            });

      return {
        staffPosition,
        staffPositionSource: explicitPosition !== undefined ? 'instrument-profile' : 'fallback',
        noteheadGlyph: glyph,
        noteheadSource: shape !== undefined && !fileStatedHead ? 'instrument-profile' : 'fallback',
        ...(profile.stemDirection !== undefined
          ? { stemDirection: profile.stemDirection, stemSource: 'instrument-profile' as const }
          : {}),
      };
    },
  };
}

/** A stored profile list, validated and turned into a registry the renderer can take. */
export function validateMappingProfile(
  profile: MappingProfile,
): ReturnType<typeof mappingDiagnostic>[] {
  const findings: ReturnType<typeof mappingDiagnostic>[] = [];
  if (profile.id === '') {
    findings.push(
      mappingDiagnostic(
        'error',
        'MAPPING_PROFILE_NO_ID',
        'A mapping profile must have a non-empty id.',
      ),
    );
  }
  if (
    profile.match?.instrumentName === undefined &&
    profile.match?.unpitched === undefined &&
    profile.match?.gmNote === undefined &&
    profile.match !== undefined
  ) {
    findings.push(
      mappingDiagnostic(
        'warning',
        'MAPPING_PROFILE_EMPTY_MATCH',
        `Mapping profile "${profile.id}" has an empty match object; it will apply to every note.`,
      ),
    );
  }
  return findings;
}
