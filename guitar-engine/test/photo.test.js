import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

const PHOTO = G.guitarPhoto('guitar.webp');
const FRAME = {
  width: 1920,
  height: 497,
  photo: PHOTO,
  bleed: true,
  handLegend: true,
  stringLabels: false,
  fretNumbers: true,
};

test('the picture is scaled to the width and hung by its strings', () => {
  const place = G.photoPlacement(FRAME);
  assert.equal(place.scale, FRAME.width / PHOTO.width);
  // The strings' middle lands where the drawn neck's middle would, so
  // the hand legend keeps its band above and the numbers their strip
  // below.
  const board = G.guitarLayout(FRAME).board;
  const middle = place.y + ((PHOTO.stringsAtNut[0] + PHOTO.stringsAtNut[1]) / 2) * place.scale;
  assert.ok(Math.abs(middle - (board.y + board.height / 2)) < 1, `hung at ${middle}`);
  // It is BIGGER than the frame: a photographed guitar runs off the
  // top and the bottom the way it runs off the side.
  assert.ok(place.y < 0, 'the body is cut by the top edge');
  assert.ok(place.photo.height * place.scale > FRAME.height * 1.2);
  assert.equal(G.photoPlacement({ width: 1920, height: 497 }), undefined, 'no photo, no placement');
});

test('a photograph shows the frets it has, whatever it is asked for', () => {
  const range = G.fretRange({ ...FRAME, firstFret: 0, lastFret: 5 });
  assert.equal(range.first, 0);
  assert.equal(range.last, G.photoFretCount(PHOTO));
  assert.equal(range.last, 20, 'the sample is a cutaway: twenty frets');
  // Without one, the caller's answer stands.
  assert.equal(G.fretRange({ firstFret: 0, lastFret: 5 }).last, 5);
});

test('a mark lands between the picture’s own two fret wires', () => {
  const scale = G.photoPlacement(FRAME).scale;
  for (const fret of [1, 5, 12, 20]) {
    const wanted = ((PHOTO.frets[fret - 1] + PHOTO.frets[fret]) / 2) * scale;
    assert.ok(
      Math.abs(G.fretCenter(fret, FRAME) - wanted) < 0.5,
      `fret ${fret}: ${G.fretCenter(fret, FRAME)} wanted ${wanted}`,
    );
  }
  // An open string is played at the nut, which is wherever the
  // picture puts it -- not at the left edge of the box.
  assert.ok(Math.abs(G.fretCenter(0, FRAME) - PHOTO.frets[0] * scale) < 0.5);
  // The frets crowd as they climb, because the picture's do.
  const low = G.fretCenter(2, FRAME) - G.fretCenter(1, FRAME);
  const high = G.fretCenter(20, FRAME) - G.fretCenter(19, FRAME);
  assert.ok(high < low * 0.5, `${high} against ${low}`);
});

test('a mark lands on the picture’s own string', () => {
  const place = G.photoPlacement(FRAME);
  const at = (file) => place.y + file * place.scale;
  const nutX = PHOTO.frets[0] * place.scale;
  assert.ok(Math.abs(G.stringYAt(FRAME, 1, nutX) - at(PHOTO.stringsAtNut[0])) < 1);
  assert.ok(Math.abs(G.stringYAt(FRAME, 6, nutX) - at(PHOTO.stringsAtNut[1])) < 1);
  const endX = PHOTO.boardEndX * place.scale;
  assert.ok(Math.abs(G.stringYAt(FRAME, 1, endX) - at(PHOTO.stringsAtEnd[0])) < 1);
  assert.ok(Math.abs(G.stringYAt(FRAME, 6, endX) - at(PHOTO.stringsAtEnd[1])) < 1);
  // They fan out on the way, as the picture's do.
  assert.ok(
    G.stringYAt(FRAME, 6, endX) - G.stringYAt(FRAME, 1, endX) >
      G.stringYAt(FRAME, 6, nutX) - G.stringYAt(FRAME, 1, nutX),
  );
  // Six evenly spread between the two outer ones.
  const lines = G.stringLines(FRAME);
  assert.equal(lines.length, 6);
  const gaps = [];
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i].offset - lines[i - 1].offset);
  for (const gap of gaps) assert.ok(Math.abs(gap - gaps[0]) < 0.001, `even at the nut: ${gaps}`);
});

test('the photograph replaces the drawn instrument, not the playing', () => {
  const shapes = G.stageShapes({
    ...FRAME,
    seconds: 0.5,
    notes: [{ string: 2, fret: 7, startSeconds: 0, endSeconds: 1, finger: 3 }],
    pick: { direction: 'down', strings: [1, 2], age: 0.1 },
  });
  const roles = shapes.map((shape) => shape.role);
  const pictures = shapes.filter((shape) => shape.kind === 'image');
  assert.equal(pictures.length, 1, 'one picture');
  assert.equal(pictures[0].href, 'guitar.webp');
  assert.equal(pictures[0].role, 'photo');
  // Nothing of the drawn instrument is left to argue with the picture.
  for (const gone of ['neck', 'board', 'binding', 'fret', 'nut', 'inlay', 'string', 'headstock', 'tuner', 'body', 'pickguard', 'soundhole', 'pickup', 'hardware']) {
    assert.ok(!roles.includes(gone), `no drawn ${gone}`);
  }
  // Everything about the playing still gets drawn, on top of it.
  assert.ok(roles.includes('mark'), 'the note being played');
  assert.ok(roles.includes('fretNumber'), 'the fret numbers');
  assert.ok(roles.includes('pickStroke'), 'the picking hand');
  assert.ok(shapes.indexOf(pictures[0]) < roles.indexOf('mark'), 'the picture goes down first');
  // The hand legend is four coloured fingers, and it is still there.
  assert.ok(shapes.some((shape) => shape.fill === G.FINGER_COLORS.index), 'the hand legend');
});

test('the numbers ride under the board the picture actually has', () => {
  const shapes = G.stageShapes({ ...FRAME, seconds: 0, notes: [] });
  const numbers = shapes.filter((shape) => shape.role === 'fretNumber');
  // Not one per fret: the picture's frets crowd as they climb, and a
  // number that will not fit is left out rather than printed over its
  // neighbour. The ones with a marker in the wood keep their place.
  const printed = numbers.map((number) => number.text);
  assert.ok(numbers.length > 10 && numbers.length < 20, `printed ${printed.join(',')}`);
  for (const landmark of ['3', '5', '7', '9', '12', '15', '17', '19']) {
    assert.ok(printed.includes(landmark), `the ${landmark}th is always there`);
  }
  for (let i = 1; i < numbers.length; i++) {
    const gap = numbers[i].x - numbers[i - 1].x;
    assert.ok(gap > numbers[i].fontSize * 0.6, `${printed[i]} clears ${printed[i - 1]}`);
  }
  for (const number of numbers) {
    const board = G.boardEdgesAt(FRAME, number.x);
    assert.ok(number.y > board.bottom, `${number.text} is under the board`);
    assert.ok(number.y < board.bottom + number.fontSize * 1.5, `${number.text} stays close to it`);
  }
  // The board slopes away from the nut, and they go with it.
  assert.ok(numbers[numbers.length - 1].y > numbers[0].y, 'they lean with the neck');
});

test('the SVG writes the picture as an image, and nothing else has to change', () => {
  const svg = G.renderGuitarStage({ ...FRAME, seconds: 0, notes: [] });
  assert.ok(svg.includes('<image'), 'an image element');
  assert.ok(svg.includes('href="guitar.webp"'), 'pointing at the file');
  assert.ok(!svg.includes('fill="none" href'), 'an image is not painted with a fill');
  assert.ok(svg.includes('<text'), 'the fret numbers still get written');
});
