/**
 * technical.ts — the guitar data inside a `<note>` (Plan IN-X03..06).
 *
 * MusicXML keeps how a note is PLAYED in `<notations>`: which string,
 * which fret, which finger, and the links that join two notes into a
 * hammer-on or a slide. This file reads exactly that and nothing else,
 * so no later stage ever has to look at XML again.
 *
 * Phase 1 reads what Phase 1 uses: `<string>`, `<fret>`, `<fingering>`,
 * `<down-bow>`/`<up-bow>` (RH-P04), and the legato links a picking
 * hand has to know about (RH-P03). `<pluck>`, bends, taps and
 * harmonics arrive with the phases that can draw them.
 */
import type { LHFinger, StringIndex } from '../../core/types.js';
import { musicXmlStringToInternal } from '../../core/tuning.js';
import type { XmlNode } from './xml.js';
import { childNamed, childNumber, childText, childrenNamed, descendants } from './xml.js';

export interface TechnicalWarning {
  readonly code: string;
  readonly message: string;
}

/**
 * One end of a link between two notes, as the FILE writes it.
 *
 * MusicXML marks a hammer-on, a pull-off or a slide twice: `start` on
 * the note that leaves and `stop` on the note that arrives. Which note
 * is at the other end is not in the element, so the parser pairs them
 * up afterwards and fills in the plan's `toNoteId`/`fromNoteId`.
 */
export interface TechnicalLinkEnd {
  readonly type: 'hammerOn' | 'pullOff' | 'slide';
  readonly role: 'start' | 'stop';
}

export interface NoteTechnical {
  readonly lockedString?: StringIndex;
  readonly lockedFret?: number;
  readonly lockedFinger?: LHFinger;
  readonly lockedPickDir?: 'down' | 'up';
  readonly links: readonly TechnicalLinkEnd[];
  readonly warnings: readonly TechnicalWarning[];
}

/**
 * [IN-X06] `<fingering>` for a fretted instrument is the LEFT hand.
 *
 * "0" means an open string, which is a real answer and not a missing
 * one. "T"/"t" is the thumb over the top. Anything else is a token
 * this engine does not know, and it says so rather than guessing.
 */
function readFingering(nodes: readonly XmlNode[]): {
  finger?: LHFinger;
  warnings: TechnicalWarning[];
} {
  const warnings: TechnicalWarning[] = [];
  // The first one that is not an alternative fingering (IN-X06).
  const chosen = nodes.find((node) => node.attributes['alternate'] !== 'yes') ?? nodes[0];
  if (chosen === undefined) return { warnings };
  const token = chosen.text.trim();
  if (token === '0') return { warnings }; // open string: no finger, and that is the answer
  if (token === '1' || token === '2' || token === '3' || token === '4') {
    return { finger: Number(token) as LHFinger, warnings };
  }
  if (token === 'T' || token === 't') return { finger: 'T', warnings };
  warnings.push({
    code: 'UNKNOWN_FINGERING_TOKEN',
    message: `<fingering> says "${token}", which is not a finger this engine knows`,
  });
  return { warnings };
}

/**
 * Read one `<note>`'s guitar data.
 *
 * `numStrings` decides the string-number conversion (IN-X03): the
 * file counts from the thin E, this engine from the thick one, and
 * the answer depends on how many strings the instrument has.
 */
export function readTechnical(note: XmlNode, numStrings: number): NoteTechnical {
  const notations = childrenNamed(note, 'notations');
  const warnings: TechnicalWarning[] = [];
  const links: TechnicalLinkEnd[] = [];
  let lockedString: StringIndex | undefined;
  let lockedFret: number | undefined;
  let lockedFinger: LHFinger | undefined;
  let lockedPickDir: 'down' | 'up' | undefined;

  for (const notation of notations) {
    const technical = childNamed(notation, 'technical');
    if (technical !== undefined) {
      const xmlString = childNumber(technical, 'string');
      if (xmlString !== undefined) lockedString = musicXmlStringToInternal(xmlString, numStrings);
      const fret = childNumber(technical, 'fret');
      if (fret !== undefined) lockedFret = fret;
      const fingering = readFingering(childrenNamed(technical, 'fingering'));
      if (fingering.finger !== undefined) lockedFinger = fingering.finger;
      warnings.push(...fingering.warnings);
      if (childNamed(technical, 'down-bow') !== undefined) lockedPickDir = 'down';
      if (childNamed(technical, 'up-bow') !== undefined) lockedPickDir = 'up';

      for (const [element, type] of [
        ['hammer-on', 'hammerOn'],
        ['pull-off', 'pullOff'],
      ] as const) {
        for (const link of childrenNamed(technical, element)) {
          links.push({ type, role: link.attributes['type'] === 'stop' ? 'stop' : 'start' });
        }
      }
    }

    // A slide or a glissando lives in <notations>, not in <technical>.
    for (const element of ['slide', 'glissando']) {
      for (const link of childrenNamed(notation, element)) {
        links.push({ type: 'slide', role: link.attributes['type'] === 'stop' ? 'stop' : 'start' });
      }
    }
  }

  return {
    ...(lockedString !== undefined ? { lockedString } : {}),
    ...(lockedFret !== undefined ? { lockedFret } : {}),
    ...(lockedFinger !== undefined ? { lockedFinger } : {}),
    ...(lockedPickDir !== undefined ? { lockedPickDir } : {}),
    links,
    warnings,
  };
}

/** Whether this `<note>` carries a `<tie>` of the given kind (IN-X22). */
export function hasTie(note: XmlNode, type: 'start' | 'stop'): boolean {
  if (childrenNamed(note, 'tie').some((tie) => tie.attributes['type'] === type)) return true;
  // Some exporters only write the notated <tied> element inside <notations>.
  return descendants(note, 'tied').some((tied) => tied.attributes['type'] === type);
}

/** [IN-X20] A `<chord/>` note starts with the note before it. */
export function isChordMember(note: XmlNode): boolean {
  return childNamed(note, 'chord') !== undefined;
}

/** [IN-X23] A `<grace/>` note has no written duration of its own. */
export function isGrace(note: XmlNode): boolean {
  return childNamed(note, 'grace') !== undefined;
}

/** [IN-X24] A rest sounds nothing, but it still moves the cursor. */
export function isRest(note: XmlNode): boolean {
  return childNamed(note, 'rest') !== undefined;
}

/** The sounding MIDI pitch written on the page, before `<transpose>` (IN-X12). */
export function writtenPitch(note: XmlNode): number | undefined {
  const pitch = childNamed(note, 'pitch');
  if (pitch === undefined) return undefined;
  const step = childText(pitch, 'step');
  const octave = childNumber(pitch, 'octave');
  if (step === undefined || octave === undefined) return undefined;
  const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step];
  if (semitone === undefined) return undefined;
  return (octave + 1) * 12 + semitone + (childNumber(pitch, 'alter') ?? 0);
}
