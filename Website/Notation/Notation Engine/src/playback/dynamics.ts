import type { ParsedDynamicLevel } from '../parser/musicxml/direction.js';

/**
 * How loud a dynamic marking is, as a MIDI velocity.
 *
 * A `pp` in the score is a mark the renderer draws and a fact the
 * synthesiser needs; without this table the two disagree -- every note
 * would sound at one fixed velocity however the page is marked up.
 *
 * The numbers follow the conventional MIDI-velocity ladder (a `mf` in
 * the middle at 80, each step a constant ratio apart): velocity is a
 * playback convention, not engraving, so there is nothing to measure.
 */
const VELOCITY_BY_LEVEL: Readonly<Record<ParsedDynamicLevel, number>> = {
  pppppp: 8,
  ppppp: 12,
  pppp: 20,
  ppp: 30,
  pp: 40,
  p: 52,
  mp: 64,
  mf: 80,
  f: 96,
  ff: 112,
  fff: 120,
  ffff: 126,
  fffff: 127,
  ffffff: 127,
  // The accented markings: the note they sit on is struck hard, and the
  // ones after it fall back to the level the marking implies. `sf`-family
  // accents carry no level of their own, so they take the forte attack.
  sf: 112,
  sfz: 112,
  sffz: 120,
  fz: 112,
  rf: 112,
  sfzp: 112,
  // "loud, then immediately soft" -- the attack is what a single note's
  // velocity can express, so that is what it gets.
  sfp: 112,
  sfpp: 112,
  fp: 96,
  pf: 88,
  n: 8,
};

/** What a note sounds at when the score states no dynamic at all. `mf`, the conventional default. */
export const DEFAULT_VELOCITY = VELOCITY_BY_LEVEL.mf;

/** The MIDI velocity for one dynamic level. */
export function velocityForDynamic(level: ParsedDynamicLevel): number {
  return VELOCITY_BY_LEVEL[level] ?? DEFAULT_VELOCITY;
}

/**
 * A `<wedge>` (crescendo/diminuendo) as a straight ramp between two
 * velocities, sampled per note.
 *
 * A hairpin is drawn as a shape but heard as a change in loudness, and
 * the notes under it are the only places a host can apply it -- MIDI has
 * no "gradually get louder" message. Interpolating between the velocity
 * at the wedge's start and the one at its end is the standard reading.
 */
export function velocityWithinWedge(from: number, to: number, progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return Math.round(from + (to - from) * t);
}
