import { chord as makeChord } from '../core/chord.js';
import type { MeasureEvent } from '../core/measure-event.js';
import type { Note } from '../core/note.js';
import type { Score } from '../core/score.js';
import { duration } from '../core/duration.js';
import { TICKS_PER_QUARTER } from '../core/duration-math.js';

/** MusicXML's per-measure meter metadata, kept structural to avoid a parser dependency. */
export interface HiHatPulseMeasureAttributes {
  readonly partId: string;
  readonly measureNumber: number;
  readonly timeNumerator?: number;
  readonly timeDenominator?: number;
}

const GM_CLOSED_HI_HAT = 42;
const QUARTER_TICKS = TICKS_PER_QUARTER;
const EIGHTH_TICKS = TICKS_PER_QUARTER / 2;
const FOUR_FOUR_BAR_TICKS = 4 * TICKS_PER_QUARTER;
const EIGHTH_DURATION = duration('eighth', 0, EIGHTH_TICKS);

function eventNotes(event: MeasureEvent): readonly Note[] {
  if (event.kind === 'note') return [event];
  if (event.kind === 'chord') return event.notes;
  return [];
}

function eventStartTick(event: MeasureEvent, fallback: number): number {
  return event.startTick ?? fallback;
}

function isClosedHiHat(
  note: Note,
  midiInstruments: ReadonlyMap<string, number> | undefined,
): boolean {
  if (note.pitch.kind !== 'unpitched' || note.instrumentId === undefined) return false;
  return midiInstruments?.get(note.instrumentId) === GM_CLOSED_HI_HAT;
}

function isOnBeatQuarterHiHat(
  note: Note,
  startTick: number,
  midiInstruments: ReadonlyMap<string, number> | undefined,
): boolean {
  return (
    isClosedHiHat(note, midiInstruments) &&
    note.duration.type === 'quarter' &&
    note.duration.ticks === QUARTER_TICKS &&
    startTick >= 0 &&
    startTick < FOUR_FOUR_BAR_TICKS &&
    startTick % QUARTER_TICKS === 0
  );
}

function moveHat(note: Note, voiceId: number, startTick: number): Note {
  return { ...note, voice: voiceId, startTick };
}

function pulseHat(note: Note, voiceId: number, startTick: number): Note {
  return {
    ...note,
    voice: voiceId,
    startTick,
    duration: EIGHTH_DURATION,
    // Quarter-note source notes have no beam hints. Keep inference in charge
    // so the meter groups eight hats in 4/4 as two beams of four.
    beams: [],
  };
}

function measureHasConvertibleHat(
  measure: Score['parts'][number]['measures'][number],
  midiInstruments: ReadonlyMap<string, number> | undefined,
  isFourFour: boolean,
): boolean {
  if (!isFourFour) return false;
  for (const voice of measure.voices) {
    let cursor = 0;
    for (const event of voice.events) {
      const start = eventStartTick(event, cursor);
      if (eventNotes(event).some((note) => isOnBeatQuarterHiHat(note, start, midiInstruments))) {
        return true;
      }
      cursor = Math.max(cursor, start + event.duration.ticks);
    }
  }
  return false;
}

/**
 * Optional display normalization for drum charts whose written closed-hi-hat
 * quarter notes are intended as a steady eighth-note pulse. In 4/4, each
 * qualifying quarter hit becomes two eighth-note attacks in a dedicated
 * voice, allowing the ordinary engraving pass to beam them by meter. Other
 * drums and non-grid hi-hat events keep their written duration and onset.
 *
 * This returns a new Score and never mutates the parsed score or source XML.
 * It is deliberately opt-in: faithful MusicXML engraving remains the default.
 */
export function expandClosedHiHatQuarterNotesToEighthPulse(
  score: Score,
  attributes: readonly HiHatPulseMeasureAttributes[],
  midiInstrumentsByPart: ReadonlyMap<string, ReadonlyMap<string, number>>,
): Score {
  let scoreChanged = false;
  const parts = score.parts.map((part) => {
    const midiInstruments = midiInstrumentsByPart.get(part.id);
    const maxVoiceId = part.measures.reduce(
      (max, measure) => Math.max(max, ...measure.voices.map((voice) => voice.id)),
      0,
    );
    const pulseVoiceId = maxVoiceId + 1;
    let partChanged = false;

    const measures = part.measures.map((measure) => {
      const meter = attributes.find(
        (entry) => entry.partId === part.id && entry.measureNumber === measure.number,
      );
      const isFourFour = meter?.timeNumerator === 4 && meter.timeDenominator === 4;
      if (!measureHasConvertibleHat(measure, midiInstruments, isFourFour)) return measure;

      const pulseEvents: Note[] = [];
      const voices = measure.voices
        .map((voice) => {
          const remainingEvents: MeasureEvent[] = [];
          let cursor = 0;

          for (const event of voice.events) {
            const start = eventStartTick(event, cursor);
            cursor = Math.max(cursor, start + event.duration.ticks);

            if (event.kind === 'rest') {
              remainingEvents.push(event);
              continue;
            }

            const notes = eventNotes(event);
            const hats = notes.filter((note) => isClosedHiHat(note, midiInstruments));
            if (hats.length === 0) {
              remainingEvents.push(event);
              continue;
            }

            for (const hat of hats) {
              if (isOnBeatQuarterHiHat(hat, start, midiInstruments)) {
                pulseEvents.push(pulseHat(hat, pulseVoiceId, start));
                pulseEvents.push(pulseHat(hat, pulseVoiceId, start + EIGHTH_TICKS));
              } else {
                // Preserve malformed/overfull-bar hits, ties and any other
                // non-quarter notation rather than silently dropping them.
                pulseEvents.push(moveHat(hat, pulseVoiceId, start));
              }
            }

            const retained = notes.filter((note) => !isClosedHiHat(note, midiInstruments));
            if (retained.length === 1) {
              remainingEvents.push({ ...retained[0]!, startTick: start });
            } else if (retained.length > 1) {
              remainingEvents.push({ ...makeChord(retained), startTick: start });
            }
          }

          return remainingEvents.length > 0 ? [{ ...voice, events: remainingEvents }] : [];
        })
        .flat();

      if (pulseEvents.length === 0) return measure;
      pulseEvents.sort((a, b) => (a.startTick ?? 0) - (b.startTick ?? 0));
      partChanged = true;
      return {
        ...measure,
        voices: [...voices, { id: pulseVoiceId, events: pulseEvents }].sort((a, b) => a.id - b.id),
      };
    });

    if (!partChanged) return part;
    scoreChanged = true;
    return { ...part, measures };
  });

  return scoreChanged ? { ...score, parts } : score;
}
