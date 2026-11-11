/**
 * candidates.ts — every way this stage could be played (Plan SV-10..14).
 *
 * For one note on a guitar there are usually five places and four
 * fingers: twenty ways to play a note that sounds identical. This
 * file lists them, throws out the ones a hand could not make, and
 * hands the rest to the solver. It is where P-001 and P-002 are
 * enforced too: anything the file already decided is not a choice.
 */
import type { GeometryConfig } from '../core/geometry.js';
import type { HandConfig, InstrumentSpec, NoteEvent, Placement } from '../core/types.js';
import { placementsForPitch } from '../core/tuning.js';
import type { CostContext } from './left-hand-cost.js';
import { staticFeatures } from './left-hand-cost.js';
import type { LeftHandConfig } from './left-hand-rules.js';
import { allowedFingers, frettedOf, handPosition, infeasibleReason } from './left-hand-rules.js';
import type { SolveStage } from './stages.js';

/**
 * One way of playing a stage's own onsets, before the hand it came
 * from is taken into account.
 *
 * WHAT a stage can be played as does not depend on what came before
 * it; only what it costs to GET there does. Working that list out
 * once per stage instead of once per surviving predecessor is the
 * difference between a five-minute solo taking two seconds and taking
 * ten (01 §5).
 */
export interface BaseVariant {
  readonly placements: readonly Placement[];
  readonly staticCost: number;
  readonly features: Readonly<Record<string, number>>;
  /** `stateKey(placements)`, worked out once with the variant. */
  readonly key: string;
  /**
   * True when this shape frets nothing, so [LH-07] the hand position
   * is whatever it already was -- which makes the state depend on the
   * hand it came from, and stops it being shared.
   */
  readonly inheritsHandPos: boolean;
  /** The finished state, built once and handed to every predecessor that can use it. */
  state?: GuitarState;
}

/**
 * A solver state, as the guitar layer builds it.
 *
 * It is the plan's `HandConfig` with its merge key carried along.
 * The key is what SV-12 merges on and what breaks ties, and the
 * search asks for it once per state per predecessor -- so building it
 * with the state, instead of on every ask, is worth the extra field.
 */
export interface GuitarState extends HandConfig {
  readonly key: string;
}

/** One analysis's worth of stage variants, keyed by stage and relaxation level. */
export type VariantCache = Map<string, readonly BaseVariant[]>;

export interface CandidateContext extends CostContext {
  readonly instrument: InstrumentSpec;
  readonly geometry: GeometryConfig;
  readonly leftHand: LeftHandConfig;
  /** Set by `analyzeGuitar`, so each stage's own variants are built once. */
  readonly variantCache?: VariantCache;
}

/**
 * [SV-14] What each relaxation level lets go of.
 *
 * The order is the plan's: stretch first, then sustained notes, then
 * the span limits themselves, and only at the end a note of a chord.
 * Locked tab is never changed at any level (P-001) -- only the limits
 * around it are loosened, which is what `TAB_INFEASIBLE` reports.
 */
export interface Relaxation {
  readonly spanFactor: number;
  readonly cutAllSustained: boolean;
  readonly ignoreSpan: boolean;
  readonly dropNotes: number;
}

export function relaxationFor(level: number, relaxSpanFactor: number): Relaxation {
  return {
    spanFactor: level >= 1 ? relaxSpanFactor : 1,
    cutAllSustained: level >= 2,
    ignoreSpan: level >= 3,
    dropNotes: level >= 4 ? level - 3 : 0,
  };
}

/** [SV-11] Every place and finger one note could use, after the file's own locks. */
export function placementsFor(
  note: NoteEvent,
  instrument: InstrumentSpec,
  leftHand: LeftHandConfig,
): readonly Placement[] {
  const capo = Math.max(0, instrument.capo);
  const positions =
    note.lockedString !== undefined && note.lockedFret !== undefined
      ? // [P-001] the file wrote the position; it is not the engine's to change.
        [{ string: note.lockedString, fret: note.lockedFret }]
      : placementsForPitch(instrument, note.pitch).filter(
          (position) =>
            (note.lockedString === undefined || position.string === note.lockedString) &&
            (note.lockedFret === undefined || position.fret === note.lockedFret),
        );

  const out: Placement[] = [];
  for (const position of positions) {
    // [DM-05] an open string, or a string held by the capo, is played
    // by no finger at all -- and that is an answer, not a gap.
    if (position.fret === 0 || (capo > 0 && position.fret <= capo)) {
      out.push({ noteId: note.noteId, string: position.string, fret: position.fret, finger: null });
      continue;
    }
    for (const finger of allowedFingers(leftHand)) {
      // [P-002] a written fingering wins over anything the solver would pick.
      if (note.lockedFinger !== undefined && note.lockedFinger !== finger) continue;
      out.push({ noteId: note.noteId, string: position.string, fret: position.fret, finger });
    }
  }
  return out;
}

/** How wide one stage's own search may get before it is trimmed. */
const MAX_STAGE_CANDIDATES = 4096;

/**
 * [SV-12] Every hand this stage could end in, starting from the one before it.
 *
 * Sustained notes are carried over when they still fit and cut when
 * they do not -- both versions are offered, because keeping a ringing
 * note and cutting it are both things players do and the cost model,
 * not this function, should decide which (LH-31).
 */
export function expandStage(
  previous: HandConfig | undefined,
  stage: SolveStage,
  context: CandidateContext,
  level: number,
): readonly GuitarState[] {
  const relaxation = relaxationFor(level, context.solver.relaxSpanFactor);
  const feasibility = {
    instrument: context.instrument,
    geometry: context.geometry,
    leftHand: context.leftHand,
    spanFactor: relaxation.ignoreSpan ? Infinity : relaxation.spanFactor,
  };

  // [SV-14] at the last resort a chord loses its most expensive note
  // rather than the whole stage disappearing.
  const onsets =
    relaxation.dropNotes > 0 ? dropHardest(stage.onsets, relaxation.dropNotes) : stage.onsets;
  if (onsets.length === 0) return [];

  const cacheKey = `${stage.index}:${level}`;
  const cached = context.variantCache?.get(cacheKey);
  const base = cached ?? buildVariants(onsets, context, feasibility, level);
  if (cached === undefined) context.variantCache?.set(cacheKey, base);

  const carried = relaxation.cutAllSustained ? [] : sustainedPlacements(previous, stage);
  const states: GuitarState[] = [];

  for (const variant of base) {
    const options: BaseVariant[] = [variant];
    if (carried.length > 0) {
      // Keeping a ringing note is a different hand from cutting it,
      // so both are offered and the cost model (LH-31) decides.
      const kept = keepCompatible(carried, variant.placements, feasibility);
      if (kept.length > 0) {
        const placements = [...variant.placements, ...kept];
        const { cost, features } = staticFeatures(placements, context);
        if (level > 0 || cost <= context.solver.maxStaticCost) {
          options.unshift({
            placements,
            staticCost: cost,
            features: { ...features },
            key: stateKey(placements),
            inheritsHandPos: frettedOf(placements).length === 0,
          });
        }
      }
    }
    for (const option of options) {
      // A shape that frets something is the same state whoever the
      // hand was before it, so it is built once and shared. Only a
      // shape that inherits the hand position -- all open strings --
      // has to be made again for each predecessor.
      if (!option.inheritsHandPos && option.state !== undefined) {
        states.push(option.state);
        continue;
      }
      const handPos = handPosition(option.placements, previous?.handPos ?? 1);
      const state: GuitarState = {
        placements: option.placements,
        handPos,
        staticCost: option.staticCost,
        features: option.features,
        key: `${option.key}@${Math.round(handPos * 100)}`,
      };
      if (!option.inheritsHandPos) option.state = state;
      states.push(state);
    }
  }
  return states;
}

/** [SV-11] The cartesian product of the onsets' own options, minus what no hand can hold. */
function buildVariants(
  onsets: readonly NoteEvent[],
  context: CandidateContext,
  feasibility: Parameters<typeof infeasibleReason>[1],
  level: number,
): readonly BaseVariant[] {
  let partial: Placement[][] = [[]];
  for (const note of onsets) {
    const options = placementsFor(note, context.instrument, context.leftHand);
    const grown: Placement[][] = [];
    for (const base of partial) {
      for (const option of options) {
        const combined = [...base, option];
        if (infeasibleReason(combined, feasibility) !== undefined) continue;
        grown.push(combined);
        if (grown.length >= MAX_STAGE_CANDIDATES) break;
      }
      if (grown.length >= MAX_STAGE_CANDIDATES) break;
    }
    partial = grown;
    if (partial.length === 0) return [];
  }

  const variants: BaseVariant[] = [];
  for (const placements of partial) {
    const { cost, features } = staticFeatures(placements, context);
    // [SV-13] a hand shape this awkward is not worth carrying, unless
    // the stage has already had to be relaxed to find anything at all.
    if (level === 0 && cost > context.solver.maxStaticCost) continue;
    variants.push({
      placements,
      staticCost: cost,
      features: { ...features },
      key: stateKey(placements),
      inheritsHandPos: frettedOf(placements).length === 0,
    });
  }
  return variants;
}

/** What was still sounding when this stage began, as the previous hand held it. */
function sustainedPlacements(
  previous: HandConfig | undefined,
  stage: SolveStage,
): readonly Placement[] {
  if (previous === undefined) return [];
  const stillSounding = new Set(stage.sustained.map((note) => note.noteId));
  return previous.placements.filter(
    (placement) => stillSounding.has(placement.noteId) && placement.finger !== null,
  );
}

function keepCompatible(
  carried: readonly Placement[],
  placements: readonly Placement[],
  feasibility: Parameters<typeof infeasibleReason>[1],
): readonly Placement[] {
  const kept: Placement[] = [];
  for (const placement of carried) {
    const candidate = [...placements, ...kept, placement];
    if (infeasibleReason(candidate, feasibility) === undefined) kept.push(placement);
  }
  return kept;
}

/**
 * Two states are the same hand when every finger is in the same
 * place AND the hand is in the same position.
 *
 * The hand position matters even when the placements match: a stage
 * of nothing but open strings carries the hand position over from
 * whatever came before (LH-07), so two such states really are two
 * different hands, and merging them would make the next shift
 * measure from the wrong place.
 */
export function handConfigKey(state: HandConfig): string {
  const built = (state as Partial<GuitarState>).key;
  return built ?? `${stateKey(state.placements)}@${Math.round(state.handPos * 100)}`;
}

/**
 * The placements alone, sorted so the order they were built in cannot matter.
 *
 * The fret comes first in each part, zero-padded, because this key is
 * also the solver's TIE-BREAK (it sorts equal-cost states, so the same
 * input always gives the same answer -- README rule 4). Putting the
 * fret first means that when two fingerings really do cost the same,
 * the one nearer the nut wins, which is the one a player reaches for.
 */
export function stateKey(placements: readonly Placement[]): string {
  return [...placements]
    .map(
      (placement) =>
        `f${pad(placement.fret)}s${pad(placement.string)}:${String(placement.finger)}:${placement.noteId}`,
    )
    .sort()
    .join('|');
}

function pad(value: number): string {
  return String(Math.round(value)).padStart(3, '0');
}

/** [SV-14] the note a chord can most afford to lose: the highest, which a listener misses least in a dense voicing. */
function dropHardest(onsets: readonly NoteEvent[], count: number): readonly NoteEvent[] {
  if (onsets.length <= count) return [];
  return [...onsets].sort((a, b) => a.pitch - b.pitch).slice(0, onsets.length - count);
}
