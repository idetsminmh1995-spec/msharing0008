/**
 * tuning.ts — strings, and the three different ways the world numbers
 * them.
 *
 * This file exists because of one bug waiting to happen: MusicXML
 * numbers strings from the HIGHEST (its `<string>1</string>` is the
 * thin E), `<staff-tuning line="1">` describes the LOWEST, and this
 * engine numbers from the lowest [DM-01]. A file read with the wrong
 * one puts every note on the wrong string, and the result still looks
 * like a guitar part, which is what makes it dangerous.
 *
 * Every conversion is here, named after the rule it implements, and
 * every one has a unit test [Phase 0 done-when].
 */
import type { InstrumentSpec, StringIndex } from './types.js';

/** Standard tuning [P-004], index 0 = string 1 = low E2. */
export const STANDARD_TUNING: readonly number[] = [40, 45, 50, 55, 59, 64];

/** A few tunings people actually use. The UI may offer more. */
export const TUNING_PRESETS: Readonly<Record<string, readonly number[]>> = {
  standard: STANDARD_TUNING,
  dropD: [38, 45, 50, 55, 59, 64],
  openG: [38, 43, 50, 55, 59, 62],
  dadgad: [38, 45, 50, 55, 57, 62],
  halfStepDown: [39, 44, 49, 54, 58, 63],
  sevenString: [35, 40, 45, 50, 55, 59, 64],
};

/**
 * [IN-X03] MusicXML `<string>` to this engine's numbering.
 *
 * MusicXML's 1 is the highest-pitched string; ours is the lowest.
 */
export function musicXmlStringToInternal(xmlString: number, numStrings: number): StringIndex {
  return numStrings + 1 - xmlString;
}

/** The same conversion the other way, for writing MusicXML back out. */
export function internalStringToMusicXml(internal: StringIndex, numStrings: number): number {
  return numStrings + 1 - internal;
}

/**
 * [IN-X03] `<staff-tuning line="N">` to this engine's numbering.
 *
 * A tab staff's line 1 is the BOTTOM line, which carries the lowest
 * string -- the same end this engine starts from, so the number
 * passes through. It is a function anyway, so the assumption is
 * written down and tested rather than remembered.
 */
export function staffTuningLineToInternal(line: number): StringIndex {
  return line;
}

/**
 * [IN-E04] The Notation Engine's string numbering to this engine's.
 *
 * Checked in Phase 0 against the engine's own parser: it stores
 * `<string>` exactly as the file wrote it (`stringNumber`), so its
 * numbering IS MusicXML's and the conversion is the same one. If that
 * ever changes, this is the single place that changes with it.
 */
export function notationEngineStringToInternal(
  notationString: number,
  numStrings: number,
): StringIndex {
  return musicXmlStringToInternal(notationString, numStrings);
}

/**
 * This engine's numbering to the one the SVG fretboard draws with.
 *
 * The renderer draws string 1 at the top and means the THINNEST by it
 * [OUT-05 leaves that choice to the renderer], so the timeline's
 * string numbers are flipped on the way in.
 */
export function internalStringToRenderer(internal: StringIndex, numStrings: number): number {
  return numStrings + 1 - internal;
}

/** The open-string pitch of a string, or undefined if the instrument has no such string. */
export function openPitch(instrument: InstrumentSpec, string: StringIndex): number | undefined {
  return instrument.tuning[string - 1];
}

/**
 * [V-01] The pitch a string and fret actually sound.
 *
 * The capo does not enter here: frets are physical, counted from the
 * nut [DM-02], and a capoed note is stored at its physical fret.
 */
export function pitchAt(
  instrument: InstrumentSpec,
  string: StringIndex,
  fret: Fret,
): number | undefined {
  const open = openPitch(instrument, string);
  return open === undefined ? undefined : open + fret;
}

type Fret = number;

/**
 * Every place a pitch can be played on this instrument.
 *
 * The whole reason the engine exists: a guitar offers the same note in
 * several places, and choosing between them is the job. Sorted by
 * string, low to high, which is only for reproducibility -- the
 * solver decides, not this order.
 */
export function placementsForPitch(
  instrument: InstrumentSpec,
  pitch: number,
): readonly { string: StringIndex; fret: Fret }[] {
  const out: { string: StringIndex; fret: Fret }[] = [];
  const lowestFret = Math.max(0, instrument.capo);
  for (let string = 1; string <= instrument.numStrings; string++) {
    const open = openPitch(instrument, string);
    if (open === undefined) continue;
    const fret = pitch - open;
    if (fret < lowestFret || fret > instrument.numFrets) continue;
    if (!Number.isInteger(fret)) continue;
    out.push({ string, fret });
  }
  return out;
}

/** The instrument's lowest and highest playable pitch, for [IN-N] out-of-range checks. */
export function pitchRange(instrument: InstrumentSpec): { lowest: number; highest: number } {
  const open = instrument.tuning;
  const lowest = Math.min(...open) + Math.max(0, instrument.capo);
  const highest = Math.max(...open) + instrument.numFrets;
  return { lowest, highest };
}
