import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');

const NE = loadEngine();
const domParser = testDomParser();

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

/** A solid-colour RGBA image, for the encoders that take pixels. */
function solid(width, height, [r, g, b, a]) {
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    data[p * 4] = r;
    data[p * 4 + 1] = g;
    data[p * 4 + 2] = b;
    data[p * 4 + 3] = a;
  }
  return { width, height, data };
}

/** Reverses encodePng: signature, chunks, inflate, un-filter. A real decoder, so the test proves the encoder round-trips rather than matching itself. */
function decodePng(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) assert.equal(bytes[i], sig[i], `PNG signature byte ${i}`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = {};
  const idat = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idat.push(data);
    else chunks[type] = data;
    offset += 12 + length;
  }
  const ihdr = new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset, chunks.IHDR.byteLength);
  const width = ihdr.getUint32(0);
  const height = ihdr.getUint32(4);
  const raw = zlib.inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c))));

  const stride = width * 4;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const value = raw[y * (stride + 1) + 1 + i];
      const left = i >= 4 ? out[y * stride + i - 4] : 0;
      out[y * stride + i] = filter === 1 ? (value + left) & 0xff : value;
    }
  }
  return { width, height, data: out, bitDepth: chunks.IHDR[8], colorType: chunks.IHDR[9], chunks };
}

/**
 * A rasterizer that needs no DOM: it "draws" the image as a colour that
 * encodes the y offset it was asked for, so the slicing logic can be
 * asserted exactly rather than eyeballed.
 */
function stubBackend(record = []) {
  return {
    backend: {
      createCanvas(width, height) {
        let drawnY = 0;
        return {
          drawImage(_image, x, y, w, h) {
            drawnY = y;
            record.push({ canvasWidth: width, canvasHeight: height, x, y, w, h });
          },
          getImageData() {
            // Red channel carries the slice index, so a caller can tell
            // which slice each returned image came from.
            const index = Math.round(Math.abs(drawnY) / height);
            return solid(width, height, [index, 0, 0, 255]);
          },
        };
      },
      loadImage: async (dataUri) => ({ dataUri }),
    },
    record,
  };
}

describe('Phase 52: export (§3)', () => {
  describe('exportSvg', () => {
    test('adds the XML declaration and keeps the <svg> element intact', () => {
      const { svg } = render('simple-single-voice.musicxml');
      const file = NE.exportSvg(svg);
      assert.match(file, /^<\?xml version="1\.0" encoding="UTF-8" standalone="no"\?>\n<svg /);
      assert.ok(file.trimEnd().endsWith('</svg>'));
    });

    test('omitXmlDeclaration leaves the fragment usable inline', () => {
      const { svg } = render('simple-single-voice.musicxml');
      assert.ok(NE.exportSvg(svg, { omitXmlDeclaration: true }).startsWith('<svg '));
    });

    test('title and description go INSIDE the svg, first, and are escaped', () => {
      const { svg } = render('simple-single-voice.musicxml');
      const file = NE.exportSvg(svg, { title: 'A & B', description: '<not a tag>' });
      const openTagEnd = file.indexOf('>', file.indexOf('<svg'));
      const head = file.slice(openTagEnd, openTagEnd + 200);
      assert.match(head, /<title>A &amp; B<\/title>/);
      assert.match(head, /<desc>&lt;not a tag&gt;<\/desc>/);
    });

    test('a font is embedded as a @font-face rule in CDATA', () => {
      const { svg } = render('simple-single-voice.musicxml');
      const file = NE.exportSvg(svg, {
        fonts: [{ family: 'Bravura', base64: 'AAEC', format: 'woff2' }],
      });
      assert.match(file, /<style type="text\/css"><!\[CDATA\[/);
      assert.match(file, /font-family: 'Bravura';/);
      assert.match(file, /url\(data:font\/woff2;base64,AAEC\) format\('woff2'\)/);
    });

    test('with no font it says so in the file rather than failing silently', () => {
      const { svg } = render('simple-single-voice.musicxml');
      const file = NE.exportSvg(svg);
      assert.match(file, /<!-- No font embedded\./);
    });

    test('it refuses input that is not an <svg> element', () => {
      assert.throws(() => NE.exportSvg('<div></div>'), /expects a string starting with an <svg/);
    });

    test('svgToDataUri survives non-ASCII (every SMuFL glyph is non-ASCII)', () => {
      const uri = NE.svgToDataUri('<svg>\u{E0A4}</svg>');
      assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
      const decoded = Buffer.from(uri.slice('data:image/svg+xml;base64,'.length), 'base64').toString(
        'utf8',
      );
      assert.equal(decoded, '<svg>\u{E0A4}</svg>');
    });

    test('bytesToBase64 matches Node s own encoder, including both pad lengths', () => {
      for (const bytes of [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [255, 254, 253, 0, 128]]) {
        assert.equal(
          NE.bytesToBase64(Uint8Array.from(bytes)),
          Buffer.from(bytes).toString('base64'),
          JSON.stringify(bytes),
        );
      }
    });

    test('stringToUtf8 matches Node s own encoder across the plane boundaries', () => {
      for (const text of ['', 'abc', 'é', '中文', '\u{E0A4}', '\u{1D11E}']) {
        assert.deepEqual([...NE.stringToUtf8(text)], [...Buffer.from(text, 'utf8')]);
      }
    });
  });

  describe('encodePng', () => {
    test('produces a file that decodes back to the exact pixels', () => {
      const image = solid(4, 3, [10, 20, 30, 255]);
      image.data[0] = 200; // one different pixel, so a flat-fill bug can't pass
      const decoded = decodePng(NE.encodePng(image));
      assert.equal(decoded.width, 4);
      assert.equal(decoded.height, 3);
      assert.equal(decoded.bitDepth, 8);
      assert.equal(decoded.colorType, 6, 'RGBA');
      assert.deepEqual([...decoded.data], [...image.data]);
    });

    test('alpha survives the round trip', () => {
      const image = solid(2, 2, [0, 0, 0, 0]);
      image.data[3] = 128;
      const decoded = decodePng(NE.encodePng(image));
      assert.deepEqual([...decoded.data], [...image.data]);
    });

    test('a gradient round-trips, which a naive Sub filter would corrupt', () => {
      const width = 16;
      const height = 8;
      const data = new Uint8Array(width * height * 4);
      for (let p = 0; p < width * height; p++) {
        data[p * 4] = p % 256;
        data[p * 4 + 1] = (p * 3) % 256;
        data[p * 4 + 2] = (p * 7) % 256;
        data[p * 4 + 3] = 255;
      }
      const decoded = decodePng(NE.encodePng({ width, height, data }));
      assert.deepEqual([...decoded.data], [...data]);
    });

    test('dpi is recorded as a pHYs chunk', () => {
      const decoded = decodePng(NE.encodePng(solid(2, 2, [0, 0, 0, 255]), { pixelsPerMetre: 3780 }));
      assert.ok(decoded.chunks.pHYs !== undefined);
      const view = new DataView(decoded.chunks.pHYs.buffer, decoded.chunks.pHYs.byteOffset);
      assert.equal(view.getUint32(0), 3780);
      assert.equal(decoded.chunks.pHYs[8], 1, 'unit: metre');
    });

    test('it rejects an empty image and a wrong-sized buffer rather than writing a broken file', () => {
      assert.throws(() => NE.encodePng({ width: 0, height: 1, data: new Uint8Array(0) }), /non-empty/);
      assert.throws(
        () => NE.encodePng({ width: 2, height: 2, data: new Uint8Array(4) }),
        /expects RGBA data of 16 bytes/,
      );
    });

    test('flattenToRgb composites alpha onto the background', () => {
      const image = solid(1, 2, [0, 0, 0, 255]);
      image.data[4] = 0;
      image.data[5] = 0;
      image.data[6] = 0;
      image.data[7] = 0; // fully transparent second pixel
      const rgb = NE.flattenToRgb(image);
      assert.deepEqual([...rgb.slice(0, 3)], [0, 0, 0], 'opaque black stays black');
      assert.deepEqual([...rgb.slice(3, 6)], [255, 255, 255], 'transparent becomes the background');
    });

    test('flattenToRgb honours a non-white background', () => {
      const image = solid(1, 1, [0, 0, 0, 0]);
      assert.deepEqual([...NE.flattenToRgb(image, [10, 20, 30])], [10, 20, 30]);
    });
  });

  describe('encodePdf', () => {
    const page = { image: solid(8, 4, [0, 0, 0, 255]) };
    const pdfText = (bytes) => Buffer.from(bytes).toString('latin1');

    test('produces a structurally valid single-page PDF', () => {
      const text = pdfText(NE.encodePdf([page], { creationDate: new Date(0) }));
      assert.ok(text.startsWith('%PDF-1.4\n'));
      assert.ok(text.trimEnd().endsWith('%%EOF'));
      assert.match(text, /\/Type \/Catalog/);
      assert.match(text, /\/Type \/Pages \/Count 1/);
      assert.match(text, /\/Type \/Page /);
      assert.match(text, /\/Subtype \/Image \/Width 8 \/Height 4/);
      assert.match(text, /\/Filter \/FlateDecode/);
    });

    test('the xref offsets really point at their objects', () => {
      const bytes = NE.encodePdf([page, page], { creationDate: new Date(0) });
      const text = pdfText(bytes);
      const startxref = Number(/startxref\n(\d+)/.exec(text)[1]);
      assert.equal(text.slice(startxref, startxref + 4), 'xref');
      const size = Number(/\/Size (\d+)/.exec(text)[1]);
      const table = text.slice(startxref).split('\n');
      // Line 0 is "xref", line 1 the subsection header, line 2 the free
      // entry, then one line per real object.
      for (let n = 1; n < size; n++) {
        const offset = Number(table[2 + n].slice(0, 10));
        assert.equal(
          text.slice(offset, offset + String(n).length + 6),
          `${n} 0 obj`,
          `xref entry ${n}`,
        );
      }
    });

    test('one page per entry, each with its own image', () => {
      const text = pdfText(NE.encodePdf([page, page, page], { creationDate: new Date(0) }));
      assert.match(text, /\/Count 3/);
      assert.equal((text.match(/\/Type \/Page /g) ?? []).length, 3);
      assert.equal((text.match(/\/Subtype \/Image/g) ?? []).length, 3);
    });

    test('page size comes from the image and dpi, or from explicit points', () => {
      // 8px at 96dpi = 6pt wide; 4px = 3pt tall.
      const auto = pdfText(NE.encodePdf([page], { dpi: 96, creationDate: new Date(0) }));
      assert.match(auto, /\/MediaBox \[ 0 0 6\.000 3\.000 \]/);
      const explicit = pdfText(
        NE.encodePdf([{ image: page.image, widthPt: 595, heightPt: 842 }], {
          creationDate: new Date(0),
        }),
      );
      assert.match(explicit, /\/MediaBox \[ 0 0 595\.000 842\.000 \]/);
    });

    test('the image stream is the flattened RGB, losslessly', () => {
      const image = solid(2, 1, [1, 2, 3, 255]);
      image.data[4] = 250;
      image.data[5] = 251;
      image.data[6] = 252;
      const bytes = NE.encodePdf([{ image }], { creationDate: new Date(0) });
      const text = Buffer.from(bytes).toString('latin1');
      const marker = '/Length ';
      const lengthAt = text.lastIndexOf(marker);
      const streamLength = Number(text.slice(lengthAt + marker.length).split(' ')[0]);
      const start = text.indexOf('stream\n', lengthAt) + 'stream\n'.length;
      const inflated = zlib.inflateSync(Buffer.from(bytes.slice(start, start + streamLength)));
      assert.deepEqual([...inflated], [1, 2, 3, 250, 251, 252]);
    });

    test('a fixed creationDate makes the output byte-reproducible (§4.4)', () => {
      const a = NE.encodePdf([page], { creationDate: new Date(0), title: 'X' });
      const b = NE.encodePdf([page], { creationDate: new Date(0), title: 'X' });
      assert.deepEqual([...a], [...b]);
    });

    test('a title with PDF s own special characters is escaped', () => {
      const text = pdfText(
        NE.encodePdf([page], { title: 'A (B) \\ C', creationDate: new Date(0) }),
      );
      assert.match(text, /\/Title \(A \\\(B\\\) \\\\ C\)/);
    });

    test('it refuses to write a PDF with no pages', () => {
      assert.throws(() => NE.encodePdf([]), /at least one page/);
    });
  });

  describe('rasterizeSvg', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 5 2"></svg>';

    test('scales the raster by `scale`, not the SVG s own units', async () => {
      const { backend, record } = stubBackend();
      const [image] = await NE.rasterizeSvg(svg, { backend, scale: 3 });
      assert.equal(image.width, 300);
      assert.equal(image.height, 120);
      assert.deepEqual(record[0], { canvasWidth: 300, canvasHeight: 120, x: 0, y: 0, w: 300, h: 120 });
    });

    test('slicing draws the WHOLE image at a negative offset, one canvas per page', async () => {
      const { backend, record } = stubBackend();
      const images = await NE.rasterizeSvg(svg, { backend, scale: 1, slices: 4 });
      assert.equal(images.length, 4);
      assert.deepEqual(
        record.map((r) => r.y),
        [0, -10, -20, -30],
        'each slice shifts the full image up by one slice height',
      );
      for (const r of record) {
        assert.equal(r.canvasHeight, 10, 'the canvas is one slice tall');
        assert.equal(r.h, 40, 'but the whole image is drawn into it');
      }
      // The stub encodes the slice index in the red channel.
      assert.deepEqual(
        [...images].map((i) => i.data[0]),
        [0, 1, 2, 3],
      );
    });

    test('it reads the pixel size from the svg element, and says so when it cannot', async () => {
      const { backend } = stubBackend();
      await assert.rejects(
        () => NE.rasterizeSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>', { backend }),
        /positive width\/height/,
      );
    });

    test('exportPng goes end to end through the stub backend', async () => {
      const { backend } = stubBackend();
      const bytes = await NE.exportPng(svg, { backend, scale: 1, dpi: 96 });
      const decoded = decodePng(bytes);
      assert.equal(decoded.width, 100);
      assert.equal(decoded.height, 40);
      assert.ok(decoded.chunks.pHYs !== undefined, 'dpi was recorded');
    });

    test('exportPdf turns each slice into a page', async () => {
      const { backend } = stubBackend();
      const bytes = await NE.exportPdf(svg, {
        backend,
        scale: 1,
        slices: 3,
        creationDate: new Date(0),
      });
      const text = Buffer.from(bytes).toString('latin1');
      assert.match(text, /\/Count 3/);
      assert.match(text, /\/Width 100 \/Height 13/);
    });

    test('browserRasterBackend explains itself instead of throwing ReferenceError', () => {
      assert.throws(() => NE.browserRasterBackend(), /needs a DOM/);
    });
  });

  describe('a real rendered score through the export path', () => {
    test('page mode gives one PDF page per rendered page', async () => {
      // Narrow, short pages so the fixture genuinely spans more than one.
      const { svg } = render('simple-single-voice.musicxml', {
        layout: { mode: 'page' },
        page: { pageWidth: 14, pageHeight: 14 },
      });
      const { backend } = stubBackend();
      const bytes = await NE.exportPdf(svg, {
        backend,
        scale: 1,
        slices: 2,
        creationDate: new Date(0),
      });
      assert.match(Buffer.from(bytes).toString('latin1'), /\/Count 2/);
    });

    test('the exported SVG still contains every glyph the render drew', () => {
      const { svg } = render('two-voice-drum-groove.musicxml');
      const file = NE.exportSvg(svg, { title: 'Groove' });
      const glyphs = (s) => (s.match(/<text /g) ?? []).length;
      assert.equal(glyphs(file), glyphs(svg));
    });
  });
});
