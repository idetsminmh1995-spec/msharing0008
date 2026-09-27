/**
 * part-evidence.ts — [BIN-02, OQ-B10] the fields that say WHICH
 * instrument a part is for, read straight from the file.
 *
 * `detectPart` can only be as good as what reaches it, and the things
 * that name an instrument beyond doubt -- `<instrument-sound>` and
 * `<midi-program>` -- live in the `<part-list>`, which is a part of
 * the document neither the Notation Engine nor this engine's own note
 * reader keeps: one draws music and the other reads notes, and the
 * `<part-list>` contains no music and no notes. Without this file
 * rules (1) and (2) of BIN-02 are unreachable in the real pipeline and
 * every bass would be detected by its name, which is the weakest test
 * of the four.
 *
 * Read once per file and keyed by `<score-part id>`, which is the same
 * id the `<part>` elements carry.
 */
import type { PartEvidence } from '../part-detect.js';
import type { XmlNode } from './xml.js';
import { childNamed, childNumber, childText, childrenNamed, descendants, parseXml } from './xml.js';

const STEP_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * [BIN-02] What the file says about each of its parts.
 *
 * The four sources the rule asks for, from the two places they live:
 * the `<part-list>` gives the declared sound, the GM program and the
 * names; the part's own first `<attributes>` gives the staff's line
 * count and its lowest tuned string. Anything the file does not state
 * is simply absent -- never guessed at, because a guessed value would
 * be indistinguishable from a stated one by the time it is read.
 */
export function readPartEvidence(musicXml: string): ReadonlyMap<string, PartEvidence> {
  const out = new Map<string, PartEvidence>();
  const root = parseXml(musicXml);
  if (root === undefined) return out;

  for (const [index, scorePart] of descendants(root, 'score-part').entries()) {
    const partId = scorePart.attributes['id'] ?? `P${index + 1}`;
    const instrumentSound = firstText(
      childrenNamed(scorePart, 'score-instrument').map((el) => childText(el, 'instrument-sound')),
    );
    const midiProgramXml = firstNumber(
      childrenNamed(scorePart, 'midi-instrument').map((el) => childNumber(el, 'midi-program')),
    );
    const partName = childText(scorePart, 'part-name');
    const partAbbreviation = childText(scorePart, 'part-abbreviation');
    out.set(partId, {
      ...(instrumentSound !== undefined ? { instrumentSound } : {}),
      ...(midiProgramXml !== undefined ? { midiProgramXml } : {}),
      ...(partName !== undefined && partName !== '' ? { partName } : {}),
      ...(partAbbreviation !== undefined && partAbbreviation !== '' ? { partAbbreviation } : {}),
    });
  }

  for (const [index, part] of childrenNamed(root, 'part').entries()) {
    const partId = part.attributes['id'] ?? `P${index + 1}`;
    const staff = readStaffEvidence(part);
    const arco = readArco(part);
    const already = out.get(partId) ?? {};
    out.set(partId, {
      ...already,
      ...staff,
      ...(arco ? { arco: true } : {}),
    });
  }
  return out;
}

/** The staff's line count and the pitch of its lowest string, if it is a tab staff. */
function readStaffEvidence(part: XmlNode): PartEvidence {
  for (const details of descendants(part, 'staff-details')) {
    const lines = childNumber(details, 'staff-lines');
    const tunings: number[] = [];
    for (const line of childrenNamed(details, 'staff-tuning')) {
      const lineNumber = Number(line.attributes['line'] ?? '0');
      const step = childNamed(line, 'tuning-step')?.text.trim();
      const octave = childNumber(line, 'tuning-octave');
      const semitone = step === undefined ? undefined : STEP_SEMITONES[step];
      if (semitone === undefined || octave === undefined || lineNumber < 1) continue;
      tunings.push((octave + 1) * 12 + semitone + (childNumber(line, 'tuning-alter') ?? 0));
    }
    if (lines === undefined && tunings.length === 0) continue;
    return {
      ...(lines !== undefined ? { staffLines: lines } : {}),
      ...(tunings.length > 0 ? { lowestStaffTuning: Math.min(...tunings) } : {}),
    };
  }
  return {};
}

/**
 * [BIN-02a] Whether the part is bowed.
 *
 * MusicXML has no `<arco>` element: the word is written as a direction
 * and the gesture as a bowing mark, so both are looked for. An
 * electric bass is never either, and an acoustic bass part that is
 * tells us it is an upright rather than an acoustic bass guitar.
 */
function readArco(part: XmlNode): boolean {
  if (descendants(part, 'up-bow').length > 0 || descendants(part, 'down-bow').length > 0) {
    return true;
  }
  return descendants(part, 'words').some((el) => /\barco\b/i.test(el.text));
}

function firstText(values: readonly (string | undefined)[]): string | undefined {
  return values.find((value) => value !== undefined && value !== '');
}

function firstNumber(values: readonly (number | undefined)[]): number | undefined {
  return values.find((value) => value !== undefined);
}
