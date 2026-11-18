/**
 * The mapping registry: an ordered list of instrument profiles, tried in
 * order, with the first match deciding.
 *
 * PLAN.md Part E's precedence, most authoritative first:
 *
 *   1. explicit MusicXML display/notehead/stem -- the file's own notation;
 *   2. user override (`config.noteheadMapping.overridesByKey`);
 *   3. the matched instrument profile;
 *   4. the documented fallback, plus a diagnostic where it is a recovery.
 *
 * Tiers 1 and 2 are not separate profiles -- they are inputs every profile
 * reads (a profile cannot overrule the file, by construction: it only ever
 * receives the file's statements and is expected to defer to them). The
 * registry's own job is tier 3: which profile, in what order. Tier 4 is
 * the `generic-pitched` profile, which matches everything and so must be
 * last.
 *
 * A caller can put profiles of its own ahead of the built-ins (E-5's
 * "MappingProfile customization"), which is how a house drum kit or a
 * custom instrument gets a say without editing this engine.
 */

import { mappingDiagnostic, type MappingDiagnostic } from './diagnostic.js';
import { GENERIC_PITCHED_PROFILE, resolveGenericPitched } from './generic.js';
import { UNPITCHED_PERCUSSION_PROFILE, percussionLookupDiagnostics } from './percussion.js';
import type {
  InstrumentProfile,
  MappingContext,
  MappingNoteResult,
  MappingResolution,
} from './types.js';

/**
 * The profiles this engine ships, in precedence order. The last entry is
 * the generic fallback, which matches everything -- so `resolve` always
 * finds an answer and never throws or drops a note.
 */
export const DEFAULT_PROFILES: readonly InstrumentProfile[] = [
  UNPITCHED_PERCUSSION_PROFILE,
  GENERIC_PITCHED_PROFILE,
];

/**
 * An ordered set of profiles. `resolve` tries each in turn and returns the
 * first match's answer, so the list order IS the precedence.
 */
export class MappingRegistry {
  private readonly profiles: readonly InstrumentProfile[];

  constructor(profiles?: readonly InstrumentProfile[]) {
    // A caller's profiles come first, then the defaults. The generic
    // fallback is forced to the end whatever the caller passed, so a
    // registry can never be built that has no answer for some note.
    const withoutGeneric = (profiles ?? []).filter((p) => p.id !== GENERIC_PITCHED_PROFILE.id);
    this.profiles = [...withoutGeneric, ...DEFAULT_PROFILES];
  }

  /** The profiles this registry will try, in order -- for a test or a doc table. */
  profileIds(): readonly string[] {
    return this.profiles.map((p) => p.id);
  }

  /**
   * Resolve one note's notation. Never returns undefined: the generic
   * fallback matches everything, so every note has an answer.
   */
  resolve(ctx: MappingContext): MappingResolution {
    return resolveWithProfiles(this.profiles, ctx);
  }
}

/**
 * Resolve one note against an explicit profile list, first match wins.
 *
 * Exported because it is the registry's whole decision, stated as a pure
 * function of its inputs -- a caller (or a test) can run a profile list
 * that does NOT contain the generic fallback and see the `MAPPING_NO_PROFILE`
 * recovery, which the class's constructor makes unreachable on purpose.
 */
export function resolveWithProfiles(
  profiles: readonly InstrumentProfile[],
  ctx: MappingContext,
): MappingResolution {
  const diagnostics: MappingDiagnostic[] = [];
  for (const profile of profiles) {
    if (!profile.matches(ctx)) continue;
    const { note, failure } = safeResolve(profile, ctx);
    if (failure !== undefined) diagnostics.push(failure);
    // A profile may report a recovery through the drum-lookup channel;
    // surface it with this note's own finding so a caller sees one list.
    if (profile.id === UNPITCHED_PERCUSSION_PROFILE.id) {
      diagnostics.push(...percussionLookupDiagnostics(ctx));
    }
    return { note, profileId: profile.id, diagnostics };
  }
  // Reached only when the caller passed a list with no matching profile --
  // `MappingRegistry` never does, since it forces the generic fallback in.
  // Kept as a real answer rather than a throw so a future profile list
  // cannot turn a missing note into a crash.
  return {
    note: resolveGenericPitched(ctx),
    profileId: GENERIC_PITCHED_PROFILE.id,
    diagnostics: [
      ...diagnostics,
      mappingDiagnostic(
        'warning',
        'MAPPING_NO_PROFILE',
        'No instrument profile matched this note; using the generic pitched mapping.',
      ),
    ],
  };
}

/**
 * A profile is a pure function of the context it is handed, but it is
 * caller-supplied data -- so a bad one is caught and degraded to the
 * generic answer with a diagnostic, rather than taking the whole render
 * down. This is the same "recover, never drop" rule every parser follows.
 */
function safeResolve(
  profile: InstrumentProfile,
  ctx: MappingContext,
): { note: MappingNoteResult; failure?: MappingDiagnostic } {
  try {
    return { note: profile.resolve(ctx) };
  } catch (e) {
    return {
      note: resolveGenericPitched(ctx),
      failure: mappingDiagnostic(
        'warning',
        'MAPPING_PROFILE_FAILED',
        `Mapping profile "${profile.id}" threw while resolving a note; using the generic pitched mapping. ${String(e)}`,
      ),
    };
  }
}

/** The registry `renderFromMusicXml` builds when the caller names none. */
export const DEFAULT_MAPPING_REGISTRY = new MappingRegistry();
