import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const engineBundle = path.resolve(
  here, '..', '..', '..', '..',
  'Notation', 'Notation Engine', 'dist', 'notation-engine.js',
);
const writerSource = path.resolve(here, '..', '..', 'src', 'index.js');

/**
 * Loads the built notation engine and the writer engine into one vm
 * sandbox, the way the page loads them: the engine publishes
 * `NotationEngine`, the writer engine reads it and publishes
 * `WriterEngine`. Neither file touches the DOM, so plain Node is enough.
 */
export function loadWriter() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(engineBundle, 'utf8'), sandbox, { filename: 'notation-engine.js' });
  vm.runInContext(fs.readFileSync(writerSource, 'utf8'), sandbox, { filename: 'writer-engine.js' });
  return { engine: sandbox.NotationEngine, writer: sandbox.WriterEngine };
}

/**
 * A two-bar 4/4 score with one voice, the smallest document the edit
 * commands can act on.
 *
 * `events` replaces measure 1's single placeholder rest, which is how a
 * test sets up the notes it is about to command.
 */
export function scoreWith(engine, events = null) {
  const whole = engine.duration('whole', 0, engine.TICKS_PER_QUARTER * 4);
  const placeholder = (startTick) => engine.rest({ duration: whole, voice: 1, startTick });
  const firstVoice = events === null ? [placeholder(0)] : events;
  return {
    score: engine.score({
      parts: [
        engine.part('P1', [
          engine.measure(1, [engine.voice(1, firstVoice)]),
          engine.measure(2, [engine.voice(1, [placeholder(0)])]),
        ]),
      ],
    }),
    attributes: [
      {
        partId: 'P1',
        measureNumber: 1,
        timeNumerator: 4,
        timeDenominator: 4,
        clefSign: 'G',
        fifths: 0,
      },
    ],
  };
}

/** A pitched note at `startTick` with the given note value. */
export function noteAt(engine, step, octave, startTick, type = 'quarter', alter = 0) {
  return engine.note({
    pitch: { kind: 'pitched', step, alter, octave },
    duration: engine.duration(type, 0, engine.TICKS_PER_QUARTER),
    voice: 1,
    startTick,
  });
}

