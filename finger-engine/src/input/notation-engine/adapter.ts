/**
 * adapter.ts — the Notation Engine's score, as notes this engine can solve
 * (Plan IN-E01..06).
 *
 * [D-011] The Notation Engine is the single source of note order and
 * timing for the whole app: it draws the staff, it drives the cursor,
 * and it unrolls repeats. If the finger engine worked out its own
 * order or its own times, the dots and the cursor would drift apart on
 * the first repeat, and a viewer would see the hand playing a bar the
 * playhead has already left. So this adapter takes what the notation
 * layer already decided and adds only what it does not keep.
 *
 * It does NOT import the Notation Engine. The types below describe the
 * shape it reads -- the fields, not the package -- so the two engines
 * stay separately buildable and a change to notation's internals that
 * keeps these fields cannot break this one.
 */
import type {
  LHFinger,
  NoteEvent,
  ParsedPart,
  TechniqueLink,
  TimeSignatureChange,
} from '../../core/types.js';
import { tempoMap, tickToSeconds, type TempoMap } from '../../core/tempo.js';
import { notationEngineStringToInternal } from '../../core/tuning.js';
import type { EngineWarning } from '../../core/timeline-schema.js';
import { childNamed, childNumber, childrenNamed, parseXml } from '../musicxml/xml.js';

/** What a notation pitch looks like: step, alteration, octave -- MusicXML's own three. */
export interface NotationPitchLike {
  readonly kind?: string;
  readonly step?: string;
  readonly alter?: number;
  readonly octave?: number;
}

export interface NotationNoteLike {
  readonly kind?: string;
  readonly pitch?: NotationPitchLike;
  readonly duration?: { readonly ticks?: number };
  readonly voice?: number | string;
  readonly startTick?: number;
  /** [IN-E04] MusicXML's numbering: 1 is the HIGHEST string. Converted on the way in. */
  readonly stringNumber?: number;
  readonly fret?: number;
  readonly fingering?: number;
  readonly slideStart?: boolean;
  readonly slideStop?: boolean;
  readonly tieStart?: boolean;
  readonly tieStop?: boolean;
  /** Chord members, when this event is a chord. */
  readonly notes?: readonly NotationNoteLike[];
}

export interface NotationVoiceLike {
  readonly id?: number | string;
  readonly events?: readonly NotationNoteLike[];
}

export interface NotationMeasureLike {
  readonly number?: number;
  readonly voices?: readonly NotationVoiceLike[];
}

export interface NotationPartLike {
  readonly id?: string;
  readonly name?: string;
  readonly measures?: readonly NotationMeasureLike[];
}

export interface NotationScoreLike {
  readonly parts?: readonly NotationPartLike[];
}

/** The playback data the Notation Engine computes for the cursor and the audio. */
export interface NotationPlaybackLike {
  readonly tempoMap?: {
    readonly segments?: readonly {
      readonly startTick?: number;
      readonly microsecondsPerQuarter?: number;
    }[];
  };
  readonly timeSignatureByMeasure?: ReadonlyMap<
    number,
    { readonly numerator: number; readonly denominator: number }
  >;
  readonly globalTickOffsetByMeasure?: ReadonlyMap<number, number>;
  /** [IN-E01] the written score unrolled into the order it is played. */
  readonly performance?: {
    readonly entries?: readonly {
      readonly measureNumber?: number;
      readonly writtenTick?: number;
      readonly startSeconds?: number;
      readonly writtenStartSeconds?: number;
      readonly pass?: number;
    }[];
  };
}

export interface NotationAdapterOptions {
  /**
   * [IN-E02] The MusicXML the Notation Engine read.
   *
   * It keeps `<string>`, `<fret>`, `<fingering>` and slides, but not
   * `<transpose>`, `<staff-tuning>` or `<capo>`, so those are read
   * from the file itself and attached by part.
   */
  readonly musicXml?: string;
  readonly numStrings?: number;
}

export interface NotationAdapterResult {
  readonly parts: readonly ParsedPart[];
  readonly warnings: readonly EngineWarning[];
}

const STEP_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function midiOf(pitch: NotationPitchLike | undefined): number | undefined {
  if (pitch === undefined || (pitch.kind !== undefined && pitch.kind !== 'pitched'))
    return undefined;
  const step = pitch.step === undefined ? undefined : STEP_SEMITONES[pitch.step];
  if (step === undefined || pitch.octave === undefined) return undefined;
  return (pitch.octave + 1) * 12 + step + (pitch.alter ?? 0);
}

function toTempoMap(playback: NotationPlaybackLike): TempoMap {
  const segments = (playback.tempoMap?.segments ?? [])
    .filter((segment) => segment.microsecondsPerQuarter !== undefined)
    .map((segment) => ({
      startTick: segment.startTick ?? 0,
      microsecondsPerQuarter: segment.microsecondsPerQuarter as number,
    }));
  return tempoMap(480, segments);
}

interface WrittenNote {
  readonly measure: number;
  readonly voice: string;
  readonly startTick: number;
  readonly durationTicks: number;
  readonly pitch: number;
  readonly note: NotationNoteLike;
  readonly notationNoteId: string;
}

/**
 * [IN-E01/E05] A Notation Engine score, as parts of notes in PERFORMANCE order.
 *
 * `tick` stays the WRITTEN tick -- where the note is on the page, so
 * time signatures and the tempo map still line up with it -- while
 * `time` is the second it is actually heard. A note played twice by a
 * repeat therefore appears twice, with the same written tick, two
 * different times, and two different `noteId`s: the second carries
 * `#r2` [IN-E05], and both carry the same `notationNoteId` so the
 * video can light the note on the staff and the dot on the neck
 * together [IN-E03].
 */
export function fromNotationEngine(
  score: NotationScoreLike,
  playback: NotationPlaybackLike,
  options: NotationAdapterOptions = {},
): NotationAdapterResult {
  const warnings: EngineWarning[] = [];
  const map = toTempoMap(playback);
  const numStrings = options.numStrings ?? 6;
  const fromFile = readFileOnlyFields(options.musicXml);
  const offsets = playback.globalTickOffsetByMeasure;

  const entries = (playback.performance?.entries ?? []).filter(
    (entry) => entry.measureNumber !== undefined,
  );
  const parts: ParsedPart[] = [];

  for (const [partIndex, part] of (score.parts ?? []).entries()) {
    const partId = part.id ?? `P${partIndex + 1}`;
    const written = readWrittenNotes(part, partId);
    const byMeasure = new Map<number, WrittenNote[]>();
    for (const note of written) {
      const list = byMeasure.get(note.measure);
      if (list === undefined) byMeasure.set(note.measure, [note]);
      else list.push(note);
    }

    const extra = fromFile.get(partId) ?? fromFile.get(`P${partIndex + 1}`);
    const transpose = extra?.transposeSemitones ?? 0;
    const notes: NoteEvent[] = [];

    const plan =
      entries.length > 0
        ? entries
        : [...byMeasure.keys()]
            .sort((a, b) => a - b)
            .map((measureNumber) => ({
              measureNumber,
              writtenTick: offsets?.get(measureNumber) ?? 0,
              startSeconds: undefined,
              writtenStartSeconds: undefined,
              pass: 1,
            }));

    for (const entry of plan) {
      const measureNumber = entry.measureNumber as number;
      const measureWrittenTick = entry.writtenTick ?? offsets?.get(measureNumber) ?? 0;
      const measureWrittenSeconds =
        entry.writtenStartSeconds ?? tickToSeconds(map, measureWrittenTick);
      const measureSeconds = entry.startSeconds ?? measureWrittenSeconds;
      const pass = entry.pass ?? 1;

      for (const note of byMeasure.get(measureNumber) ?? []) {
        const writtenTick = measureWrittenTick + note.startTick;
        const startSeconds =
          measureSeconds + (tickToSeconds(map, writtenTick) - measureWrittenSeconds);
        const endSeconds =
          measureSeconds +
          (tickToSeconds(map, writtenTick + note.durationTicks) - measureWrittenSeconds);
        const finger = fingerOf(note.note.fingering);
        const string =
          note.note.stringNumber === undefined
            ? undefined
            : notationEngineStringToInternal(note.note.stringNumber, numStrings);

        notes.push({
          noteId: pass > 1 ? `${note.notationNoteId}#r${pass}` : note.notationNoteId,
          notationNoteId: note.notationNoteId,
          pitch: note.pitch + transpose,
          tick: writtenTick,
          durationTicks: note.durationTicks,
          time: startSeconds,
          duration: Math.max(0, endSeconds - startSeconds),
          voice: Number(note.voice) || 1,
          ...(string !== undefined ? { lockedString: string } : {}),
          ...(note.note.fret !== undefined ? { lockedFret: note.note.fret } : {}),
          ...(finger !== undefined ? { lockedFinger: finger } : {}),
          techniques: [],
          sourceRef: {
            format: 'musicxml',
            part: partId,
            measure: measureNumber,
            index: notes.length,
          },
        });
      }
    }

    notes.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
    const linked = pairSlides(notes, written);
    const hasTab = linked.some(
      (note) => note.lockedString !== undefined && note.lockedFret !== undefined,
    );

    parts.push({
      partId,
      name: part.name ?? partId,
      instrumentHint: {
        ...(extra?.tuning !== undefined
          ? { tuning: extra.tuning, numStrings: extra.tuning.length }
          : {}),
        ...(extra?.capo !== undefined ? { capo: extra.capo } : {}),
      },
      notes: linked,
      tempoMap: map,
      timeSignatures: readTimeSignatures(playback),
      hasTab,
    });
  }

  if (parts.length === 0) {
    warnings.push({ code: 'NO_PARTS', message: 'the notation score has no parts to read' });
  }
  return { parts, warnings };
}

function readWrittenNotes(part: NotationPartLike, partId: string): readonly WrittenNote[] {
  const out: WrittenNote[] = [];
  for (const measure of part.measures ?? []) {
    const measureNumber = measure.number ?? 0;
    for (const voice of measure.voices ?? []) {
      const voiceId = String(voice.id ?? 1);
      let running = 0;
      let index = 0;
      for (const event of voice.events ?? []) {
        const startTick = event.startTick ?? running;
        const eventTicks = event.duration?.ticks ?? 0;
        running = startTick + eventTicks;
        if (event.kind !== 'note' && event.kind !== 'chord') continue;
        const members = event.kind === 'chord' ? (event.notes ?? []) : [event];
        for (const member of members) {
          const pitch = midiOf(member.pitch);
          if (pitch === undefined) continue;
          out.push({
            measure: measureNumber,
            voice: voiceId,
            startTick,
            durationTicks: Math.max(1, member.duration?.ticks ?? eventTicks),
            pitch,
            note: member,
            // [DM-09] the Notation Engine gives notes no ID of their own,
            // so one is derived from where the note is written. Two runs
            // of the same file produce the same IDs.
            notationNoteId: `${partId}-m${measureNumber}-v${voiceId}-n${index++}`,
          });
        }
      }
    }
  }
  return out;
}

/** [IN-X06] the file's own answer, which no solver may overrule (P-002). */
function fingerOf(fingering: number | undefined): LHFinger | undefined {
  if (fingering === undefined || !Number.isFinite(fingering)) return undefined;
  if (fingering >= 1 && fingering <= 4) return fingering as LHFinger;
  return undefined; // 0 is an open string: a real answer, and no finger
}

/**
 * A slide's other end.
 *
 * The Notation Engine marks the note a slide leaves (`slideStart`) and
 * the note it arrives at (`slideStop`), but not which note is which
 * other end -- the same gap the MusicXML parser fills, and for the
 * same reason: [RH-P03] the arriving note is not picked.
 */
function pairSlides(
  notes: readonly NoteEvent[],
  written: readonly WrittenNote[],
): readonly NoteEvent[] {
  const flags = new Map<string, NotationNoteLike>();
  for (const note of written) flags.set(note.notationNoteId, note.note);
  const links = new Map<string, TechniqueLink[]>();

  for (let i = 0; i < notes.length; i++) {
    const from = notes[i];
    if (from === undefined) continue;
    const source = flags.get(from.notationNoteId ?? from.noteId);
    if (source?.slideStart !== true) continue;
    const to = notes
      .slice(i + 1)
      .find(
        (other) =>
          other.time > from.time &&
          (from.lockedString === undefined ||
            other.lockedString === undefined ||
            other.lockedString === from.lockedString),
      );
    if (to === undefined) continue;
    append(links, from.noteId, { type: 'slide', toNoteId: to.noteId });
    append(links, to.noteId, { type: 'slide', fromNoteId: from.noteId });
  }

  return notes.map((note) => {
    const own = links.get(note.noteId);
    return own === undefined ? note : { ...note, techniqueLinks: own };
  });
}

function append(map: Map<string, TechniqueLink[]>, key: string, link: TechniqueLink): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [link]);
  else list.push(link);
}

function readTimeSignatures(playback: NotationPlaybackLike): readonly TimeSignatureChange[] {
  const offsets = playback.globalTickOffsetByMeasure;
  const meters = playback.timeSignatureByMeasure;
  if (meters === undefined) return [];
  const out: TimeSignatureChange[] = [];
  for (const [measureNumber, meter] of meters) {
    out.push({
      tick: offsets?.get(measureNumber) ?? 0,
      numerator: meter.numerator,
      denominator: meter.denominator,
    });
  }
  return out.sort((a, b) => a.tick - b.tick);
}

interface FileOnlyFields {
  readonly transposeSemitones?: number;
  readonly tuning?: number[];
  readonly capo?: number;
}

/**
 * [IN-E02] The three things the Notation Engine does not keep.
 *
 * `<transpose>` (a guitar part is usually written an octave above
 * where it sounds), `<staff-tuning>` and `<capo>`. They are read
 * straight from the file and matched to the part by its id, which is
 * the document position the rule asks for.
 */
function readFileOnlyFields(musicXml: string | undefined): ReadonlyMap<string, FileOnlyFields> {
  const out = new Map<string, FileOnlyFields>();
  if (musicXml === undefined || musicXml === '') return out;
  const root = parseXml(musicXml);
  if (root === undefined) return out;

  for (const [index, part] of childrenNamed(root, 'part').entries()) {
    const partId = part.attributes['id'] ?? `P${index + 1}`;
    let transposeSemitones: number | undefined;
    let tuning: number[] | undefined;
    let capo: number | undefined;

    for (const measure of childrenNamed(part, 'measure')) {
      for (const attributes of childrenNamed(measure, 'attributes')) {
        const transpose = childNamed(attributes, 'transpose');
        if (transpose !== undefined) {
          transposeSemitones =
            (childNumber(transpose, 'chromatic') ?? 0) +
            (childNumber(transpose, 'octave-change') ?? 0) * 12;
        }
        for (const details of childrenNamed(attributes, 'staff-details')) {
          const lines = childrenNamed(details, 'staff-tuning');
          if (lines.length > 0) {
            const read: number[] = [];
            for (const line of lines) {
              const lineNumber = Number(line.attributes['line'] ?? '0');
              const step = childNamed(line, 'tuning-step')?.text.trim();
              const octave = childNumber(line, 'tuning-octave');
              const semitone = step === undefined ? undefined : STEP_SEMITONES[step];
              if (semitone === undefined || octave === undefined || lineNumber < 1) continue;
              read[lineNumber - 1] =
                (octave + 1) * 12 + semitone + (childNumber(line, 'tuning-alter') ?? 0);
            }
            if (read.length > 0) tuning = read;
          }
          const capoFret = childNumber(details, 'capo');
          if (capoFret !== undefined) capo = capoFret;
        }
      }
    }

    out.set(partId, {
      ...(transposeSemitones !== undefined ? { transposeSemitones } : {}),
      ...(tuning !== undefined ? { tuning } : {}),
      ...(capo !== undefined ? { capo } : {}),
    });
  }
  return out;
}
