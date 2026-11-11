import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUSICXML_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');
const MXL_DIR = path.join(__dirname, '..', 'fixtures', 'mxl');

const NE = loadEngine();
const domParser = testDomParser();

describe('.mxl support (Phase 36/38)', () => {
  test('unzipMxl follows the container.xml pointer and extracts the real score text', () => {
    const bytes = fs.readFileSync(path.join(MXL_DIR, 'simple-single-voice.mxl'));
    const { xmlText, diagnostics } = NE.unzipMxl(new Uint8Array(bytes), domParser);
    assert.deepEqual([...diagnostics], []);
    assert.match(xmlText, /<score-partwise/);
  });

  test('an unzipped .mxl file renders BYTE-IDENTICAL output to the original uncompressed .musicxml file', () => {
    const bytes = fs.readFileSync(path.join(MXL_DIR, 'simple-single-voice.mxl'));
    const { xmlText } = NE.unzipMxl(new Uint8Array(bytes), domParser);
    const { svg: mxlSvg, diagnostics: mxlDiagnostics } = NE.renderFromMusicXml(xmlText, { domParser });

    const originalXml = fs.readFileSync(path.join(MUSICXML_DIR, 'simple-single-voice.musicxml'), 'utf8');
    const { svg: originalSvg } = NE.renderFromMusicXml(originalXml, { domParser });

    assert.deepEqual([...mxlDiagnostics], []);
    assert.equal(mxlSvg, originalSvg);
  });

  test('unzipMxl NEVER throws -- a missing META-INF/container.xml produces a diagnostic and undefined xmlText', () => {
    const bytes = zipSync({ 'not-a-container.xml': strToU8('hello') });
    const { xmlText, diagnostics } = NE.unzipMxl(bytes, domParser);
    assert.equal(xmlText, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'MXL_MISSING_CONTAINER'));
  });

  test("unzipMxl NEVER throws -- a container.xml with no <rootfile> pointer at all produces a diagnostic and undefined xmlText", () => {
    const containerXml = '<?xml version="1.0"?><container><rootfiles></rootfiles></container>';
    const bytes = zipSync({ 'META-INF/container.xml': strToU8(containerXml) });
    const { xmlText, diagnostics } = NE.unzipMxl(bytes, domParser);
    assert.equal(xmlText, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'MXL_MISSING_ROOTFILE_POINTER'));
  });

  test("unzipMxl NEVER throws -- container.xml's rootfile pointing to a missing entry produces a diagnostic and undefined xmlText", () => {
    const containerXml =
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="missing.xml"/></rootfiles></container>';
    const bytes = zipSync({ 'META-INF/container.xml': strToU8(containerXml) });
    const { xmlText, diagnostics } = NE.unzipMxl(bytes, domParser);
    assert.equal(xmlText, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'MXL_MISSING_SCORE_FILE'));
  });

  test('unzipMxl NEVER throws -- genuinely non-ZIP bytes produce a diagnostic and undefined xmlText', () => {
    const garbage = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const { xmlText, diagnostics } = NE.unzipMxl(garbage, domParser);
    assert.equal(xmlText, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'MXL_INVALID_ARCHIVE'));
  });
});

describe('<score-timewise> conversion (Phase 36)', () => {
  test('a real score-timewise fixture renders with zero diagnostics', () => {
    const xml = fs.readFileSync(path.join(MUSICXML_DIR, 'simple-single-voice-timewise.musicxml'), 'utf8');
    const result = NE.parseMusicXml(xml, { domParser });
    assert.deepEqual([...result.diagnostics], []);
  });

  test('a score-timewise fixture parses into the SAME structural score as its partwise equivalent (same part/measure/voice/event counts)', () => {
    const timewiseXml = fs.readFileSync(
      path.join(MUSICXML_DIR, 'simple-single-voice-timewise.musicxml'),
      'utf8',
    );
    const partwiseXml = fs.readFileSync(path.join(MUSICXML_DIR, 'simple-single-voice.musicxml'), 'utf8');
    const timewiseResult = NE.parseMusicXml(timewiseXml, { domParser });
    const partwiseResult = NE.parseMusicXml(partwiseXml, { domParser });

    assert.equal(timewiseResult.score.parts.length, partwiseResult.score.parts.length);
    assert.equal(timewiseResult.score.parts[0].measures.length, partwiseResult.score.parts[0].measures.length);
    assert.equal(
      timewiseResult.score.parts[0].measures[0].voices[0].events.length,
      partwiseResult.score.parts[0].measures[0].voices[0].events.length,
    );
  });

  test('a score-timewise fixture renders BYTE-IDENTICAL output to its partwise equivalent', () => {
    const timewiseXml = fs.readFileSync(
      path.join(MUSICXML_DIR, 'simple-single-voice-timewise.musicxml'),
      'utf8',
    );
    const partwiseXml = fs.readFileSync(path.join(MUSICXML_DIR, 'simple-single-voice.musicxml'), 'utf8');
    const timewiseRender = NE.renderFromMusicXml(timewiseXml, { domParser });
    const partwiseRender = NE.renderFromMusicXml(partwiseXml, { domParser });
    assert.equal(timewiseRender.svg, partwiseRender.svg);
  });

  test('a non-score-partwise, non-score-timewise root still produces UNSUPPORTED_ROOT, never throws', () => {
    const result = NE.parseMusicXml('<not-a-score/>', { domParser });
    assert.equal(result.score.parts.length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'UNSUPPORTED_ROOT'));
  });
});
