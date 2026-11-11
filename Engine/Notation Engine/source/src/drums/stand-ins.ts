/**
 * stand-ins.ts — which drum takes a missing one's place on a smaller kit.
 *
 * A score is written for the kit the writer had. A video is made on the
 * kit the viewer picked, and the two are rarely the same instrument: a
 * chart may call for five toms where the kit in the photographs has
 * two. Without an answer to that, three of the five go dark -- the
 * music plays, the notation moves, and the picture simply does not
 * respond, which reads as broken rather than as missing.
 *
 * So each drum names the ones a player would actually reach for in its
 * place, nearest first. A kit that HAS the written drum always uses it;
 * this is only consulted when it does not.
 *
 *
 * WHAT IS AND IS NOT ALLOWED
 *
 * Only within a family. A missing tom is another tom, never a cymbal
 * and never the snare -- a chart's tom fill lighting up the ride would
 * be worse than nothing, because a viewer would believe it. The
 * families here are the ones a kit is actually built from: the kick,
 * the snare, the toms in pitch order, the hi-hat, the rides and the
 * crashes.
 *
 * This REVERSES an earlier rule, deliberately. The drum page used to
 * say the GM note number is never swapped, on the grounds that 35 and
 * 36 are two different kick photographs -- true, and that is exactly
 * why the written one still wins whenever the kit has it. What the old
 * rule could not express is a kit that has only ONE of them, where
 * refusing to substitute does not protect anything; it just leaves the
 * kick dark for the whole video.
 *
 *
 * THE ORDER WITHIN THE TOMS
 *
 * Toms are listed by pitch, and a missing one reaches UP before it
 * reaches down when the two are equally close. A kit with fewer toms
 * has usually kept a rack tom and a floor tom and dropped what was
 * between them, so a chart's middle toms are rack-tom parts more often
 * than floor-tom parts.
 *
 * This table is this project's own, from how a kit is laid out and how
 * drum parts are written -- it is not MuseScore's, and it is not in
 * General MIDI, which says what a number SOUNDS like and nothing about
 * what stands in for it.
 */

/**
 * The drums that may stand in for each one, nearest first.
 *
 * A drum that is absent from this table has no stand-in at all, and
 * that is a decision rather than an omission: a tambourine, a cowbell
 * or a hand clap is its own sound with no near neighbour on a kit, and
 * lighting a snare for one would be inventing a performance.
 */
const STAND_INS: Readonly<Record<number, readonly number[]>> = {
  // Kick. One kit, one kick pedal -- whichever of the two numbers it
  // was photographed under.
  35: [36],
  36: [35],

  // Snare. A side stick is played ON the snare, so the snare is the
  // right thing to light when the kit has no rim-click photograph of
  // its own; the picture shows a plain hit, which is the one liberty
  // taken here.
  37: [38, 40],
  38: [40],
  40: [38],

  // Toms, low to high: 41 low floor, 43 high floor, 45 low, 47 low-mid,
  // 48 hi-mid, 50 high.
  41: [43, 45, 47, 48, 50],
  43: [41, 45, 47, 48, 50],
  45: [47, 43, 48, 41, 50],
  47: [48, 45, 50, 43, 41],
  48: [47, 50, 45, 43, 41],
  50: [48, 47, 45, 43, 41],

  // Hi-hat: one pair of cymbals, three ways of striking it.
  42: [46, 44],
  44: [42, 46],
  46: [42, 44],

  // Rides. The bell is a part of the ride, so a kit with no bell shot
  // lights the ride itself.
  51: [59, 53],
  53: [51, 59],
  59: [51, 53],

  // Crashes. A splash and a china are their own sounds, but they are
  // crash-shaped gestures and a kit without them is better lighting a
  // crash than nothing.
  49: [57, 55, 52],
  52: [57, 49],
  55: [49, 57],
  57: [49, 55, 52],
};

/**
 * The drums that may stand in for `midiNote`, nearest first.
 *
 * Never includes `midiNote` itself: a caller tries the written drum
 * first and reaches for this only when the kit does not have it.
 */
export function drumStandIns(midiNote: number): readonly number[] {
  return STAND_INS[midiNote] ?? [];
}

/**
 * The written drum, then every stand-in: the whole order to try.
 *
 * This is what a caller normally wants, because it puts "use what was
 * written" and "use the nearest thing the kit has" in one list that
 * cannot be read in the wrong order.
 */
export function drumChoiceOrder(midiNote: number): readonly number[] {
  return [midiNote, ...drumStandIns(midiNote)];
}

/**
 * The drum from `available` that should be lit for a written
 * `midiNote`, or undefined when the kit has nothing near enough.
 *
 * `available` is whatever the kit really holds -- for the drum page,
 * the MIDI numbers its photographs are named after.
 */
export function drumToLight(midiNote: number, available: ReadonlySet<number>): number | undefined {
  for (const candidate of drumChoiceOrder(midiNote)) {
    if (available.has(candidate)) return candidate;
  }
  return undefined;
}
