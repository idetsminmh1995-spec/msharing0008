/**
 * fingering.ts — which finger plays which note.
 *
 * The hands on the keyboard are not decoration: a viewer watching them
 * is reading the fingering, so a finger that lands on a key nobody
 * would use it for teaches the wrong thing. This works it out the way
 * a player would, from where the hand already is.
 *
 * Solved ONCE for the whole piece rather than per frame. A per-frame
 * answer has no memory, so a hand would re-decide its fingering between
 * one sixteenth and the next and the fingers would flicker. Walking the
 * notes in time order instead gives every hand a POSITION that moves
 * when the music makes it move, and that is what reads as a person
 * playing rather than as five lights taking turns.
 *
 *
 * THE TWO HANDS COUNT OPPOSITE WAYS
 *
 * Both hands number thumb 1 to little finger 5, and the thumb is on the
 * INSIDE of each -- so for the right hand the fingers run low to high
 * across the keyboard and for the left hand they run high to low. That
 * one difference is most of this file: everything else is the same
 * arithmetic read in the other direction.
 */

import { isBlackKey } from './keyboard.js';
import type { Hand, PianoNote } from './types.js';

/** Thumb, index, middle, ring, little. */
export type Finger = 1 | 2 | 3 | 4 | 5;

export const FINGERS: readonly Finger[] = [1, 2, 3, 4, 5];

/**
 * The white key a MIDI note belongs to, counted from A0, with black
 * keys folded onto the white key below them.
 *
 * Fingers are spaced by WHITE keys -- a hand spanning an octave covers
 * eight of them whatever accidentals are in it -- so this is the ruler
 * the whole file measures with. A black key takes the index of the
 * white key to its left because that is where the finger reaching it
 * comes from.
 */
export function whiteIndex(midi: number): number {
  const WHITES_BELOW_C = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const octave = Math.floor(midi / 12);
  const step = ((midi % 12) + 12) % 12;
  return octave * 7 + (WHITES_BELOW_C[step] ?? 0);
}

/** A hand reaches five white keys without stretching. */
const SPAN = 5;

/**
 * Which finger, measured from where the hand sits.
 *
 * `anchor` is the white key under the thumb. The right hand's fingers
 * go up from it; the left hand's go down.
 */
function fingerAt(hand: Hand, anchor: number, white: number): number {
  return hand === 'right' ? white - anchor + 1 : anchor - white + 1;
}

/** Where the thumb has to be for `finger` to reach `white`. */
function anchorFor(hand: Hand, white: number, finger: number): number {
  return hand === 'right' ? white - finger + 1 : white + finger - 1;
}

/** One note, with the finger that plays it. */
export interface FingeredNote extends PianoNote {
  readonly finger: Finger;
}

/** Where a hand sits at one moment: the white key under its thumb. */
export interface HandAnchor {
  readonly seconds: number;
  readonly anchor: number;
}

export interface FingeringPlan {
  readonly notes: readonly FingeredNote[];
  /** Every move each hand makes, in time order, for the drawing to follow. */
  readonly anchors: Readonly<Record<Hand, readonly HandAnchor[]>>;
}

/** Notes that start at the same moment are one reach of the hand. */
function groupByStart(notes: readonly PianoNote[]): PianoNote[][] {
  const byStart = new Map<number, PianoNote[]>();
  for (const note of notes) {
    // A hundredth of a second: two notes written together can arrive a
    // rounding apart, and they are still one chord to a hand.
    const key = Math.round(note.startSeconds * 100);
    const group = byStart.get(key);
    if (group === undefined) byStart.set(key, [note]);
    else group.push(note);
  }
  return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
}

/**
 * Five fingers spread across a chord too wide to take them in order.
 *
 * The outer notes get the thumb and the little finger, because those
 * are the two that reach, and what is in between is spaced across the
 * rest. A four-note octave chord comes out 1-2-3-5, which is what a
 * player uses, and not 1-3-5-5, which is what counting outwards from
 * the thumb gives you once the counting runs past five.
 */
function spreadFingers(count: number): Finger[] {
  const sets: Record<number, Finger[]> = {
    1: [3],
    2: [1, 5],
    3: [1, 3, 5],
    4: [1, 2, 3, 5],
    5: [1, 2, 3, 4, 5],
  };
  const set = sets[count];
  if (set !== undefined) return set;
  // More notes than fingers is not playable by one hand; give each
  // what it can have and let the drawing show the pile-up rather than
  // invent a sixth finger.
  const out: Finger[] = [];
  for (let i = 0; i < count; i += 1) out.push(Math.min(5, i + 1) as Finger);
  return out;
}

/**
 * The fingers for one chord, given where the hand is.
 *
 * Notes are taken in the order the hand meets them -- low to high for
 * the right, high to low for the left -- and each is offered the finger
 * its distance from the thumb asks for. No two notes may have the same
 * finger: a finger cannot play two keys. When the chord is wider than
 * the hand the wanted fingers run past five and the whole chord is
 * re-spaced across the five instead, which is what a player does with
 * an octave.
 */
function fingersForChord(hand: Hand, anchor: number, chord: readonly PianoNote[]): Finger[] {
  const order = [...chord].sort((a, b) => (hand === 'right' ? a.midi - b.midi : b.midi - a.midi));

  let out: Finger[] = [];
  let lowest = 0;
  let fits = true;
  for (const note of order) {
    const wanted = fingerAt(hand, anchor, whiteIndex(note.midi));
    const finger = Math.min(5, Math.max(lowest + 1, Math.max(1, Math.round(wanted))));
    if (finger <= lowest) {
      fits = false;
      break;
    }
    out.push(finger as Finger);
    lowest = finger;
  }
  if (!fits || out.length !== order.length) out = spreadFingers(order.length);

  // Read back in the order the caller gave them.
  const byNote = new Map<PianoNote, Finger>();
  order.forEach((note, i) => byNote.set(note, out[i] ?? 3));
  return chord.map((note) => byNote.get(note) ?? 3);
}

/** The white keys a run of chords covers, low to high. */
function handSpan(chords: readonly (readonly PianoNote[])[]): { low: number; high: number } {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const chord of chords) {
    for (const note of chord) {
      const white = whiteIndex(note.midi);
      if (white < low) low = white;
      if (white > high) high = white;
    }
  }
  return { low, high };
}

/**
 * Where the hand sits to cover a stretch of keys.
 *
 * Centred, not cornered: five fingers over a two-key phrase play it
 * with the middle fingers, the way a hand resting on the keys does,
 * rather than reaching everything with the thumb. The arithmetic falls
 * out of that one rule -- put the middle finger on the middle of the
 * passage -- and it gives the textbook fingerings for free: a
 * five-key scale comes out 1-2-3-4-5 in the right hand and 5-4-3-2-1
 * in the left, because a five-key span centred on finger 3 puts the
 * thumb exactly on its near end.
 *
 * A stretch wider than the hand cannot be centred, so the hand sits on
 * the near end and the outer fingers stretch for the rest.
 */
function anchorForSpan(hand: Hand, low: number, high: number): number {
  if (high - low >= SPAN) return anchorFor(hand, hand === 'right' ? low : high, 1);
  return anchorFor(hand, (low + high) / 2, 3);
}

/**
 * Fingers for every note, and the path each hand takes to play them.
 *
 * Notes of a hand that never plays are still returned (with a finger)
 * so a caller can rely on every note having one.
 */
export function planFingering(notes: readonly PianoNote[]): FingeringPlan {
  const fingered: FingeredNote[] = [];
  const anchors: Record<Hand, HandAnchor[]> = { left: [], right: [] };

  for (const hand of ['left', 'right'] as const) {
    const mine = notes.filter((note) => note.hand === hand);
    if (mine.length === 0) continue;
    const groups = groupByStart(mine);

    // A hand plays in REACHES, not note by note: it settles over the
    // keys the next few chords need and stays there until the music
    // leaves them. Deciding one note at a time is what makes a drawn
    // hand crawl up the keyboard a key per note, thumb on everything.
    let from = 0;
    while (from < groups.length) {
      let to = from;
      let { low, high } = handSpan([groups[from] ?? []]);
      while (to + 1 < groups.length) {
        const next = handSpan([groups[to + 1] ?? []]);
        const wide = Math.max(high, next.high) - Math.min(low, next.low);
        if (wide >= SPAN) break; // out of reach: the hand has to move
        low = Math.min(low, next.low);
        high = Math.max(high, next.high);
        to += 1;
      }

      const anchor = anchorForSpan(hand, low, high);
      const first = groups[from]?.[0]?.startSeconds ?? 0;
      anchors[hand].push({ seconds: first, anchor });
      for (let i = from; i <= to; i += 1) {
        const chord = groups[i] ?? [];
        const fingers = fingersForChord(hand, anchor, chord);
        chord.forEach((note, n) => fingered.push({ ...note, finger: fingers[n] ?? 3 }));
      }
      from = to + 1;
    }
  }

  fingered.sort((a, b) => a.startSeconds - b.startSeconds || a.midi - b.midi);
  return { notes: fingered, anchors: { left: anchors.left, right: anchors.right } };
}

/**
 * Where a hand is at `seconds`, sliding between the positions it holds.
 *
 * A hand does not teleport between chords and it does not drift for a
 * whole bar either: it stays put, then moves over `travelSeconds` into
 * the next position, arriving as the chord sounds. That arrival is the
 * point -- a hand that is still moving when the note speaks looks like
 * it missed it.
 */
export function anchorAt(
  path: readonly HandAnchor[],
  seconds: number,
  travelSeconds = 0.18,
): number | undefined {
  if (path.length === 0) return undefined;
  const first = path[0];
  if (first === undefined) return undefined;
  if (seconds <= first.seconds) return first.anchor;

  let previous = first;
  for (const step of path) {
    if (step.seconds > seconds) {
      if (step.anchor === previous.anchor) return previous.anchor;
      const start = step.seconds - travelSeconds;
      if (seconds <= start) return previous.anchor;
      const t = (seconds - start) / travelSeconds;
      // Ease in and out, because a hand accelerates off one key and
      // settles onto the next rather than sliding at one speed.
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return previous.anchor + (step.anchor - previous.anchor) * eased;
    }
    previous = step;
  }
  return previous.anchor;
}

/** The notes a hand is holding at `seconds`, with their fingers. */
export function fingersDownAt(
  notes: readonly FingeredNote[],
  hand: Hand,
  seconds: number,
): ReadonlyMap<Finger, number> {
  const down = new Map<Finger, number>();
  for (const note of notes) {
    if (note.hand !== hand) continue;
    if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
    // A black key wins a tie: it is the one a finger is visibly reaching
    // for, and two notes on one finger cannot both be drawn.
    const held = down.get(note.finger);
    if (held === undefined || (isBlackKey(note.midi) && !isBlackKey(held))) {
      down.set(note.finger, note.midi);
    }
  }
  return down;
}
