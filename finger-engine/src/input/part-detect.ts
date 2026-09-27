/**
 * part-detect.ts — [BIN-02] is this part a bass?
 *
 * It matters more than it sounds. A bass part solved as a guitar puts
 * every note twelve frets out, and the result still looks like a
 * playable part -- which is the kind of wrong nobody catches by
 * looking at the video.
 *
 * Four tests, in order, because they differ in how much they can be
 * trusted: what the file DECLARES beats what its numbers imply, and a
 * name beats nothing at all.
 */

export type PartKind = 'bass' | 'guitar' | 'upright' | 'other';

export interface PartEvidence {
  /** `<score-instrument><instrument-sound>`, e.g. `pluck.bass.electric`. */
  readonly instrumentSound?: string;
  /** MusicXML `<midi-program>`: ONE-based, 1..128. */
  readonly midiProgramXml?: number;
  /** General MIDI program: ZERO-based, 0..127. */
  readonly midiProgram?: number;
  readonly partName?: string;
  readonly partAbbreviation?: string;
  readonly trackName?: string;
  /** A tab staff's line count, when the part has one. */
  readonly staffLines?: number;
  /** The lowest `<staff-tuning>` pitch on that staff. */
  readonly lowestStaffTuning?: number;
  /** True when the part is marked arco (bowed), which an electric bass never is. */
  readonly arco?: boolean;
}

export interface PartDetection {
  readonly kind: PartKind;
  /** 0..1 -- how much the evidence that decided it can be trusted. */
  readonly confidence: number;
  readonly reasons: readonly string[];
  /** [BIN-09] What the GM program suggests about the right hand, when it says. */
  readonly rightHandHint?: 'fingerstyle' | 'pick' | 'slap';
  readonly fretlessHint?: boolean;
}

const BASS_NAME = /bass|bajo|basse|baixo|b\.?\s?gtr|e\.?\s?bass/i;
/** [BIN-02a] Not an electric bass, whatever its name says. */
const UPRIGHT_NAME = /double\s?bass|contrabass|upright/i;

/** [BIN-09] What each General MIDI bass program suggests. */
const GM_BASS: Readonly<
  Record<number, { hand: 'fingerstyle' | 'pick' | 'slap'; fretless?: boolean; simandl?: boolean }>
> = {
  32: { hand: 'fingerstyle', simandl: true }, // Acoustic Bass
  33: { hand: 'fingerstyle' }, // Electric Bass (finger)
  34: { hand: 'pick' }, // Electric Bass (pick)
  35: { hand: 'fingerstyle', fretless: true }, // Fretless Bass
  36: { hand: 'slap' }, // Slap Bass 1
  37: { hand: 'slap' }, // Slap Bass 2
  38: { hand: 'fingerstyle' }, // Synth Bass 1
  39: { hand: 'fingerstyle' }, // Synth Bass 2
};

/**
 * [BIN-02] Which instrument a part is for.
 *
 * The tests run in the order the plan lists them and the FIRST one
 * that fires decides, rather than a vote: a file that declares
 * `pluck.bass.electric` is a bass even if somebody called the part
 * "Gtr 2", and a name is only consulted when nothing better exists.
 */
export function detectPart(evidence: PartEvidence): PartDetection {
  const reasons: string[] = [];
  const program =
    evidence.midiProgram ??
    (evidence.midiProgramXml === undefined ? undefined : evidence.midiProgramXml - 1);
  const named = `${evidence.partName ?? ''} ${evidence.partAbbreviation ?? ''} ${evidence.trackName ?? ''}`;
  const sound = evidence.instrumentSound ?? '';

  // [BIN-02a] The exclusions come first: an upright IS a bass by
  // every test below, and analysing one as an electric would put a
  // fretting hand on a neck that has no frets and is a metre long.
  if (UPRIGHT_NAME.test(named)) {
    return { kind: 'upright', confidence: 0.9, reasons: ['UPRIGHT_NAME'] };
  }
  if (sound === 'pluck.bass.acoustic' && evidence.arco === true) {
    return { kind: 'upright', confidence: 0.8, reasons: ['ACOUSTIC_BASS_ARCO'] };
  }

  // (1) What the file declares.
  if (sound.startsWith('pluck.bass')) {
    reasons.push('INSTRUMENT_SOUND');
    return {
      kind: 'bass',
      confidence: 0.98,
      reasons,
      ...(sound === 'pluck.bass.fretless' ? { fretlessHint: true } : {}),
    };
  }

  // (2) The General MIDI program.
  if (program !== undefined && GM_BASS[program] !== undefined) {
    const hint = GM_BASS[program] as { hand: 'fingerstyle' | 'pick' | 'slap'; fretless?: boolean };
    reasons.push('GM_PROGRAM');
    return {
      kind: 'bass',
      confidence: 0.9,
      reasons,
      rightHandHint: hint.hand,
      ...(hint.fretless === true ? { fretlessHint: true } : {}),
    };
  }

  // (3) The name.
  if (BASS_NAME.test(named)) {
    reasons.push('PART_NAME');
    return { kind: 'bass', confidence: 0.6, reasons };
  }

  // (4) A tab staff tuned like a bass. Four to six lines whose lowest
  // string is at or below E1 -- a guitar's lowest is E2, an octave up,
  // so there is no overlap to get wrong.
  const lines = evidence.staffLines;
  const lowest = evidence.lowestStaffTuning;
  if (lines !== undefined && lines >= 4 && lines <= 6 && lowest !== undefined && lowest <= 28) {
    reasons.push(lowest <= 23 ? 'TAB_TUNING_BELOW_B0' : 'TAB_TUNING_BELOW_E1');
    return { kind: 'bass', confidence: 0.85, reasons };
  }

  if (program !== undefined && program >= 24 && program <= 31) {
    return { kind: 'guitar', confidence: 0.85, reasons: ['GM_PROGRAM'] };
  }
  if (/guitar|gtr|guitarra/i.test(named)) {
    return { kind: 'guitar', confidence: 0.6, reasons: ['PART_NAME'] };
  }
  return { kind: 'other', confidence: 0.2, reasons: ['NO_EVIDENCE'] };
}
