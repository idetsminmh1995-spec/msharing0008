/**
 * A minimal Standard MIDI File ENCODER, test-only -- the engine's public
 * API only ever parses `.mid` files (§11's own stated scope), so this
 * lives in test/helpers/, not src/, and exists purely to build real,
 * valid binary fixtures to parse against, the same spirit as Phase 36's
 * tests building a real .mxl archive via fflate's own zipSync rather
 * than mocking one.
 */

function encodeVlq(value) {
  // MIDI's own variable-length quantity: 7 bits per byte, high bit set
  // means "more bytes follow." Encodes the standard way -- build the
  // 7-bit groups least-significant-first, then emit most-significant-first
  // with the continuation bit set on every byte but the last.
  const groups = [value & 0x7f];
  let v = value >> 7;
  while (v > 0) {
    groups.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  if (groups.length > 1) {
    for (let i = 0; i < groups.length - 1; i++) groups[i] |= 0x80;
  }
  return groups;
}

function asciiBytes(s) {
  return [...s].map((c) => c.charCodeAt(0));
}

function uint16BE(n) {
  return [(n >> 8) & 0xff, n & 0xff];
}

function uint32BE(n) {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** One MTrk chunk's worth of already-encoded event bytes (delta-time + status/data, or delta-time + meta), wrapped in the chunk header with a real computed length. */
function trackChunk(eventBytes) {
  const bytes = [].concat(...eventBytes);
  return [...asciiBytes('MTrk'), ...uint32BE(bytes.length), ...bytes];
}

/** delta-time (VLQ) + note-on/note-off + 2 data bytes. */
function noteEvent(deltaTicks, statusByte, note, velocity) {
  return [...encodeVlq(deltaTicks), statusByte, note, velocity];
}

/** A raw event with NO status byte -- relies on running status from the previous event. */
function runningStatusDataEvent(deltaTicks, note, velocity) {
  return [...encodeVlq(deltaTicks), note, velocity];
}

function tempoMetaEvent(deltaTicks, microsecondsPerQuarter) {
  const mpq = microsecondsPerQuarter;
  return [...encodeVlq(deltaTicks), 0xff, 0x51, 0x03, (mpq >> 16) & 0xff, (mpq >> 8) & 0xff, mpq & 0xff];
}

function timeSignatureMetaEvent(deltaTicks, numerator, denominatorPowerOf2) {
  return [...encodeVlq(deltaTicks), 0xff, 0x58, 0x04, numerator, denominatorPowerOf2, 0x18, 0x08];
}

function keySignatureMetaEvent(deltaTicks, sharpsFlatsSignedByte, isMinor) {
  const sf = sharpsFlatsSignedByte < 0 ? 256 + sharpsFlatsSignedByte : sharpsFlatsSignedByte;
  return [...encodeVlq(deltaTicks), 0xff, 0x59, 0x02, sf, isMinor ? 1 : 0];
}

function endOfTrackMetaEvent(deltaTicks = 0) {
  return [...encodeVlq(deltaTicks), 0xff, 0x2f, 0x00];
}

/** Builds a complete, valid format-0 or format-1 Standard MIDI File as a Uint8Array from a list of tracks, each a list of already-built event-byte-arrays (see the *Event helpers above). */
export function buildMidiFile({ format = 1, ppq = 480, tracks }) {
  const header = [
    ...asciiBytes('MThd'),
    ...uint32BE(6),
    ...uint16BE(format),
    ...uint16BE(tracks.length),
    ...uint16BE(ppq),
  ];
  const trackBytes = tracks.map((events) => trackChunk(events));
  return new Uint8Array([...header, ...trackBytes.flat()]);
}

export const midiHelpers = {
  encodeVlq,
  noteEvent,
  runningStatusDataEvent,
  tempoMetaEvent,
  timeSignatureMetaEvent,
  keySignatureMetaEvent,
  endOfTrackMetaEvent,
};
