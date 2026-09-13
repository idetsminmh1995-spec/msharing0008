import type { ByteReader } from './byte-reader.js';

/**
 * §11.1's variable-length quantity (VLQ): each byte contributes its low
 * 7 bits to the value; the high bit set means "more bytes follow," clear
 * means "this was the last byte." Used for every delta-time and every
 * meta/sysex event's declared length in a Standard MIDI File.
 *
 * Returns `undefined` (rather than throwing) if the stream runs out
 * mid-quantity -- §11.2's "truncated file -> diagnostic, not exception"
 * rule applies at this lowest level too, not just at the top-level parse
 * function; every caller up the chain is expected to check for
 * `undefined` and turn it into a diagnostic itself.
 */
export function readVariableLengthQuantity(reader: ByteReader): number | undefined {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const byte = reader.readUint8();
    if (byte === undefined) return undefined;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return value >>> 0;
  }
  // A conforming VLQ never needs a 5th byte for any value this format
  // actually uses (delta-times and lengths both fit in 28 bits) --
  // reaching here means the stream itself is malformed, not merely long.
  return undefined;
}
