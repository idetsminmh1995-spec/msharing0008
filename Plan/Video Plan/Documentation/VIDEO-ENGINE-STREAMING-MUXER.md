# Fully Streaming / Seekable MP4 Muxer Strategy

## 1. Purpose

The current Video Engine produces a valid fast-start MP4 and can copy that
finished file incrementally to a `WritableStream`. It is not yet a fully
streaming muxer because the encoded samples and their offsets are retained
until the final `moov` box is built.

This document defines the next architecture. The important distinction is:

- A forward-only `WritableStream` can receive bytes incrementally, but cannot
  patch an earlier header after it has been written.
- A fully seekable flat MP4 needs either a random-access sink or a format that
  does not require final sample offsets in one global table.
- Fragmented MP4 solves the latter by putting timing and offsets in each
  `moof` immediately before its `mdat`.

The recommended production path is **fragmented MP4 for true streaming**, with
**flat MP4 header patching as an optional random-access export mode**.

## 2. Two output modes

### Mode A: Fragmented MP4 — recommended for true streaming

Write the file as:

```text
ftyp
moov          (initialization segment: tracks, codecs, timescales)
[ sidx ]      (optional top-level seek index)
moof + mdat  (fragment 0)
moof + mdat  (fragment 1)
...
```

Each `moof` contains a `traf` for the video and, when present, audio. The
`trun` entries describe sample durations, sizes, flags, and composition offsets.
The following `mdat` contains exactly those samples. Because the `moof` is
written immediately before its `mdat`, its data offsets are known without
waiting for the end of the render.

A fragment boundary should normally be a video keyframe. A practical default
is one to two seconds, with a forced boundary at every requested keyframe. The
muxer must never split a video GOP in a way that makes a fragment begin on a
non-sync sample unless the caller explicitly permits it.

Advantages:

- No final global `stco`/`co64` table is required.
- Encoded samples can be released after their fragment is written.
- A long render has bounded muxer memory.
- A network, OPFS, or File System Access sink can receive data continuously.
- A player can begin after the initialization segment and first fragment.

Trade-offs:

- Some older players expect a flat MP4 and may need a remux step.
- The output must be validated as `isom`/CMAF-compatible for the chosen
  codecs and brands.
- Seeking needs either HTTP byte-range support plus a fragment index, or a
  `sidx`/`mfra` index written as part of finalization.

### Mode B: Flat MP4 with reserved-header patching

Use this mode only when the destination supports random writes:

```text
ftyp
free + reserved moov area
mdat header placeholder
encoded sample bytes...
patch mdat size
patch moov with final stsc/stsz/stco or co64
truncate unused reserved bytes
```

The muxer writes a sufficiently large `free` box after `ftyp`, then streams
sample bytes to `mdat`. It keeps only compact metadata in memory:

```text
track -> sample count, sample sizes, decode timing runs,
        sync sample numbers, chunk offsets, composition runs
```

At finalization it builds `moov` using the known final data offsets and writes
it into the reserved area. If the final `moov` is smaller than the reservation,
the remaining bytes become a valid `free` box. If it is larger, the muxer must
not overwrite the first `mdat` bytes; it should either:

1. fail with `MOOV_RESERVATION_TOO_SMALL` and leave the temporary file
   recoverable, or
2. write a second copy with `moov` at the end and return a non-fast-start file,
   or
3. fall back to fragmented MP4.

A reservation must be selected before encoding. A conservative initial policy
is a fixed minimum plus a per-track/per-sample allowance, but the muxer should
also expose an explicit `moovReserveBytes` option for callers that know their
content profile.

## 3. Sink capability contract

`WritableStream` alone is forward-only. Flat patching requires a random-access
sink with an explicit contract:

```ts
interface RandomAccessSink {
  writeAt(offset: number | bigint, data: Uint8Array): Promise<void>;
  append(data: Uint8Array): Promise<number | bigint>;
  truncate(size: number | bigint): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
}
```

Adapters should include:

- `FileSystemWritableFileStream`: use `seek()` + `write()` + `truncate()`.
- OPFS `FileSystemSyncAccessHandle` in a Worker where available.
- A server-side HTTP/S3 multipart adapter that writes fragments rather than
  patching a flat file.
- A test sink backed by a growable `Uint8Array` or temporary file.

Do not silently accept a normal `WritableStream` for flat patch mode. If the
sink has no `writeAt`, return `SINK_NOT_SEEKABLE` and recommend fragmented mode.

## 4. Fragment muxer state machine

The streaming fragment writer should have explicit states:

```text
NEW
  -> INIT_WRITTEN
  -> COLLECTING_FRAGMENT
  -> FRAGMENT_READY
  -> FRAGMENT_WRITTEN
  -> COLLECTING_FRAGMENT ...
  -> FINALIZING
  -> CLOSED
```

On each encoded sample:

1. Validate track, timestamp monotonicity, sample size, and codec format.
2. Copy the encoded payload into the current fragment only if the sink cannot
   accept the payload immediately.
3. Start a new fragment at a keyframe when the target duration is reached.
4. Build `moof` from the fragment's compact sample metadata.
5. Write `moof`, then `mdat` header, then sample payloads.
6. Append a fragment index entry containing byte offset, size, decode start,
   duration, and first presentation timestamp.
7. Release the fragment's encoded payloads before accepting more samples.

At finalization:

- Flush the final fragment.
- Write `mfra`/`tfra` if random access from the file tail is desired.
- Optionally write or patch a top-level `sidx` if the sink supports seeking.
- Close the sink only after every write has resolved.

## 5. Flat patching state machine

For the random-access flat mode:

1. Validate sink capabilities and reservation size.
2. Write `ftyp` and a `free` reservation.
3. Write an `mdat` extended-size placeholder. Use the 64-bit form from the
   beginning so the header size never changes during finalization.
4. As samples arrive, append only payload bytes and update compact per-track
   metadata.
5. At the end, calculate the actual `mdat` size and final `moov` offsets.
6. Build `moov` using `stsc`, `stsz`, `stco` or `co64`, `stts`, `ctts`, and
   `stss` from the compact metadata.
7. If `moov.length > moovReserveBytes`, abort safely with the documented error.
8. Otherwise write `moov` into the reservation, fill the remainder with a
   valid `free` box, patch the `mdat` size, truncate the unused tail if needed,
   and close the sink.

The sample payload itself is never moved. Only metadata and the fixed-size
headers are patched, which is the main memory and I/O benefit.

## 6. Metadata memory model

The muxer must not retain encoded payloads after they are committed:

- Fragmented mode retains at most one fragment's payloads plus codec metadata.
- Flat patch mode retains no payloads after append; it retains sample sizes and
  compact timing runs only.
- `stsz` still requires one size per sample unless constant-size audio or an
  equivalent compact representation is valid.
- `stts`, `ctts`, and `stsc` should be run-length encoded while samples arrive.
- Sync sample numbers should be appended only for video keyframes.

The current grouped MP4 path is a useful intermediate optimization, but it
still retains payloads until `moov` is finalized. The new fragment path is what
removes that requirement.

## 7. Error handling and recovery

Every sink write must be awaited. On error:

- Stop accepting samples.
- Close or abort the encoder.
- Abort the sink with the original error.
- Preserve a structured error code and byte position.
- Never return a file marked complete after a partial write.

Recommended error codes:

```text
SINK_NOT_SEEKABLE
SINK_WRITE_FAILED
SINK_ABORT_FAILED
MOOV_RESERVATION_TOO_SMALL
NON_MONOTONIC_TIMESTAMP
MISSING_KEYFRAME_BOUNDARY
UNSUPPORTED_CODEC_LAYOUT
FRAGMENT_FINALIZE_FAILED
```

A fragmented file whose last fragment is incomplete must be marked failed and
not offered as a finished download. A completed earlier fragment may still be
useful for diagnostics, but it is not a valid final export unless the caller
explicitly requests progressive partial output.

## 8. Browser API plan

Add two explicit APIs instead of overloading `muxMp4`:

```js
await VideoEngine.createFragmentedMp4Writer({
  width, height, fps, video, audio, sink,
});

await VideoEngine.createFlatMp4Patcher({
  width, height, fps, video, audio,
  sink,
  moovReserveBytes: 2 * 1024 * 1024,
});
```

The writer should expose:

```js
writer.writeVideoChunk(chunk);
writer.writeAudioChunk(chunk);
await writer.finalize();
await writer.abort(error);
```

The existing `muxMp4ToStream()` remains as the compatibility path for callers
that already have all encoded chunks. New render code should select:

1. fragmented mode when a forward-only stream is available;
2. flat patch mode when a random-access sink is available and a flat MP4 is
   explicitly required;
3. current in-memory grouped muxing as the fallback.

## 9. Test plan

### Pure tests

- `moof`/`mdat` offsets point to the following payload.
- `trun` sample count, duration, sizes, flags, and composition offsets match
  the encoded chunks.
- Fragment boundaries begin on keyframes.
- Multiple tracks keep independent decode timelines.
- The final fragment flushes correctly when shorter than the target duration.
- Flat patch mode writes the final `moov` into its reservation and leaves valid
  `free` padding.
- An undersized reservation returns `MOOV_RESERVATION_TOO_SMALL` without
  corrupting `mdat`.
- A `WritableStream` never receives a patch-mode request.

### Browser tests

- Chromium WebCodecs writes a 3-second fragmented H.264 MP4 to a slow sink.
- The sink receives data before encoding completes.
- `ffprobe` sees H.264, correct duration, frame count, and dimensions.
- A browser `<video>` can load the initialization segment plus fragments.
- File System Access or OPFS random writes produce a flat fast-start MP4.
- Seek to 0%, 50%, and 100% succeeds after finalization.
- Abort during fragment writing closes the encoder and rejects the export.
- Memory telemetry stays bounded as duration increases.

## 10. Recommended implementation order

1. Extract compact run-length sample metadata from the current muxer.
2. Implement a pure fragmented `moof`/`mdat` writer with a memory sink.
3. Add a forward-only `WritableStream` adapter and slow-sink test.
4. Add Chromium integration and `ffprobe` validation.
5. Add File System Access/OPFS random-access adapter.
6. Implement flat `moov` reservation and offset patching.
7. Add seek tests and reservation overflow recovery.
8. Switch long renders to fragmented mode by default; retain flat MP4 only
   where a downstream consumer requires it.

## 11. Current status

Implemented today:

- Fast-start flat MP4 with grouped sample chunks.
- Incremental copying of the completed MP4 to a `WritableStream`.
- Real Chromium WebCodecs smoke test with `ffprobe` validation.
- Documentation and pure tests for grouped offsets.

Not yet implemented:

- True fragment-at-a-time `moof`/`mdat` encoding output.
- Random-access sink adapters and flat-header patching.
- Final seek tests against OPFS/File System Access output.
