import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

const BOARD = { width: 1200, height: 300 };

test('six strings by default, thinnest at the top, thickest at the bottom', () => {
  const lines = G.stringLines(BOARD);
  // They run across the board, above the fret-number strip.
  const board = G.guitarLayout(BOARD).board;
  assert.ok(lines[lines.length - 1].offset < board.height, 'clear of the numbers');
  assert.equal(lines.length, 6);
  assert.equal(lines[0].string, 1);
  assert.ok(lines[0].offset < lines[5].offset, 'string 1 is drawn at the top');
  assert.ok(lines[0].thickness < lines[5].thickness, 'and is the thinner one');
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].offset > lines[i - 1].offset, 'in order down the neck');
  }
  assert.equal(G.stringLines({ ...BOARD, strings: 4 }).length, 4, 'a bass has four');
});

test('the picture is a guitar: a headstock, the neck, then the body', () => {
  const layout = G.guitarLayout(BOARD);
  assert.equal(layout.headstock.x, 0);
  assert.ok(layout.headstock.width > 0);
  assert.equal(layout.neck.x, layout.headstock.width, 'the neck starts where the headstock ends');
  assert.ok(Math.abs(layout.neck.x + layout.neck.width - layout.body.x) < 1e-9, 'and ends at the body');
  assert.ok(Math.abs(layout.body.x + layout.body.width - BOARD.width) < 1e-9);
  // The fret numbers get a strip under the board, so the strings do
  // not run through them.
  assert.ok(layout.board.height < BOARD.height);
  assert.equal(layout.numbersY, layout.board.height);
  assert.equal(G.guitarLayout({ ...BOARD, fretNumbers: false }).board.height, BOARD.height);
});

test('the frets divide the NECK, the nut where the neck starts', () => {
  const options = { ...BOARD, firstFret: 0, lastFret: 12 };
  const neck = G.guitarLayout(options).neck;
  const wires = G.fretWires(options);
  assert.equal(wires.length, 13, 'the nut and twelve wires');
  assert.equal(wires[0].fret, 0);
  assert.ok(Math.abs(wires[0].offset - neck.x) < 1e-9);
  assert.ok(Math.abs(wires[12].offset - (neck.x + neck.width)) < 1e-9);
  assert.ok(Math.abs(G.fretWidth(options) - neck.width / 12) < 1e-9);
});

test('a stopped note sits inside its fret, an open string on the nut', () => {
  const options = { ...BOARD, firstFret: 0, lastFret: 12 };
  const neck = G.guitarLayout(options).neck;
  const per = G.fretWidth(options);
  // Fret 1 is the space between the nut and the first wire: its mark
  // goes in the middle of that space, where the finger goes.
  assert.ok(Math.abs(G.fretCenter(1, options) - (neck.x + per * 0.5)) < 1e-9);
  assert.ok(Math.abs(G.fretCenter(5, options) - (neck.x + per * 4.5)) < 1e-9);
  assert.ok(Math.abs(G.fretCenter(0, options) - neck.x) < 1e-9, 'an open string is at the nut');
  // A slide passes between frets rather than jumping.
  assert.ok(Math.abs(G.fretCenter(5.5, options) - (neck.x + per * 5)) < 1e-9);
});

test('the inlays are where a guitar has them, doubled at the twelfth', () => {
  const inlays = G.inlayFrets({ firstFret: 0, lastFret: 12 });
  // Read one at a time: the engine is loaded in its own realm, so an
  // array it built fails strict deep equality on its prototype alone.
  assert.equal(inlays.map((i) => i.fret).join(','), '3,5,7,9,12');
  assert.equal(inlays.find((i) => i.fret === 12).double, true);
  assert.equal(inlays.find((i) => i.fret === 5).double, false);
});

test('a note is live only while it sounds', () => {
  const notes = [{ string: 3, fret: 2, startSeconds: 1, endSeconds: 2, finger: 1 }];
  assert.equal(G.positionsAt(notes, 0.9).length, 0);
  assert.equal(G.positionsAt(notes, 1).length, 1);
  assert.equal(G.positionsAt(notes, 2).length, 0, 'the end of a note is not part of it');
  const [live] = G.positionsAt(notes, 1.5);
  assert.equal(live.string, 3);
  assert.equal(live.fret, 2);
  assert.equal(live.finger, 1);
  assert.equal(live.sliding, false);
});

test('a slide travels: its fret is between two frets while it sounds', () => {
  const notes = [{ string: 2, fret: 5, slideToFret: 9, startSeconds: 0, endSeconds: 1, finger: 3 }];
  assert.equal(G.positionsAt(notes, 0)[0].fret, 5, 'starts where it was written');
  assert.equal(G.positionsAt(notes, 0.5)[0].fret, 7, 'half way through, half way along');
  assert.ok(Math.abs(G.positionsAt(notes, 0.999)[0].fret - 9) < 0.05, 'and arrives');
  const live = G.positionsAt(notes, 0.5)[0];
  assert.equal(live.sliding, true);
  assert.equal(live.fromFret, 5);
  assert.equal(live.toFret, 9);
});

test('a slide to the fret it is already on is not a slide', () => {
  const notes = [{ string: 1, fret: 7, slideToFret: 7, startSeconds: 0, endSeconds: 1 }];
  assert.equal(G.positionsAt(notes, 0.5)[0].sliding, false);
});
