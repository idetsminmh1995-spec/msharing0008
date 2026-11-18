import type { PlaybackTrack } from './position.js';

/** General MIDI reserves channel 10 (0-based index 9) for percussion; a SoundFont plays its drum kit only there. */
export const PERCUSSION_CHANNEL = 9;

/** One track's resolved playback routing: the MIDI channel to send it on, plus the bank/program to set there. */
export interface TrackRouting {
  readonly channel: number;
  readonly program: number;
  readonly bank?: number;
}

/**
 * Assigns each track a MIDI channel and its bank/program, as pure data.
 *
 * Percussion always takes the GM percussion channel, whatever the file
 * states: a SoundFont renders a drum kit only there, so a kick routed to a
 * melodic channel would sound as a piano note. A pitched part honors the
 * file's own `<midi-channel>` when that channel is free (the file's
 * channel is how the exporter intended banks to line up), and otherwise
 * takes the next free melodic channel so two parts never collide.
 *
 * Kept free of any WebAudio/SpessaSynth dependency so the routing rule is
 * testable on its own -- the browser engine only turns this into
 * `programChange`/`controllerChange` calls.
 */
export function assignTrackRouting(
  tracks: readonly PlaybackTrack[],
): ReadonlyMap<string, TrackRouting> {
  const result = new Map<string, TrackRouting>();
  const used = new Set<number>();
  for (const track of tracks) {
    if (track.percussion === true) {
      used.add(PERCUSSION_CHANNEL);
      result.set(track.id, {
        channel: PERCUSSION_CHANNEL,
        program: track.program ?? 0,
        ...(track.bank !== undefined ? { bank: track.bank } : {}),
      });
      continue;
    }
    const preferred = track.channel;
    let channel: number | undefined;
    if (preferred !== undefined && preferred !== PERCUSSION_CHANNEL && !used.has(preferred)) {
      channel = preferred;
    } else {
      for (let candidate = 0; candidate < 16; candidate++) {
        if (candidate !== PERCUSSION_CHANNEL && !used.has(candidate)) {
          channel = candidate;
          break;
        }
      }
    }
    // Every channel taken (17+ parts, or a pathological file): fall back to
    // the file's own channel, or 0. Two parts sharing a channel is a host
    // limitation the file itself cannot express a way around.
    const resolved = channel ?? preferred ?? 0;
    used.add(resolved);
    result.set(track.id, {
      channel: resolved,
      program: track.program ?? 0,
      ...(track.bank !== undefined ? { bank: track.bank } : {}),
    });
  }
  return result;
}
