import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

// Every guitar the page draws is a PICTURE now -- the engine stopped
// drawing instruments out of shapes and gradients -- so the geometry
// these tests ask about is the geometry of a picture.
const PHOTO = G.guitarPhoto('guitar.svg');
const BOARD = { width: 1200, height: 300, photo: PHOTO, bleed: true, handLegend: true };
const nutX = () => G.fretCenter(0, BOARD);
const endX = () => {
  const place = G.photoPlacement(BOARD);
  return place.x + PHOTO.boardEndX * place.scale;
};

test('six strings by default, thinnest at the top, thickest at the bottom', () => {
  const lines = G.stringLines(BOARD);
  assert.equal(lines.length, 6);
  assert.equal(lines[0].string, 1);
  assert.ok(lines[0].offset < lines[5].offset, 'string 1 rides at the top');
  // The neck is a wedge: the strings sit closer together at the nut
  // than they do down by the body, because the picture's do.
  const atNut = G.stringYAt(BOARD, 6, nutX()) - G.stringYAt(BOARD, 1, nutX());
  const atBody = G.stringYAt(BOARD, 6, endX()) - G.stringYAt(BOARD, 1, endX());
  assert.ok(atBody > atNut * 1.1, `strings fan out: ${atNut} at the nut, ${atBody} at the body`);
  assert.ok(G.boardHalfAt(BOARD, nutX()) < G.boardHalfAt(BOARD, endX()));
  assert.ok(lines[0].thickness < lines[5].thickness, 'and is the thinner one');
  for (let i = 1; i < lines.length; i++) {
    assert.ok(lines[i].offset > lines[i - 1].offset, 'in order down the neck');
  }
  assert.equal(G.stringLines({ ...BOARD, strings: 4 }).length, 4, 'a bass has four');
});

test('the stage is three bands: the hand, the board, the numbers', () => {
  const layout = G.guitarLayout(BOARD);
  // The fret numbers get a strip under the board and the hand legend
  // one above it, so neither runs through the strings.
  assert.ok(layout.hand.height > 0, 'the legend has its band');
  assert.equal(layout.board.y, layout.hand.height, 'the board starts where it ends');
  assert.ok(layout.board.height < BOARD.height);
  assert.equal(layout.numbersY, layout.hand.height + layout.board.height);
  assert.ok(layout.numbersY < BOARD.height, 'and the numbers have what is left');
  const plain = { width: 1200, height: 300, fretNumbers: false };
  assert.equal(G.guitarLayout(plain).board.height, 300, 'both bands can be turned off');
  assert.equal(G.guitarLayout(plain).hand.height, 0);
});

test('the frets are the picture\u2019s own, and the nut is its first line', () => {
  const wires = G.fretWires(BOARD);
  assert.equal(wires.length, PHOTO.frets.length, 'one for every line in the picture');
  assert.equal(wires[0].fret, 0, 'and the first of them is the nut');
  const place = G.photoPlacement(BOARD);
  const at = (file) => place.x + file * place.scale;
  assert.ok(Math.abs(wires[0].offset - at(PHOTO.frets[0])) < 1e-9);
  assert.ok(Math.abs(wires[5].offset - at(PHOTO.frets[5])) < 1e-9);
  // They CROWD as they climb, which is the whole difference between a
  // picture of a neck and a ladder drawn evenly.
  const low = wires[1].offset - wires[0].offset;
  const high = wires[wires.length - 1].offset - wires[wires.length - 2].offset;
  assert.ok(high < low * 0.6, `${high} against ${low}`);
  // The narrowest fret is what decides whether anything FITS in one.
  assert.ok(Math.abs(G.fretWidth(BOARD) - high) < 1e-9);
  // Without a picture there is no guitar, and nothing is drawn.
  assert.equal(G.fretWires({ width: 1200, height: 300 }).length, 0);
});

test('a stopped note sits inside its fret, an open string on the nut', () => {
  const place = G.photoPlacement(BOARD);
  const at = (file) => place.x + file * place.scale;
  const mid = (fret) => at((PHOTO.frets[fret - 1] + PHOTO.frets[fret]) / 2);
  assert.ok(Math.abs(G.fretCenter(1, BOARD) - mid(1)) < 1e-9);
  assert.ok(Math.abs(G.fretCenter(5, BOARD) - mid(5)) < 1e-9);
  assert.ok(Math.abs(G.fretCenter(0, BOARD) - at(PHOTO.frets[0])) < 1e-9, 'open, at the nut');
  // A slide passes between frets rather than jumping, and it passes
  // over the picture's own wires.
  const half = G.fretCenter(5.5, BOARD);
  assert.ok(half > G.fretCenter(5, BOARD) && half < G.fretCenter(6, BOARD));
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
