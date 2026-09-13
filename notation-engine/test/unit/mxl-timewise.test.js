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

describe('.mxl support (Phase 36)', () => {
  test('unzipMxl follows the container.xml pointer and extracts the real score text', () => {
    const bytes = fs.readFileSync(path.join(MXL_DIR, 'simple-single-voice.mxl'));
    const xmlText = NE.unzipMxl(new Uint8Array(bytes), domParser);
    assert.match(xmlText, /<score-partwise/);
  });

  test('an unzipped .mxl file renders BYTE-IDENTICAL output to the original uncompressed .musicxml file', () => {
    const bytes = fs.readFileSync(path.join(MXL_DIR, 'simple-single-voice.mxl'));
    const xmlText = NE.unzipMxl(new Uint8Array(bytes), domParser);
    const { svg: mxlSvg, diagnostics: mxlDiagnostics } = NE.renderFromMusicXml(xmlText, { domParser });

    const originalXml = fs.readFileSync(path.join(MUSICXML_DIR, 'simple-single-voice.musicxml'), 'utf8');
    const { svg: originalSvg } = NE.renderFromMusicXml(originalXml, { domParser });

    assert.deepEqual([...mxlDiagnostics], []);
    assert.equal(mxlSvg, originalSvg);
  });

  test('unzipMxl throws a clear error for an archive with no META-INF/container.xml', () => {
    const bytes = zipSync({ 'not-a-container.xml': strToU8('hello') });
    assert.throws(() => NE.unzipMxl(bytes, domParser), /container\.xml/);
  });

  test("unzipMxl throws a clear error when container.xml's rootfile points to a missing entry", () => {
    const containerXml =
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="missing.xml"/></rootfiles></container>';
    const bytes = zipSync({ 'META-INF/container.xml': strToU8(containerXml) });
    assert.throws(() => NE.unzipMxl(bytes, domParser), /isn't in the archive/);
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
