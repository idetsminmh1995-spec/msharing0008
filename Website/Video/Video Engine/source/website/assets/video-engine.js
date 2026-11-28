/**
 * video-engine.js — the one thing in this app that turns frames into a
 * video file.
 *
 * Every page that produces a video calls `VideoEngine.render`. Nothing
 * else in the app talks to an encoder, so a page cannot quietly differ
 * from another page in how its output is timed.
 *
 *
 * WHY IT RENDERS RATHER THAN RECORDS
 *
 * `MediaRecorder` runs against the wall clock. If the machine cannot
 * encode 1080p thirty times a second, it has no option to take longer
 * -- it drops frames, and it drops them in runs. Measured on a
 * 60-second take before this existed: 1515 frames drawn, 1193 in the
 * file, and one gap of 1323ms where about 33 consecutive frames went
 * missing. That gap is what "the video skips seconds" is.
 *
 * WebCodecs has no wall clock in it. Every frame is handed to the
 * encoder with the timestamp IT is meant to have, and the encoder
 * takes as long as it takes. A slow machine makes the render slower;
 * it cannot make the video judder. And because nothing waits for real
 * time, a three-minute video need not take three minutes to produce.
 *
 * `MediaRecorder` stays as a fallback for browsers without WebCodecs,
 * so no page loses the ability to export -- it is simply the worse of
 * the two paths, and says so.
 *
 *
 * WHAT COMES OUT
 *
 * An MP4: H.264 video at 48kHz sound, at exactly the size the page
 * asked for. That is the file every phone, editor and upload page
 * takes without being asked twice, which a WebM is not.
 *
 * The sound is AAC-LC where the browser encodes it, and Opus where it
 * does not. Chromium's WebCodecs ships H.264 but no AAC encoder on
 * Linux, so insisting on AAC made the whole MP4 -- and with it the
 * record of the picture's own quality -- fall back to a WebM. Opus in
 * an MP4 is standardised (`Opus` sample entry, `dOps` configuration)
 * and plays in every Chromium and Firefox build; the result names the
 * sound codec it got, so a page can say which one it is.
 *
 * Nothing is converted to get there. The frames are encoded as H.264
 * in the first place and the file is written around them, so there is
 * no second pass to lose a generation of quality in -- and no renaming
 * either: `muxMp4` writes a real ISO BMFF, boxes and sample tables and
 * all, which is the only way a .mp4 is an MP4.
 *
 * The codecs and the container are ONE decision, made in `pickFormat`
 * before a frame is drawn, because an MP4 cannot hold VP8 and a WebM
 * cannot hold H.264. Only a browser that will not encode H.264 at all
 * gets the old VP8-and-Opus WebM instead, and the result says which it
 * got.
 *
 *
 * WHAT A PAGE HANDS OVER
 *
 *   VideoEngine.render({
 *     width, height, fps,
 *     segments: [ { seconds, draw, audio, onStart, onEnd } ],
 *     onProgress, shouldStop,
 *   })  ->  { blob, extension, container, frames, fps, seconds, path }
 *
 * A SEGMENT is a stretch of the finished video. `draw(ctx, at, index)`
 * paints one frame of it, `at` measured from that segment's own start,
 * and may be async. `audio` is an AudioBuffer for the same stretch, or
 * null for silence.
 *
 * Nothing here waits on a clock. A segment that reads a source with a
 * speed of its own -- a <video> element -- asks that source for the
 * frame at `at` and waits inside its own `draw`. Pacing the render to
 * the wall clock instead, and copying whatever the source happened to
 * be showing, is how a clip ends up juddering: the encoder's
 * backpressure holds the loop past the moment a frame was due, the
 * same picture is copied twice, and the next one is never asked for.
 *
 * Segments are what let the body of a video and the Thank You clip at
 * the end of it be one file without either page knowing how an MP4 is
 * put together.
 */
(function () {
  // ---------------------------------------------------------------
  // EBML, the container format WebM is written in.
  //
  // Every element is [id][size][payload], where the id is a fixed byte
  // string and the size is a "VINT": a length-prefixed integer whose
  // leading one-bit says how many bytes it occupies. Writing one is
  // the whole of the format's difficulty.
  // ---------------------------------------------------------------

  /** An element id, written as the bytes it already is. */
  function id(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    return Uint8Array.from(bytes);
  }

  const ID = {
    EBML: id('1A45DFA3'),
    EBMLVersion: id('4286'),
    EBMLReadVersion: id('42F7'),
    EBMLMaxIDLength: id('42F2'),
    EBMLMaxSizeLength: id('42F3'),
    DocType: id('4282'),
    DocTypeVersion: id('4287'),
    DocTypeReadVersion: id('4285'),
    Segment: id('18538067'),
    Info: id('1549A966'),
    TimecodeScale: id('2AD7B1'),
    MuxingApp: id('4D80'),
    WritingApp: id('5741'),
    Duration: id('4489'),
    Tracks: id('1654AE6B'),
    TrackEntry: id('AE'),
    TrackNumber: id('D7'),
    TrackUID: id('73C5'),
    TrackType: id('83'),
    FlagLacing: id('9C'),
    CodecID: id('86'),
    CodecPrivate: id('63A2'),
    Video: id('E0'),
    PixelWidth: id('B0'),
    PixelHeight: id('BA'),
    Colour: id('55B0'),
    MatrixCoefficients: id('55B1'),
    Range: id('55B9'),
    TransferCharacteristics: id('55BA'),
    Primaries: id('55BB'),
    Audio: id('E1'),
    SamplingFrequency: id('B5'),
    Channels: id('9F'),
    Cluster: id('1F43B675'),
    Timecode: id('E7'),
    SimpleBlock: id('A3'),
    Cues: id('1C53BB6B'),
    CuePoint: id('BB'),
    CueTime: id('B3'),
    CueTrackPositions: id('B7'),
    CueTrack: id('F7'),
    CueClusterPosition: id('F1'),
  };

  /**
   * A VINT: the leading one-bit marks the length, so the value has
   * seven usable bits per byte and an all-ones payload is reserved.
   */
  function vint(value) {
    let length = 1;
    while (length < 8 && value >= 2 ** (7 * length) - 1) length += 1;
    const out = new Uint8Array(length);
    let remaining = value;
    for (let i = length - 1; i >= 0; i--) {
      out[i] = remaining & 0xff;
      remaining = Math.floor(remaining / 256);
    }
    out[0] |= 1 << (8 - length);
    return out;
  }

  /** An unsigned integer in as few big-endian bytes as it needs. */
  function uint(value) {
    const bytes = [];
    let remaining = Math.max(0, Math.round(value));
    do {
      bytes.unshift(remaining & 0xff);
      remaining = Math.floor(remaining / 256);
    } while (remaining > 0);
    return Uint8Array.from(bytes);
  }

  function float64(value) {
    const out = new Uint8Array(8);
    new DataView(out.buffer).setFloat64(0, value, false);
    return out;
  }

  function ascii(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0x7f;
    return out;
  }

  function concat(parts) {
    let total = 0;
    for (const part of parts) total += part.length;
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }

  /** One complete element. */
  function elem(elementId, payload) {
    const body = payload instanceof Uint8Array ? payload : concat(payload);
    return concat([elementId, vint(body.length), body]);
  }

  // ---------------------------------------------------------------
  // The muxer.
  // ---------------------------------------------------------------

  const TIMECODE_SCALE = 1000000; // one millisecond, so timecodes are ms
  /** A block's timecode is a signed 16-bit offset from its cluster's. */
  const MAX_CLUSTER_MS = 30000;

  function simpleBlock(trackNumber, relativeMs, isKeyFrame, data) {
    const header = new Uint8Array(3);
    new DataView(header.buffer).setInt16(0, relativeMs, false);
    header[2] = isKeyFrame ? 0x80 : 0x00;
    // The track number's VINT comes first, then that three-byte header.
    return elem(ID.SimpleBlock, [vint(trackNumber), header, data]);
  }

  /**
   * Assembles a playable WebM from already-encoded chunks.
   *
   * Blocks are merged by timestamp across the two tracks, and a new
   * cluster is opened on every video keyframe -- which is also what
   * makes the file seekable, because each cluster's byte offset goes
   * into the cue table at the end.
   */
  function muxWebM({ videoCodec, width, height, videoChunks, audio, durationMs }) {
    const header = elem(ID.EBML, [
      elem(ID.EBMLVersion, uint(1)),
      elem(ID.EBMLReadVersion, uint(1)),
      elem(ID.EBMLMaxIDLength, uint(4)),
      elem(ID.EBMLMaxSizeLength, uint(8)),
      elem(ID.DocType, ascii('webm')),
      elem(ID.DocTypeVersion, uint(2)),
      elem(ID.DocTypeReadVersion, uint(2)),
    ]);

    const info = elem(ID.Info, [
      elem(ID.TimecodeScale, uint(TIMECODE_SCALE)),
      elem(ID.MuxingApp, ascii('MusicNote Video Engine')),
      elem(ID.WritingApp, ascii('MusicNote Video Engine')),
      elem(ID.Duration, float64(durationMs)),
    ]);

    const trackEntries = [
      elem(ID.TrackEntry, [
        elem(ID.TrackNumber, uint(1)),
        elem(ID.TrackUID, uint(1)),
        elem(ID.TrackType, uint(1)), // video
        elem(ID.FlagLacing, uint(0)),
        elem(ID.CodecID, ascii(videoCodec.startsWith('vp9') || videoCodec.startsWith('vp09') ? 'V_VP9' : 'V_VP8')),
        elem(ID.Video, [
          elem(ID.PixelWidth, uint(width)),
          elem(ID.PixelHeight, uint(height)),
          // The same statement the MP4's `nclx` makes, and needed for the
          // same reason: the encoder is handed full-range canvases and
          // BT.709. A WebM that leaves the range unstated is decoded as
          // limited, which stretches 16..235 over the whole scale and
          // turns a dark background into pure black.
          elem(ID.Colour, [
            elem(ID.MatrixCoefficients, uint(1)),
            elem(ID.Range, uint(2)), // full
            elem(ID.TransferCharacteristics, uint(13)), // sRGB
            elem(ID.Primaries, uint(1)),
          ]),
        ]),
      ]),
    ];
    if (audio) {
      trackEntries.push(
        elem(ID.TrackEntry, [
          elem(ID.TrackNumber, uint(2)),
          elem(ID.TrackUID, uint(2)),
          elem(ID.TrackType, uint(2)), // audio
          elem(ID.FlagLacing, uint(0)),
          elem(ID.CodecID, ascii('A_OPUS')),
          ...(audio.description ? [elem(ID.CodecPrivate, audio.description)] : []),
          elem(ID.Audio, [
            elem(ID.SamplingFrequency, float64(audio.sampleRate)),
            elem(ID.Channels, uint(audio.channels)),
          ]),
        ]),
      );
    }
    const tracks = elem(ID.Tracks, trackEntries);

    // Everything that has to be written, in time order. Video first at
    // an equal timestamp so a cluster always opens on its keyframe.
    const blocks = [];
    for (const chunk of videoChunks) {
      blocks.push({ track: 1, ms: Math.round(chunk.us / 1000), key: chunk.key, data: chunk.data, order: 0 });
    }
    if (audio) {
      for (const chunk of audio.chunks) {
        blocks.push({ track: 2, ms: Math.round(chunk.us / 1000), key: true, data: chunk.data, order: 1 });
      }
    }
    blocks.sort((a, b) => a.ms - b.ms || a.order - b.order);

    const clusters = [];
    const cuePoints = [];
    let current = null;
    const closeCluster = () => {
      if (!current) return;
      clusters.push(
        elem(ID.Cluster, [elem(ID.Timecode, uint(current.ms)), ...current.blocks]),
      );
      current = null;
    };
    for (const block of blocks) {
      const mustOpen =
        !current ||
        (block.track === 1 && block.key) ||
        block.ms - current.ms >= MAX_CLUSTER_MS;
      if (mustOpen) {
        closeCluster();
        current = { ms: block.ms, blocks: [] };
        if (block.track === 1) cuePoints.push({ ms: block.ms, clusterIndex: clusters.length });
      }
      current.blocks.push(simpleBlock(block.track, block.ms - current.ms, block.key, block.data));
    }
    closeCluster();

    // Cue offsets are measured from the first byte AFTER the Segment's
    // own id and size, so the table has to be built once to learn its
    // length, then rebuilt now that the offsets it shifts are known.
    const buildCues = (cueTableLength) => {
      let offset = info.length + tracks.length + cueTableLength;
      const sizes = clusters.map((c) => c.length);
      const points = [];
      for (const point of cuePoints) {
        let at = offset;
        for (let i = 0; i < point.clusterIndex; i++) at += sizes[i];
        points.push(
          elem(ID.CuePoint, [
            elem(ID.CueTime, uint(point.ms)),
            elem(ID.CueTrackPositions, [
              elem(ID.CueTrack, uint(1)),
              elem(ID.CueClusterPosition, uint(at)),
            ]),
          ]),
        );
      }
      return elem(ID.Cues, points);
    };
    let cues = buildCues(0);
    cues = buildCues(cues.length); // one pass is enough: the length only grows into its own slack

    const segmentBody = concat([info, tracks, cues, ...clusters]);
    const segment = concat([ID.Segment, vint(segmentBody.length), segmentBody]);
    return new Blob([header, segment], { type: 'video/webm' });
  }

  // ---------------------------------------------------------------
  // ISO BMFF, the container format MP4 is written in.
  //
  // A file is a list of BOXES -- [4-byte length][4-byte type][payload]
  // -- nesting as deep as they like. Every encoded frame goes into one
  // `mdat`; the `moov` beside it is the index saying which bytes are
  // which sample, when each is decoded, when it is shown, how long it
  // lasts and which of them a player may seek to. None of it is hard.
  // All of it has to agree, and the byte offsets have to be right.
  //
  // `moov` is written BEFORE `mdat`, which is what "fast start" means:
  // a player knows the whole layout from the first bytes instead of
  // having to reach the end of the file to find out.
  // ---------------------------------------------------------------

  function u8(value) {
    return Uint8Array.from([value & 0xff]);
  }

  function u16(value) {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value, false);
    return out;
  }

  function u32(value) {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value, false);
    return out;
  }

  function i32(value) {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setInt32(0, value, false);
    return out;
  }

  function u64(value) {
    const out = new Uint8Array(8);
    const view = new DataView(out.buffer);
    view.setUint32(0, Math.floor(value / 2 ** 32), false);
    view.setUint32(4, value >>> 0, false);
    return out;
  }

  function zeros(count) {
    return new Uint8Array(count);
  }

  /** One box: its own length and type, then whatever it holds. */
  function box(type, payload) {
    const body = payload instanceof Uint8Array ? payload : concat(payload);
    return concat([u32(8 + body.length), ascii(type), body]);
  }

  /** A box whose payload opens with a version byte and three flag bytes. */
  function fullBox(type, version, flags, payload) {
    const body = payload instanceof Uint8Array ? payload : concat(payload);
    return box(type, [u8(version), u8(flags >> 16), u8(flags >> 8), u8(flags), body]);
  }

  /**
   * An MPEG-4 descriptor, which is how `esds` describes the AAC stream.
   *
   * Same shape as a box turned inside out: a one-byte tag, then a
   * length written seven bits to a byte with the top bit set on every
   * byte but the last, then the payload.
   */
  function descriptor(tag, payload) {
    const body = payload instanceof Uint8Array ? payload : concat(payload);
    const length = [];
    let remaining = body.length;
    do {
      length.unshift(remaining & 0x7f);
      remaining >>= 7;
    } while (remaining > 0);
    for (let i = 0; i < length.length - 1; i++) length[i] |= 0x80;
    return concat([u8(tag), Uint8Array.from(length), body]);
  }

  /** No rotation, no scaling: the picture as it was encoded. */
  const UNITY_MATRIX = concat([
    u32(0x00010000), u32(0), u32(0),
    u32(0), u32(0x00010000), u32(0),
    u32(0), u32(0), u32(0x40000000),
  ]);

  /** The movie clock. Milliseconds, which every track's length is stated in. */
  const MOVIE_TIMESCALE = 1000;
  /** The video clock. 90kHz divides 24, 25, 30, 50 and 60 frames exactly. */
  const VIDEO_TIMESCALE = 90000;

  const FTYP = box('ftyp', [
    ascii('isom'),
    u32(512),
    ascii('isom'), ascii('iso2'), ascii('avc1'), ascii('mp41'),
  ]);

  /**
   * Assembles a playable MP4 from already-encoded H.264 and AAC chunks.
   *
   * `video.chunks` arrive in DECODE order -- the order the encoder gave
   * them up -- each carrying the microsecond at which it is to be SHOWN.
   * Those two orders are the same unless the encoder reordered frames,
   * and the `ctts` table is what records the difference when it did.
   *
   * The two tracks are interleaved sample by sample so a player reads
   * sound and picture off one stretch of the file rather than seeking
   * between two halves of it.
   */
  function muxMp4({ width, height, fps, video, audio }) {
    const videoDelta = Math.round(VIDEO_TIMESCALE / fps);
    const videoSamples = video.chunks.map((chunk, i) => ({
      track: 1,
      // Round each ideal timestamp instead of accumulating one rounded delta.
      dts: Math.round((i * VIDEO_TIMESCALE) / fps),
      pts: Math.round((chunk.us * VIDEO_TIMESCALE) / 1e6),
      seconds: i / fps,
      key: chunk.key,
      data: chunk.data,
    }));
    const audioSamples = !audio
      ? []
      : audio.chunks.map((chunk) => {
          const at = Math.round((chunk.us * audio.sampleRate) / 1e6);
          return {
            track: 2,
            dts: at,
            pts: at,
            seconds: at / audio.sampleRate,
            key: true,
            data: chunk.data,
          };
        });
    // Opus carries a little encoder priming at the front that must not be
    // played. The edit list below starts the track past it, and the track's
    // own length keeps it, so the file still lasts as long as the sound does.
    const preSkip = audio && audio.codec === OPUS ? opusPreSkip(audio) : 0;

    // An AAC frame is 1024 samples, but the encoder is believed over
    // the specification: the last frame's length is taken from the gap
    // before it, so a file still adds up if it ever differs. Opus is
    // always 48kHz and 20ms a frame, which is 960 samples.
    let audioDelta =
      audioSamples.length > 1
        ? audioSamples[audioSamples.length - 1].dts - audioSamples[audioSamples.length - 2].dts
        : 960;
    if (audio && audio.codec === OPUS && audio.samples > 0 && audioSamples.length > 0) {
      // The file must last exactly as long as the sound that went in, once
      // the priming is dropped. The encoder may hand over a last frame past
      // that point, so the closing run is written as whatever is left
      // rather than as a full 20ms -- the same table ffmpeg writes.
      audioDelta = Math.max(1, audio.samples + preSkip - audioSamples[audioSamples.length - 1].dts);
    }

    const timestampOrder = [...videoSamples, ...audioSamples].sort(
      (a, b) => a.seconds - b.seconds || a.track - b.track,
    );
    // Group samples per track before writing mdat. One sample per chunk made
    // stco/co64 and stsc grow linearly with every frame; fixed-size groups
    // preserve decode order while reducing offset-table entries dramatically.
    const SAMPLES_PER_CHUNK = 16;
    const chunksByTrack = new Map();
    for (const samples of [videoSamples, audioSamples]) {
      if (samples.length === 0) continue;
      const chunks = [];
      for (let at = 0; at < samples.length; at += SAMPLES_PER_CHUNK) {
        chunks.push({ track: samples[0].track, samples: samples.slice(at, at + SAMPLES_PER_CHUNK) });
      }
      chunksByTrack.set(samples[0].track, chunks);
    }
    const mediaChunks = [...chunksByTrack.values()]
      .flat()
      .sort((a, b) => a.samples[0].seconds - b.samples[0].seconds || a.track - b.track);
    const ordered = mediaChunks.flatMap((chunk) => chunk.samples);
    let mdatBytes = 0;
    for (const chunk of mediaChunks) {
      chunk.offset = mdatBytes;
      for (const sample of chunk.samples) {
        sample.offset = mdatBytes;
        mdatBytes += sample.data.length;
      }
    }

    // Past about 3.75GB both the offset table and `mdat`'s own length
    // field overflow 32 bits, so both take their 64-bit form. The
    // threshold leaves far more slack than any `moov` could need.
    const wide = mdatBytes > 0xf0000000;
    const mdatHeader = wide
      ? concat([u32(1), ascii('mdat'), u64(16 + mdatBytes)])
      : concat([u32(8 + mdatBytes), ascii('mdat')]);

    /** How long a track runs, in its own clock. */
    const spanOf = (samples, lastDelta) =>
      samples.length === 0 ? 0 : samples[samples.length - 1].dts - samples[0].dts + lastDelta;
    const videoLastDelta =
      videoSamples.length > 0
        ? Math.max(
            1,
            Math.round((videoSamples.length * VIDEO_TIMESCALE) / fps) -
              videoSamples[videoSamples.length - 1].dts,
          )
        : videoDelta;
    const videoSpan = spanOf(videoSamples, videoLastDelta);
    const audioSpan = spanOf(audioSamples, audioDelta);
    const asMs = (ticks, timescale) => Math.round((ticks / timescale) * MOVIE_TIMESCALE);
    const videoMs = asMs(videoSpan, VIDEO_TIMESCALE);
    const audioMs = audio ? asMs(audioSpan, audio.sampleRate) : 0;
    const movieMs = Math.max(videoMs, audioMs);

    /** The sample tables for one track, in that track's decode order. */
    const sampleTable = (entry, samples, lastDelta, base, chunks) => {
      const stts = [];
      for (let i = 0; i < samples.length; i++) {
        const delta = i + 1 < samples.length ? samples[i + 1].dts - samples[i].dts : lastDelta;
        const last = stts[stts.length - 1];
        if (last && last.delta === delta) last.count += 1;
        else stts.push({ count: 1, delta });
      }

      // How far each sample's showing time is from its decoding time.
      // Zero for all of them unless the encoder reordered frames, and a
      // table of zeroes says nothing, so it is left out when it is.
      const ctts = [];
      for (const sample of samples) {
        const offset = sample.pts - sample.dts;
        const last = ctts[ctts.length - 1];
        if (last && last.offset === offset) last.count += 1;
        else ctts.push({ count: 1, offset });
      }
      const reordered = ctts.some((run) => run.offset !== 0);

      // `stss` lists the samples that can be seeked to. An absent table
      // means every sample can, which is true of sound and of nothing
      // else, so it is written only when some samples cannot.
      const syncs = [];
      for (let i = 0; i < samples.length; i++) if (samples[i].key) syncs.push(i + 1);

      return box('stbl', [
        fullBox('stsd', 0, 0, [u32(1), entry]),
        fullBox('stts', 0, 0, [
          u32(stts.length),
          ...stts.map((run) => concat([u32(run.count), u32(run.delta)])),
        ]),
        ...(reordered
          ? [
              fullBox('ctts', 1, 0, [
                u32(ctts.length),
                ...ctts.map((run) => concat([u32(run.count), i32(run.offset)])),
              ]),
            ]
          : []),
        ...(syncs.length === samples.length
          ? []
          : [fullBox('stss', 0, 0, [u32(syncs.length), ...syncs.map((n) => u32(n))])]),
        fullBox('stsc', 0, 0, [
          u32(chunks.length === 0 ? 0 : chunks.reduce((count, chunk, index) => {
            const previous = chunks[index - 1];
            return count + (!previous || previous.samples.length !== chunk.samples.length ? 1 : 0);
          }, 0)),
          ...chunks.flatMap((chunk, index) => {
            const previous = chunks[index - 1];
            return !previous || previous.samples.length !== chunk.samples.length
              ? [u32(index + 1), u32(chunk.samples.length), u32(1)]
              : [];
          }),
        ]),
        fullBox('stsz', 0, 0, [
          u32(0),
          u32(samples.length),
          ...samples.map((sample) => u32(sample.data.length)),
        ]),
        wide
          ? fullBox('co64', 0, 0, [u32(chunks.length), ...chunks.map((chunk) => u64(base + chunk.offset))])
          : fullBox('stco', 0, 0, [u32(chunks.length), ...chunks.map((chunk) => u32(base + chunk.offset))]),
      ]);
    };

    const name = new Uint8Array(32);
    name[0] = 15;
    name.set(ascii('MusicNote H.264'), 1);

    const avc1 = box('avc1', [
      zeros(6), u16(1),
      u16(0), u16(0), zeros(12),
      u16(width), u16(height),
      u32(0x00480000), u32(0x00480000), // 72dpi, as every encoder writes
      u32(0), u16(1),
      name,
      u16(0x0018), u16(0xffff),
      box('avcC', video.description),
      // The encoder hands back full-range YUV, and a file that does not say
      // so is decoded as limited range: the export then looks darker and
      // flatter than the frame the preview drew from the same canvas.
      // `nclx` states the range, and BT.709 primaries with the sRGB transfer
      // for the matrix the encoder used.
      box('colr', [
        ascii('nclx'),
        u16(1), u16(13), u16(1),
        u8(0x80),
      ]),
    ]);

    /**
     * The sound track's sample entry, which says what the bytes in `mdat`
     * are. An `mp4a` wrapping an `esds` for AAC; an `Opus` entry wrapping a
     * `dOps` for Opus, which is the shape the Opus-in-ISOBMFF spec defines.
     *
     * Opus always encodes with a little priming at the front -- 312 samples
     * at 48kHz -- and the decoder has to be told to drop it. `dOps` carries
     * the value, and the edit list below repeats it, which is what ffmpeg
     * writes for the same stream.
     */
    const opusConfig = audio && audio.codec === OPUS ? opusDPacket(audio) : null;
    const audioEntry = !audio
      ? null
      : audio.codec === OPUS
        ? box('Opus', [
            zeros(6), u16(1),
            zeros(8),
            u16(audio.channels), u16(16), u16(0), u16(0),
            u32(audio.sampleRate * 65536),
            box('dOps', opusConfig),
          ])
        : box('mp4a', [
            zeros(6), u16(1),
            zeros(8),
            u16(audio.channels), u16(16), u16(0), u16(0),
            u32(audio.sampleRate * 65536), // 16.16 fixed point
            fullBox('esds', 0, 0,
              descriptor(0x03, [
                u16(1), u8(0),
                descriptor(0x04, [
                  u8(0x40), // MPEG-4 audio
                  u8(0x15), // an audio stream, not upstream of anything
                  zeros(3),
                  u32(audio.bitrate), u32(audio.bitrate),
                  descriptor(0x05, [audio.description]),
                ]),
                descriptor(0x06, [u8(0x02)]),
              ]),
            ),
          ]);

    /**
     * One track. `base` is where `mdat`'s payload begins, which is the
     * only thing in here that cannot be known until `moov` has a length.
     *
     * `editStart` is priming the container records rather than the sample
     * times: Opus keeps its pre-skip in `dOps`, and the edit list repeats
     * it, so the decoder drops that much sound instead of playing it.
     */
    const trak = ({ id, handler, label, timescale, span, trackMs, samples, lastDelta, entry, editStart }, base) => {
      // An encoder that reports its own priming -- a first sample timed
      // before zero -- is saying to throw that much away before playing.
      // An edit list is how an MP4 says so, and is why the sound and the
      // picture still start together when it does.
      const first = samples.length > 0 ? samples[0].pts : 0;
      const edits = [];
      if (editStart > 0) {
        // The edit covers only what is left once the priming is gone, so
        // the track plays for the length of the sound that went in.
        edits.push(
          box('edts', [
            fullBox('elst', 0, 0, [
              u32(1), u32(asMs(span - editStart, timescale)), i32(editStart), u16(1), u16(0),
            ]),
          ]),
        );
      } else if (first < 0) {
        edits.push(
          box('edts', [
            fullBox('elst', 0, 0, [u32(1), u32(trackMs), i32(-first), u16(1), u16(0)]),
          ]),
        );
      } else if (first > 0) {
        edits.push(
          box('edts', [
            fullBox('elst', 0, 0, [
              u32(2),
              u32(asMs(first, timescale)), i32(-1), u16(1), u16(0),
              u32(trackMs), i32(0), u16(1), u16(0),
            ]),
          ]),
        );
      }

      return box('trak', [
        fullBox('tkhd', 0, 7, [
          u32(0), u32(0), u32(id), u32(0), u32(trackMs),
          zeros(8),
          u16(0), u16(0),
          u16(handler === 'soun' ? 0x0100 : 0), u16(0),
          UNITY_MATRIX,
          u32(handler === 'vide' ? width * 65536 : 0),
          u32(handler === 'vide' ? height * 65536 : 0),
        ]),
        ...edits,
        box('mdia', [
          fullBox('mdhd', 0, 0, [
            u32(0), u32(0), u32(timescale), u32(span),
            u16(0x55c4), // 'und' -- no language is claimed
            u16(0),
          ]),
          fullBox('hdlr', 0, 0, [u32(0), ascii(handler), zeros(12), ascii(label), u8(0)]),
          box('minf', [
            handler === 'vide'
              ? fullBox('vmhd', 0, 1, [u16(0), u16(0), u16(0), u16(0)])
              : fullBox('smhd', 0, 0, [u16(0), u16(0)]),
            box('dinf', [fullBox('dref', 0, 0, [u32(1), fullBox('url ', 0, 1, [])])]),
            sampleTable(entry, samples, lastDelta, base, chunksByTrack.get(id) ?? []),
          ]),
        ]),
      ]);
    };

    const tracks = [
      {
        id: 1, handler: 'vide', label: 'VideoHandler',
        timescale: VIDEO_TIMESCALE, span: videoSpan, trackMs: videoMs,
        samples: videoSamples, lastDelta: videoLastDelta, entry: avc1,
      },
    ];
    if (audio) {
      tracks.push({
        id: 2, handler: 'soun', label: 'SoundHandler',
        timescale: audio.sampleRate, span: audioSpan, trackMs: audioMs,
        samples: audioSamples, lastDelta: audioDelta, entry: audioEntry,
        editStart: preSkip,
      });
    }

    const buildMoov = (base) =>
      box('moov', [
        fullBox('mvhd', 0, 0, [
          u32(0), u32(0), u32(MOVIE_TIMESCALE), u32(movieMs),
          u32(0x00010000), u16(0x0100), u16(0), zeros(8),
          UNITY_MATRIX, zeros(24),
          u32(tracks.length + 1),
        ]),
        ...tracks.map((track) => trak(track, base)),
      ]);

    // Every field in `moov` is fixed-width, so filling the real offsets
    // in cannot change its length -- which is the only reason the
    // offsets can be worked out from a `moov` built with none.
    const probe = buildMoov(0);
    const moov = buildMoov(FTYP.length + probe.length + mdatHeader.length);

    // Handed to the Blob in pieces: joining a gigabyte of frames into
    // one array first would double the memory a long video needs for no
    // gain, since this is the last thing done with them.
    const parts = [FTYP, moov, mdatHeader];
    for (const sample of ordered) parts.push(sample.data);
    return new Blob(parts, { type: 'video/mp4' });
  }

  /**
   * Write a fast-start, seekable MP4 to any WritableStream sink. The muxer
   * still computes the moov offsets before writing (MP4 requires that), but
   * Blob.stream() lets the sink receive the final file incrementally instead
   * of forcing callers to call arrayBuffer() and duplicate the whole file.
   */
  async function muxMp4ToStream(options, writable) {
    if (!writable || typeof writable.getWriter !== 'function') {
      throw new TypeError('muxMp4ToStream requires a WritableStream');
    }
    const blob = muxMp4(options);
    const reader = blob.stream().getReader();
    const writer = writable.getWriter();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error).catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
      writer.releaseLock();
    }
    return { bytes: blob.size, type: blob.type };
  }

  // ---------------------------------------------------------------
  // Encoding.
  // ---------------------------------------------------------------

  function hasWebCodecs(audioRequired = true) {
    const videoReady =
      typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function';
    const audioReady =
      typeof window.AudioEncoder === 'function' && typeof window.AudioData === 'function';
    return videoReady && (!audioRequired || audioReady);
  }

  /**
   * H.264's levels, as the ceiling each puts on picture size and on how
   * many macroblocks a second may be decoded. A codec string has to
   * name a level the stream actually fits inside, or a decoder is
   * entitled to refuse it. Table A-1, ITU-T H.264.
   */
  const AVC_LEVELS = [
    { hex: '1e', maxFrame: 1620, maxRate: 40500 }, //   3.0  -- 720x480@30
    { hex: '1f', maxFrame: 3600, maxRate: 108000 }, //  3.1  -- 1280x720@30
    { hex: '20', maxFrame: 5120, maxRate: 216000 }, //  3.2
    { hex: '28', maxFrame: 8192, maxRate: 245760 }, //  4.0  -- 1920x1080@30
    { hex: '2a', maxFrame: 8704, maxRate: 522240 }, //  4.2  -- 1920x1080@60
    { hex: '32', maxFrame: 22080, maxRate: 589824 }, // 5.0
    { hex: '33', maxFrame: 36864, maxRate: 983040 }, // 5.1  -- 4K@30
    { hex: '34', maxFrame: 36864, maxRate: 2073600 }, // 5.2 -- 4K@60
  ];

  /** H.264 codec strings for this picture, best profile first. */
  function avcCodecs(width, height, fps) {
    const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
    const level =
      AVC_LEVELS.find((l) => macroblocks <= l.maxFrame && macroblocks * fps <= l.maxRate) ??
      AVC_LEVELS[AVC_LEVELS.length - 1];
    // High, then Main, then Constrained Baseline: High is worth more
    // per bit on flat colour and thin lines, which is the whole picture
    // here, and the others are only there for a machine that will not
    // encode it.
    return ['6400', '4d40', '42e0'].map((profile) => `avc1.${profile}${level.hex}`);
  }

  /** AAC-LC: the sound every MP4 player has, where the browser encodes it. */
  const AAC = 'mp4a.40.2';
  /** Opus in an MP4, for a browser that ships H.264 but no AAC encoder. */
  const OPUS = 'opus';
  const AAC_BITRATE = 192000;
  const OPUS_BITRATE = 128000;

  /**
   * What this browser can actually produce -- codecs AND container, as
   * one decision.
   *
   * It has to be one decision: an MP4 cannot hold VP8 and a WebM cannot
   * hold H.264, so there is no choosing a codec and then asking what to
   * put it in. MP4 is what every phone, editor and upload page takes
   * without being asked twice, so it is tried first: with AAC-LC sound
   * where the browser encodes it, and with Opus where it does not --
   * Chromium on Linux encodes H.264 and Opus but no AAC, and demanding
   * AAC put every export on that machine into a WebM instead. WebM is
   * what is left for a browser that will not encode H.264 at all.
   */
  async function pickFormat(width, height, fps, bitrate, audioChannels) {
    const encodesVideo = async (codec) => {
      try {
        const support = await window.VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate,
          framerate: fps,
          ...(codec.startsWith('avc1') ? { avc: { format: 'avc' } } : {}),
        });
        return Boolean(support && support.supported);
      } catch (err) {
        return false;
      }
    };
    const encodesAudio = async (codec, codecBitrate) => {
      if (audioChannels === 0) return true; // a silent video needs no encoder
      try {
        const support = await window.AudioEncoder.isConfigSupported({
          codec,
          sampleRate: AUDIO_SAMPLE_RATE,
          numberOfChannels: audioChannels,
          bitrate: codecBitrate,
        });
        return Boolean(support && support.supported);
      } catch (err) {
        return false;
      }
    };

    const h264 = [];
    for (const codec of avcCodecs(width, height, fps)) {
      if (await encodesVideo(codec)) h264.push(codec);
    }
    if (h264.length > 0) {
      if (await encodesAudio(AAC, AAC_BITRATE)) {
        return { container: 'mp4', video: h264[0], audio: AAC, audioBitrate: AAC_BITRATE };
      }
      if (await encodesAudio(OPUS, OPUS_BITRATE)) {
        return { container: 'mp4', video: h264[0], audio: OPUS, audioBitrate: OPUS_BITRATE };
      }
    }
    if (await encodesAudio(OPUS, OPUS_BITRATE)) {
      for (const codec of ['vp8', 'vp09.00.10.08']) {
        if (await encodesVideo(codec)) {
          return { container: 'webm', video: codec, audio: OPUS, audioBitrate: OPUS_BITRATE };
        }
      }
    }
    return null;
  }

  /**
   * Bits a second for a picture of this size at this rate.
   *
   * Notation is the hard case for any encoder: thin black lines on
   * white, hard edges everywhere, and a reader who is looking straight
   * at them. 0.15 bits per pixel per frame keeps a stave line a stave
   * line -- about 9.3Mbps at 1920x1080@30, which is what the upload
   * pages of the video sites ask for anyway.
   */
  function defaultBitrate(width, height, fps) {
    return Math.min(16_000_000, Math.max(4_000_000, Math.round(width * height * fps * 0.15)));
  }

  /**
   * Keep encoder backpressure conservative on small devices. Encoded chunks
   * still have to remain available until muxing, so queue memory is only one
   * part of the peak; this helper deliberately does not pretend to be a
   * complete browser heap measurement.
   */
  function renderMemoryPolicy() {
    const deviceMemory = typeof navigator !== 'undefined' ? Number(navigator.deviceMemory) : 0;
    if (deviceMemory > 0 && deviceMemory <= 2) {
      return { highWater: 6, lowWater: 3, budgetBytes: 256 * 1024 * 1024 };
    }
    if (deviceMemory > 0 && deviceMemory <= 4) {
      return { highWater: 8, lowWater: 4, budgetBytes: 512 * 1024 * 1024 };
    }
    return { highWater: 12, lowWater: 6, budgetBytes: 1024 * 1024 * 1024 };
  }

  function bytesOfAudioBuffer(buffer) {
    return buffer ? buffer.length * buffer.numberOfChannels * 4 : 0;
  }

  /**
   * The chosen codec, from one AudioBuffer covering the whole video.
   *
   * Handed over in 20ms slices, which is what Opus encodes in and a
   * comfortable bite for AAC, which regroups them into its own
   * 1024-sample frames. Either way both report a `description` -- the
   * few bytes a player needs before it can decode anything -- which
   * goes into the file beside the sound.
   */
  async function encodeAudio(buffer, format, shouldStop) {
    const chunks = [];
    let description;
    let encoderError = null;
    const encoder = new window.AudioEncoder({
      output: (chunk, metadata) => {
        if (metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
          description = new Uint8Array(metadata.decoderConfig.description);
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ us: chunk.timestamp, data });
      },
      error: (err) => {
        encoderError = err;
        console.error('Audio encoder:', err);
      },
    });
    try {
      const channels = Math.min(2, buffer.numberOfChannels);
      encoder.configure({
        codec: format.audio,
        sampleRate: buffer.sampleRate,
        numberOfChannels: channels,
        bitrate: format.audioBitrate,
      });

      const SLICE = Math.round(buffer.sampleRate * 0.02);
      const planes = [];
      for (let c = 0; c < channels; c++) planes.push(buffer.getChannelData(c));
      for (let start = 0; start < buffer.length; start += SLICE) {
        if (shouldStop && shouldStop()) break;
        const count = Math.min(SLICE, buffer.length - start);
        const planar = new Float32Array(count * channels);
        for (let c = 0; c < channels; c++) {
          planar.set(planes[c].subarray(start, start + count), c * count);
        }
        const data = new window.AudioData({
          format: 'f32-planar',
          sampleRate: buffer.sampleRate,
          numberOfFrames: count,
          numberOfChannels: channels,
          timestamp: Math.round((start / buffer.sampleRate) * 1e6),
          data: planar,
        });
        try {
          encoder.encode(data);
        } finally {
          data.close();
        }
        if (encoder.encodeQueueSize > 40) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (encoderError) throw encoderError;
      }
      await encoder.flush();
      if (encoderError) throw new Error(`Audio encoding failed: ${encoderError.message || encoderError}`);
      return {
        chunks,
        description:
          description ?? (format.audio === AAC ? aacConfigFor(buffer.sampleRate, channels) : undefined),
        sampleRate: buffer.sampleRate,
        channels,
        bitrate: format.audioBitrate,
        codec: format.audio,
        // What the muxer needs to state the sound's own length: Opus pads
        // its last frame, so the samples that went in are the truth.
        samples: buffer.length,
      };
    } finally {
      if (encoder.state !== 'closed') {
        try {
          encoder.close();
        } catch (error) {
          console.warn('Audio encoder cleanup failed:', error);
        }
      }
    }
  }

  /**
   * The two bytes an AAC decoder needs, worked out rather than reported.
   *
   * Only reached if an encoder hands over AAC without describing it:
   * five bits of object type (2, AAC-LC), four of sample rate and four
   * of channel count. Opus always reports its own, and a missing one
   * there stays missing -- there is nothing to reconstruct it from.
   */
  function aacConfigFor(sampleRate, channels) {
    const RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
    const index = RATES.indexOf(sampleRate);
    if (index < 0) return undefined;
    return Uint8Array.from([(2 << 3) | (index >> 1), ((index & 1) << 7) | (channels << 3)]);
  }

  /** Opus's encoder priming at 48kHz, for an encoder that did not report it. */
  const OPUS_PRE_SKIP = 312;

  /**
   * Samples the Opus decoder must throw away before playing.
   *
   * The encoder describes itself with an `OpusHead` block, whose pre-skip
   * is two bytes little-endian at offset 10. The value is used as handed
   * over rather than assumed, since an encoder may pad differently; the
   * specification's 312 is the fallback.
   */
  function opusPreSkip(audio) {
    const head = audio.description;
    if (head && head.length >= 12
      && String.fromCharCode(...head.subarray(0, 8)) === 'OpusHead') {
      return head[10] | (head[11] << 8);
    }
    return OPUS_PRE_SKIP;
  }

  /**
   * The `dOps` payload: the Opus configuration an MP4 carries in the
   * sample entry, since an ISO BMFF file has no `OpusHead` header to read.
   *
   * Version, channel count, pre-skip, input rate, gain and channel
   * mapping, all big-endian because that is the side of the fence an
   * MP4 is written on. ffmpeg writes exactly these bytes for the same
   * stream.
   */
  function opusDPacket(audio) {
    return concat([
      u8(0), // version
      u8(audio.channels),
      u16(opusPreSkip(audio)),
      u32(audio.sampleRate),
      u16(0), // output gain
      u8(0), // channel mapping family
    ]);
  }

  /** 48kHz: what an MP4 is mastered at, and what every encoder here takes. */
  const AUDIO_SAMPLE_RATE = 48000;

  /**
   * The channel count the whole video is mastered at: stereo if any segment
   * carries stereo, mono otherwise.
   *
   * The widest segment decides, not the narrowest. A mono clip appended
   * after a stereo recording -- the Thank You clip is mono -- would
   * otherwise fold the recording down to mono, and the viewer would lose a
   * channel they supplied. OfflineAudioContext widens a mono source to
   * stereo on its own, so mixing up costs nothing.
   */
  function audioChannelsFor(segments) {
    const counts = segments.filter((segment) => segment.audio).map((segment) => segment.audio.numberOfChannels);
    if (counts.length === 0) return 0;
    return Math.min(2, Math.max(1, ...counts));
  }

  /** Joins the segments' audio into one buffer covering the whole video. */
  async function joinAudio(segments, totalSeconds) {
    const sampleRate = AUDIO_SAMPLE_RATE;
    const channels = audioChannelsFor(segments);
    if (channels === 0) return null;
    const length = Math.max(1, Math.ceil(totalSeconds * sampleRate));
    const offline = new OfflineAudioContext(channels, length, sampleRate);
    let at = 0;
    for (const segment of segments) {
      if (segment.audio) {
        const source = offline.createBufferSource();
        source.buffer = segment.audio;
        source.connect(offline.destination);
        source.start(at);
      }
      at += segment.seconds;
    }
    return await offline.startRendering();
  }

  // ---------------------------------------------------------------
  // The render itself.
  // ---------------------------------------------------------------

  async function renderWithWebCodecs(options) {
    const { width, height, fps, segments, onProgress, shouldStop } = options;
    const bitrate = options.bitrate ?? defaultBitrate(width, height, fps);
    const audioChannels = audioChannelsFor(segments);
    const format = await pickFormat(width, height, fps, bitrate, audioChannels);
    if (!format) return null;
    const codec = format.video;
    const memoryPolicy = renderMemoryPolicy();
    const totalSeconds = segments.reduce((sum, segment) => sum + segment.seconds, 0);
    const projectedVideoBytes = (bitrate * totalSeconds) / 8;
    const projectedPcmBytes = audioChannels > 0 ? totalSeconds * AUDIO_SAMPLE_RATE * audioChannels * 4 : 0;
    const projectedAudioBytes = audioChannels > 0 ? (format.audioBitrate * totalSeconds) / 8 : 0;
    // The encoded samples remain live while the fast-start Blob is built.
    // Reserve a second video-sized copy for muxing, plus whichever audio
    // representation is larger. Reject before allocating full-frame or
    // encoder buffers rather than risking a tab crash on a long take.
    const projectedPeakBytes = Math.ceil(
      projectedVideoBytes * 2 + Math.max(projectedPcmBytes, projectedAudioBytes),
    );
    if (projectedPeakBytes > memoryPolicy.budgetBytes) {
      throw new RangeError(
        `This video is estimated to need ${(projectedPeakBytes / 1048576).toFixed(0)} MB during export, ` +
          `above this device's ${(memoryPolicy.budgetBytes / 1048576).toFixed(0)} MB safety budget. ` +
          'Shorten the video or use a smaller output size.',
      );
    }

    let canvas = null;
    let encoder = null;
    let joined = null;
    let audio = null;
    const videoChunks = [];
    // The parameter sets -- the few bytes saying what shape the stream
    // is -- come alongside the first frame rather than inside it, and
    // an MP4 cannot be written without them.
    let videoDescription;
    let encoderError = null;
    let encodedVideoBytes = 0;
    let pcmAudioBytes = 0;
    let frameIndex = 0;
    let stopped = false;
    try {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not allocate a 2D canvas for video export');

      encoder = new window.VideoEncoder({
        output: (chunk, metadata) => {
          if (metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
            videoDescription = new Uint8Array(metadata.decoderConfig.description);
          }
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          encodedVideoBytes += data.byteLength;
          videoChunks.push({ us: chunk.timestamp, key: chunk.type === 'key', data });
          const liveEstimate = encodedVideoBytes * 2 + Math.max(pcmAudioBytes, projectedAudioBytes);
          if (liveEstimate > memoryPolicy.budgetBytes) {
            encoderError = new RangeError('Encoded video exceeded the device memory safety budget');
          }
        },
        error: (err) => {
          encoderError = err;
          console.error('Video encoder:', err);
        },
      });
      encoder.configure({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        latencyMode: 'quality',
        // `avc` format means every chunk arrives as length-prefixed NAL
        // units with the stream's parameter sets handed over separately,
        // which is the only shape an MP4 can hold them in. Without it the
        // encoder emits Annex B, which is a different file format.
        ...(codec.startsWith('avc1') ? { avc: { format: 'avc' } } : {}),
      });

      const plan = timelinePlan(segments, fps);
      const totalFrames = Math.max(1, plan.frames);
      const frameDuration = 1e6 / fps;
      const keyEvery = Math.max(1, Math.round(fps * 2));

      for (const entry of plan.segments) {
        if (stopped) break;
        const { segment, frames } = entry;
        if (segment.onStart) await segment.onStart();
        try {
          for (let i = 0; i < frames; i++) {
            if (shouldStop && shouldStop()) {
              stopped = true;
              break;
            }
            const at = i / fps;
            // A source that needs waiting waits inside its own draw callback.
            await segment.draw(ctx, at, i);
            const frame = new window.VideoFrame(canvas, {
              timestamp: Math.round(frameIndex * frameDuration),
              duration: Math.round(frameDuration),
            });
            try {
              encoder.encode(frame, { keyFrame: frameIndex % keyEvery === 0 });
            } finally {
              frame.close();
            }
            frameIndex += 1;
            if (encoder.encodeQueueSize > memoryPolicy.highWater) {
              while (encoder.encodeQueueSize > memoryPolicy.lowWater) {
                if (encoderError) throw encoderError;
                await new Promise((resolve) => setTimeout(resolve, 1));
              }
            }
            if (encoderError) throw encoderError;
            if (onProgress && frameIndex % 10 === 0) {
              onProgress((frameIndex / totalFrames) * 0.75, 'Rendering');
            }
          }
        } finally {
          if (segment.onEnd) await segment.onEnd();
        }
      }

      await encoder.flush();
      if (encoderError) throw new Error(`Video encoding failed: ${encoderError.message || encoderError}`);
      encoder.close();
      encoder = null;

      if (onProgress) onProgress(0.75, 'Encoding the sound');
      // A cancelled render must not append the original full-length soundtrack
      // to the shorter video that was actually encoded.
      const renderedSeconds = frameIndex / fps;
      joined = await joinAudio(segments, renderedSeconds);
      pcmAudioBytes = bytesOfAudioBuffer(joined);
      if (joined) audio = await encodeAudio(joined, format, shouldStop);
      else if (onProgress) onProgress(0.9, 'Writing the file');
      // Encoded sound is now independent of the potentially large PCM buffer.
      joined = null;

      if (onProgress) onProgress(0.9, 'Writing the file');
      if (format.container === 'mp4' && !videoDescription) {
        throw new Error('H.264 encoder did not provide decoder configuration');
      }
      const blob =
        format.container === 'mp4'
          ? muxMp4({
              width,
              height,
              fps,
              video: { chunks: videoChunks, description: videoDescription },
              audio,
            })
          : muxWebM({
              videoCodec: codec,
              width,
              height,
              videoChunks,
              audio,
              durationMs: (frameIndex / fps) * 1000,
            });
      if (onProgress) onProgress(1, 'Complete');
      const encodedAudioBytes = audio
        ? audio.chunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0)
        : 0;
      const estimatedPeakBytes = encodedVideoBytes * 2 + Math.max(pcmAudioBytes, encodedAudioBytes);
      return {
        blob,
        extension: format.container,
        container: format.container,
        videoCodec: codec,
        audioCodec: audio ? format.audio : null,
        bitrate,
        frames: frameIndex,
        fps,
        seconds: frameIndex / fps,
        path: 'webcodecs',
        cancelled: stopped,
        memory: {
          encodedVideoBytes,
          encodedAudioBytes,
          pcmAudioBytes,
          estimatedPeakBytes,
          budgetBytes: memoryPolicy.budgetBytes,
          withinBudget: estimatedPeakBytes <= memoryPolicy.budgetBytes,
        },
      };
    } finally {
      if (encoder && encoder.state !== 'closed') {
        try {
          encoder.close();
        } catch (error) {
          console.warn('Video encoder cleanup failed:', error);
        }
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      videoChunks.length = 0;
      if (audio && Array.isArray(audio.chunks)) audio.chunks.length = 0;
      joined = null;
      audio = null;
    }
  }

  // ---------------------------------------------------------------
  // The fallback, for a browser with no WebCodecs.
  // ---------------------------------------------------------------

  function pickRecorderMime() {
    for (const type of [
      'video/mp4;codecs=avc1.640028,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]) {
      if (window.MediaRecorder && window.MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  function waitForRecorderDone(done, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('MediaRecorder did not stop within the allowed time')), timeoutMs);
      done.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /**
   * Real-time capture, frame by frame, as good as that can be made.
   *
   * Kept only for browsers that cannot render: it is the path that
   * drops frames under load, and it says so in the result so a page
   * can tell the person why their video is not as smooth.
   */
  async function recordInRealTime(options) {
    const { width, height, fps, segments, onProgress, shouldStop } = options;
    const mimeType = pickRecorderMime();
    if (mimeType === '' || !window.AudioContext) return null;
    const totalSeconds = segments.reduce((sum, segment) => sum + segment.seconds, 0);
    const audioChannels = audioChannelsFor(segments);
    const bitrate = options.bitrate ?? defaultBitrate(width, height, fps);
    const budgetBytes = renderMemoryPolicy().budgetBytes;
    const estimatedBytes = Math.ceil(
      ((bitrate * totalSeconds) / 8) * 2 +
        (audioChannels > 0 ? totalSeconds * AUDIO_SAMPLE_RATE * audioChannels * 4 : 0),
    );
    if (estimatedBytes > budgetBytes) {
      throw new RangeError(
        `This video is estimated to need ${(estimatedBytes / 1048576).toFixed(0)} MB during export, ` +
          `above this device's ${(budgetBytes / 1048576).toFixed(0)} MB safety budget. ` +
          'Shorten the video or use a smaller output size.',
      );
    }
    let canvas = null;
    let audioCtx = null;
    let dest = null;
    let stream = null;
    let recorder = null;
    let source = null;
    let joined = null;
    const chunks = [];
    let frameIndex = 0;
    let cancelled = false;
    let recorderStarted = false;
    let recorderFinished = false;
    let doneResolve;
    let doneReject;
    const done = new Promise((resolve, reject) => {
      doneResolve = resolve;
      doneReject = reject;
    });
    // Keep an immediate rejection handler attached while frame drawing is
    // in progress; the awaited call below still receives the same failure.
    done.catch(() => {});

    try {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not allocate a 2D canvas for video export');

      audioCtx = new AudioContext();
      dest = audioCtx.createMediaStreamDestination();
      joined = await joinAudio(segments, totalSeconds);

      stream = canvas.captureStream(fps);
      for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        recorderFinished = true;
        doneResolve();
      };
      recorder.onerror = (event) => doneReject(event.error || new Error('MediaRecorder failed'));
      recorder.start(1000);
      recorderStarted = true;

      if (joined) {
        source = audioCtx.createBufferSource();
        source.buffer = joined;
        source.connect(dest);
        source.start();
      }

      const startedAt = performance.now();
      const plan = timelinePlan(segments, fps);
      for (const entry of plan.segments) {
        if (cancelled) break;
        const { segment, frames } = entry;
        if (segment.onStart) await segment.onStart();
        try {
          for (let i = 0; i < frames; i++) {
            if (shouldStop && shouldStop()) {
              cancelled = true;
              break;
            }
            const due = startedAt + (frameIndex / fps) * 1000;
            const wait = due - performance.now();
            if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
            await segment.draw(ctx, i / fps, i);
            frameIndex += 1;
            if (onProgress && frameIndex % 10 === 0) {
              onProgress(frameIndex / Math.max(1, Math.round(totalSeconds * fps)), 'Recording');
            }
          }
        } finally {
          if (segment.onEnd) await segment.onEnd();
        }
      }
      if (recorder.state !== 'inactive') recorder.stop();
      await waitForRecorderDone(done, 5000);
      const container = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      return {
        blob,
        extension: container,
        container,
        frames: frameIndex,
        fps,
        seconds: frameIndex / fps,
        path: 'mediarecorder',
        cancelled,
      };
    } finally {
      if (recorderStarted && recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (error) {
          console.warn('MediaRecorder stop during cleanup failed:', error);
        }
      }
      if (recorderStarted && !recorderFinished) {
        try {
          await waitForRecorderDone(done, 2000);
        } catch (error) {
          // The original recording error is already being propagated.
        }
      }
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
      }
      if (source) {
        try {
          source.stop();
        } catch (error) {
          // It may already have reached the end of the soundtrack.
        }
      }
      const tracks = new Set();
      if (stream && typeof stream.getTracks === 'function') {
        for (const track of stream.getTracks()) tracks.add(track);
      }
      if (dest && dest.stream && typeof dest.stream.getTracks === 'function') {
        for (const track of dest.stream.getTracks()) tracks.add(track);
      }
      for (const track of tracks) {
        try {
          track.stop();
        } catch (error) {
          console.warn('Media stream track cleanup failed:', error);
        }
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          await audioCtx.close();
        } catch (error) {
          console.warn('AudioContext cleanup failed:', error);
        }
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      chunks.length = 0;
      joined = null;
      source = null;
      dest = null;
      stream = null;
      recorder = null;
      audioCtx = null;
      canvas = null;
    }
  }

  // ---------------------------------------------------------------------
  // The three-part layout, as data.
  //
  // Every video is Title / Info, Notation and the instrument, but the
  // three do not sit in the same order for every instrument: a drum or a
  // piano is watched with the hands at the bottom, a guitar with the neck
  // at the top. So each instrument declares an ORDER and nothing else --
  // there is no `if (instrument === ...)` anywhere below, and adding an
  // instrument is one more entry in this table.
  //
  // A template may list a part the page does not draw yet; `parts` narrows
  // the layout to what the caller actually has, and the shares renormalise
  // over those, so a half-built page still gets a sane frame.
  // ---------------------------------------------------------------------
  /**
   * The one table of colours a frame is drawn from.
   *
   * The Plan's Video Color rule is that switching Black/White changes
   * everything at once, so every part reads its colours here rather than
   * carrying its own. A part that hard-codes a colour would survive the
   * switch and leave white text on a white frame, which is exactly the
   * failure §၁၄ names.
   *
   * `accent` is the one colour an instrument part may use to say "this is
   * being played", so every instrument's marks read the same. `highlight`
   * is the darker fill the COUNT box takes in the Drum layout.
   */
  function paletteFor(color) {
    return color === 'white'
      ? {
        background: '#f7f9fc',
        surface: '#ffffff',
        text: '#111827',
        muted: '#64748b',
        accent: '#2f6feb',
        grid: 'rgba(15,23,42,.16)',
        line: 'rgba(15,23,42,.24)',
        highlight: '#f8c9c9',
        highlightText: '#7f1220',
        notationInk: '#101828',
        // §၁၃.၃(က): the sheet is the frame's own background, so the notation
        // band has no panel edge against the bands beside it.
        notationBackground: '#f7f9fc',
        logoVariant: 'light',
        titleOne: '#ffaa00',
        titleTwo: '#111827',
      }
      : {
        background: '#080d16',
        surface: '#111a29',
        text: '#f8fafc',
        muted: '#91a0b5',
        accent: '#5b9cff',
        grid: 'rgba(148,163,184,.16)',
        line: 'rgba(148,163,184,.22)',
        highlight: '#7f1220',
        highlightText: '#ffd9dd',
        notationInk: '#f8fafc',
        notationBackground: '#080d16',
        logoVariant: 'dark',
        titleOne: '#ffaa00',
        titleTwo: '#e2e8f0',
      };
  }

  /**
   * The circle of fifths, written out: a key is what its `<fifths>` says it
   * is, and no formula beats a table somebody can read.
   */
  const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const MINOR_KEYS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

  function keyName(fifths, mode) {
    const table = String(mode).toLowerCase() === 'minor' ? MINOR_KEYS : MAJOR_KEYS;
    const index = Number(fifths) + 7;
    return table[index] ?? '';
  }

  /**
   * A score's own clock: where each measure starts, the tempo map its marks
   * make, and how long the file runs.
   *
   * The parser hands back measures and tempo marks but no timeline, so this
   * is assembled once here rather than in each instrument's page -- two
   * pages measuring the same file differently is how one video ends before
   * its music does.
   */
  function longestMeasureTicks(parsed, number) {
    let longest = 0;
    for (const part of parsed.score.parts) {
      const measure = part.measures.find((entry) => entry.number === number);
      if (!measure) continue;
      for (const voice of measure.voices) {
        let end = 0;
        let cursor = 0;
        for (const event of voice.events) {
          const startTick = event.startTick ?? cursor;
          cursor = startTick + event.duration.ticks;
          end = Math.max(end, cursor);
        }
        longest = Math.max(longest, end);
      }
    }
    return longest;
  }

  function scoreTimeline(parsed, api) {
    const offsets = new Map();
    const numbers = [];
    for (const part of parsed.score.parts) {
      for (const measure of part.measures) {
        if (!numbers.includes(measure.number)) numbers.push(measure.number);
      }
    }
    let running = 0;
    for (const number of numbers) {
      offsets.set(number, running);
      running += longestMeasureTicks(parsed, number);
    }
    const raw = (parsed.tempoMarks ?? []).map((mark) => ({
      tick: (offsets.get(mark.measureNumber) ?? 0) + mark.tick,
      microsecondsPerQuarter: 60_000_000 /
        (mark.perMinute * (api.ticksWithDots(api.baseTicksForType(mark.beatUnit), mark.beatUnitDots) / api.TICKS_PER_QUARTER)),
    })).filter((event) => Number.isFinite(event.microsecondsPerQuarter) && event.microsecondsPerQuarter > 0);
    const tempoMap = api.buildTempoMap(raw).tempoMap;
    // The file's length comes from its measures, not its last note: a bar
    // that ends in a rest is still part of what the writer wrote.
    const last = numbers[numbers.length - 1];
    const endSeconds = last === undefined
      ? 0
      : api.tickToSeconds(tempoMap, (offsets.get(last) ?? 0) + longestMeasureTicks(parsed, last));
    return { offsets, numbers, tempoMap, endSeconds };
  }

  /**
   * The metre, tempo and key the Title / Info band prints, taken from the
   * parsed score. The first value the file states wins, and a field the
   * file never states keeps the house default rather than printing blank.
   */
  function scoreMeta(parsed) {
    const meta = { beats: 4, beatType: 4, bpm: 120, key: '' };
    const attributes = Array.isArray(parsed?.attributes) ? parsed.attributes[0] : undefined;
    if (attributes) {
      if (Number(attributes.timeNumerator) > 0) meta.beats = Number(attributes.timeNumerator);
      if (Number(attributes.timeDenominator) > 0) meta.beatType = Number(attributes.timeDenominator);
      if (Number.isFinite(Number(attributes.fifths))) meta.key = keyName(Number(attributes.fifths), attributes.mode);
    }
    const tempo = (parsed?.tempoMarks ?? [])[0];
    if (tempo && Number(tempo.perMinute) > 0) meta.bpm = Math.round(Number(tempo.perMinute));
    return meta;
  }

  // ---------------------------------------------------------------------
  // SHARED FRAME PARTS
  //
  // A page composes a frame out of up to three parts -- Title / Info,
  // Notation and Instrument -- and this is where the two that are the
  // SAME on every instrument live. The Plan is explicit that this work
  // belongs to the shared engine and not to each instrument's page: a
  // second copy of the notation loader or the title band is how two
  // videos of the same score start looking different.
  //
  // The Instrument part stays with the page, because that is the only
  // part an instrument actually decides. A page hands its three part
  // drawers to `composeFrame`, which owns where each one goes.
  // ---------------------------------------------------------------------

  /**
   * A small metronome whose arm swings with the beat.
   *
   * The Plan asks for the beat to be visible in the Title / Info band
   * without adding a click: the arm is drawn from `at` and the tempo, so
   * the same second of the video always shows the same frame.
   */
  function drawMetronomeIcon(ctx, x, y, size, at, bpm, color) {
    const beatSeconds = 60 / Math.max(1, bpm);
    const position = at / beatSeconds;
    const phase = position - Math.floor(position);
    const swing = Math.sin(phase * Math.PI) * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, size * 0.5);
    ctx.lineTo(-size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.34, size * 0.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size * 0.12);
    ctx.lineTo(swing * size * 0.5, -size * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(swing * size * 0.5, -size * 0.62, Math.max(1, size * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // The notation engine is a 2 MB bundle that only a score needs, so it is
  // fetched when a MusicXML file is first rendered rather than on every
  // Studio visit. The version key must track notation-editor.html's own.
  const NOTATION_ENGINE_SRC = 'assets/notation-engine.js?v=1cebb3aa609d';
  const BRAVURA_SRC = 'assets/fonts/Bravura.woff2?v=1.482';
  const NOTATION_PX_PER_SPACE = 20;
  // A cursor one staff tall plus its ledger room -- the engine's own
  // cursor is a glyph of about this size.
  const CURSOR_SPACES = 4.5;
  // Page shapes the Notation View control offers, in staff spaces (A4 is
  // 30 x 42, which is the engine's own default sheet).
  const PAGE_SHAPES = {
    landscape: [42, 30],
    portrait: [30, 42],
    square: [30, 30],
  };
  // The Plan gives Notation View two choices only, `Page` and `Horizontal`,
  // and the page's own shape follows the frame's ratio rather than being a
  // third setting (§၁၃.၃ ခ).
  const PAGE_SHAPE_BY_RATIO = { '16:9': 'landscape', '1:1': 'square', '9:16': 'portrait' };

  let notationEnginePromise = null;
  let bravuraBase64 = null;

  const loadNotationEngine = () => {
    if (window.NotationEngine) return Promise.resolve(window.NotationEngine);
    if (notationEnginePromise) return notationEnginePromise;
    notationEnginePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = NOTATION_ENGINE_SRC;
      script.onload = () => (window.NotationEngine
        ? resolve(window.NotationEngine)
        : reject(new Error('The notation engine loaded without its API.')));
      script.onerror = () => reject(new Error('The notation engine could not be loaded.'));
      document.head.appendChild(script);
    });
    return notationEnginePromise;
  };

  /** Bravura travels inside the SVG: an <img> has no access to page fonts. */
  const loadBravura = async () => {
    if (bravuraBase64) return bravuraBase64;
    const response = await fetch(BRAVURA_SRC);
    if (!response.ok) throw new Error('The Bravura music font could not be loaded.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    bravuraBase64 = btoa(binary);
    return bravuraBase64;
  };

  const decodeSvg = (markup) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The notation SVG could not be decoded.')); };
    image.src = url;
  });

  /**
   * The score text of a chosen file. A `.mxl` is a ZIP archive, so its text
   * is behind `META-INF/container.xml` and has to come out through the
   * notation engine's own reader; every other extension is already text.
   */
  const readScoreText = async (file) => {
    if (!file) return null;
    if (!file.name.toLowerCase().endsWith('.mxl')) return await file.text();
    const api = await loadNotationEngine();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { xmlText, diagnostics } = api.unzipMxl(bytes, window.DOMParser);
    if (!xmlText) {
      const detail = (diagnostics || []).map((item) => item.message).filter(Boolean).join(' ');
      throw new Error(detail || 'The .mxl archive could not be read.');
    }
    return xmlText;
  };

  /**
   * The Notation part: one engine render per video, decoded once, then
   * drawn per frame. `page` lays the score on a sheet whose shape follows
   * the part's own rectangle; `scroll` (Horizontal) is one long system.
   */
  const prepareNotation = async (file, settings, rect) => {
    if (!file) return null;
    const api = await loadNotationEngine();
    const mode = settings.notation === 'horizontal' ? 'scroll' : 'page';
    // Page's shape is the frame's own: a landscape video gets a landscape
    // sheet. The old landscape/portrait/square values are read as `Page`
    // so a saved setting keeps working.
    const pageShape = PAGE_SHAPE_BY_RATIO[ratioOf(settings.size.width, settings.size.height)] || 'landscape';
    // Only a page that offers Video Color passes a palette; the rest keep
    // the paper-and-ink sheet they have always had.
    const palette = settings.palette ?? null;
    const config = {
      layout: { mode, pxPerStaffSpace: NOTATION_PX_PER_SPACE },
      colors: palette
        ? { ink: palette.notationInk, background: palette.notationBackground }
        : { ink: '#101828', background: '#ffffff' },
    };
    if (mode === 'page') {
      // The sheet, in staff spaces -- the same A4 proportions the engine
      // defaults to, turned or squared to match the frame.
      const [pageWidth, pageHeight] = PAGE_SHAPES[pageShape];
      config.page = {
        pageWidth,
        pageHeight,
        marginTop: 1.6,
        marginBottom: 1.6,
        marginLeft: 1.4,
        marginRight: 1.4,
      };
    }
    // The sheet the engine was asked for, reported so a caller can check
    // that a frame's ratio reached the page layout.
    let sheet = null;
    if (mode === 'page') {
      const [width, height] = PAGE_SHAPES[pageShape];
      sheet = { shape: pageShape, width, height };
    }
    const parsed = api.parseMusicXml(await readScoreText(file));
    const rendered = api.renderParsedMusicXml(parsed, { config });
    const document = api.exportSvg(rendered.svg, {
      title: settings.titleOne,
      fonts: [{ family: 'Bravura', base64: await loadBravura(), format: 'woff2' }],
    });
    const image = await decodeSvg(document);
    const [, , viewBoxWidth, viewBoxHeight] = (rendered.svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/) || [])
      .slice(1).map(Number);
    const viewBox = { width: viewBoxWidth, height: viewBoxHeight };
    const ink = measureInk(image, { darkInk: palette ? palette.logoVariant === 'light' : true });
    const systemYs = [...new Set(rendered.playback.measureNumbersInOrder
      .map((number) => rendered.playback.placementByMeasureNumber.get(number).systemY))]
      .sort((left, right) => left - right);
    // §၁၃.၂ wants the staff, stems, beams and marks whole inside the band, so
    // the band has to know where each system's ink begins and ends. The row
    // profile the ink measure already walked gives that, per system: systems
    // differ in height (a tempo mark or a repeat makes one taller), which is
    // why one shared height is not enough. The staff line `systemY` is what
    // the cursor is drawn on, so the ink is measured as the worst reach above
    // and below that line -- fitting a total height would let the lower side
    // spill past the band's bottom edge.
    const imagePerSpace = image.naturalWidth / viewBox.width;
    // A score with one system has no neighbour to halve the gap to, so its
    // band is the whole sheet. Reading the second system there would be
    // `undefined` and every band would come out NaN.
    const gapAbove = systemYs.length > 1 ? (systemYs[1] - systemYs[0]) / 2 : systemYs[0];
    // The last system has no successor to halve the gap to, so it takes the
    // same half-gap as every other system rather than doubling the one
    // behind it. A single-system score has no neighbour at all: its band is
    // the whole sheet, which is why its two edges come from the page itself.
    const gapBelow = systemYs.length > 1
      ? (systemYs[systemYs.length - 1] - systemYs[systemYs.length - 2]) / 2
      : Math.max(0, viewBox.height - systemYs[0]);
    const systemBands = systemYs.map((start, index) => {
      // Each system owns half the gap to its neighbours, so a tall tempo mark
      // above one staff is not mistaken for part of the system above it.
      const previous = index > 0 ? (systemYs[index - 1] + start) / 2 : start - gapAbove;
      const following = index + 1 < systemYs.length
        ? (start + systemYs[index + 1]) / 2
        : start + gapBelow;
      let top = Infinity;
      let bottom = -Infinity;
      const first = Math.max(0, Math.floor(previous * imagePerSpace));
      const last = Math.min(ink.rows.length - 1, Math.ceil(following * imagePerSpace));
      for (let y = first; y <= last; y += 1) {
        if (!ink.rows[y]) continue;
        const spaces = y / imagePerSpace;
        if (spaces < top) top = spaces;
        if (spaces > bottom) bottom = spaces;
      }
      return top === Infinity ? null : { top, bottom };
    });
    let inkAbove = 0;
    let inkBelow = 0;
    systemBands.forEach((band, index) => {
      if (!band) return;
      inkAbove = Math.max(inkAbove, systemYs[index] - band.top);
      inkBelow = Math.max(inkBelow, band.bottom - systemYs[index]);
    });
    if (inkAbove + inkBelow === 0 && systemYs.length > 0) {
      // No system band could be measured. The sheet's own ink still says how
      // far the notation reaches, so a band is drawn rather than collapsed to
      // nothing while the score's picture is fine.
      const inkTop = ink.y / imagePerSpace;
      const inkBottom = (ink.y + ink.height) / imagePerSpace;
      inkAbove = Math.max(0, systemYs[0] - inkTop);
      inkBelow = Math.max(0, inkBottom - systemYs[0]);
    }
    return {
      api,
      mode,
      sheet,
      playback: rendered.playback,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      systemYs,
      systemBands,
      inkAbove,
      inkBelow,
      viewBox,
      ink,
      cursor: api.resolveConfig().cursor,
      // The Drum reference picture rings the note being played with a
      // rounded box rather than the engine's own vertical bar. A page that
      // names no shape keeps the bar.
      cursorShape: settings.cursorShape === 'box' ? 'box' : 'bar',
      seconds: rendered.playback.performance?.totalSeconds ?? 0,
    };
  };

  /**
   * The drawn extent of a rendered score, in image pixels. A page carries
   * margins and a scroll system carries room for lyrics, so fitting the
   * raw image would leave the staff a fraction of the part.
   *
   * The ink is whatever stands out from the sheet, not simply "dark": on a
   * Black frame the score is white on a dark sheet, and a fixed threshold
   * would measure the whole page as one ink box.
   */
  const measureInk = (image, { darkInk = true } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;
    const rows = new Array(canvas.height).fill(0);
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const offset = (y * canvas.width + x) * 4;
        const luminance = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        const ink = darkInk ? luminance < 160 : luminance > 96;
        if (!ink || data[offset + 3] < 32) continue;
        rows[y] += 1;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    canvas.width = 0;
    canvas.height = 0;
    if (right < 0) return { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight, rows };
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1, rows };
  };

  /**
   * The Notation part for a frame of a given size. The caller passes the
   * parts it will draw, so the sheet is laid out at the shape it is
   * actually shown in rather than at a shape the page guessed.
   */
  const prepareNotationFor = async (file, settings, parts) => {
    const layout = layoutFor(settings.instrument, {
      width: settings.size.width,
      height: settings.size.height,
      shares: settings.shares,
      parts: parts ?? ['title', 'notation', 'instrument'],
    });
    const rect = layout.rects.notation;
    if (!rect) return null;
    try {
      return await prepareNotation(file, settings, rect);
    } catch (error) {
      return { error: error.message || String(error) };
    }
  };

  /**
   * The slice of the sheet one system owns: its ink plus a small margin, in
   * staff spaces, measured from the system's staff line. A system with no
   * measured ink (an empty score) falls back to the whole sheet so the view
   * still draws something rather than a blank band.
   */
  const SYSTEM_WINDOW_MARGIN = 0.6;
  function systemWindow(state, systemY) {
    const bands = state.systemBands;
    if (Array.isArray(bands) && bands.length) {
      const index = state.systemYs.indexOf(systemY);
      const band = index >= 0 ? bands[index] : null;
      if (band) {
        const above = Math.max(0, systemY - band.top) + SYSTEM_WINDOW_MARGIN;
        const below = Math.max(0, band.bottom - systemY) + SYSTEM_WINDOW_MARGIN;
        return { above, below, height: above + below };
      }
    }
    // Four staff spaces is the height a staff and its marks need; a window
    // smaller than that would clip the very system it is meant to show.
    const above = Math.max(state.inkAbove ?? 0, 4);
    const below = Math.max(state.inkBelow ?? 0, 4);
    return { above, below, height: above + below };
  }

  function drawNotationPart(ctx, rect, at, state, palette = null) {
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.fillStyle = palette ? palette.notationBackground : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    // §၁၃.၂: the part draws only inside its own rect. `composeFrame` already
    // clips each part, but a page may call a part drawer directly (the
    // preview does), so the drawer holds the same rule itself rather than
    // relying on the caller.
    ctx.beginPath();
    ctx.rect(0, 0, rect.width, rect.height);
    ctx.clip();
    if (!state) {
      ctx.fillStyle = palette ? palette.muted : '#8b95a7';
      ctx.font = `600 ${Math.max(10, Math.round(rect.height * 0.07))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Notation needs a MusicXML score', rect.width / 2, rect.height / 2);
      ctx.restore();
      return;
    }

    const { api, ink, viewBox } = state;
    // A repeated score is heard more often than it is written, so the cursor
    // has to jump back at each repeat. Reading the time through the
    // performance plan is what says where; without repeats it returns the
    // same written tick `secondsToTick` does.
    const performance = state.playback.performance;
    const tick = performance?.hasRepeats
      ? api.performanceSecondsToWritten(performance, state.playback.tempoMap, at).writtenTick
      : api.secondsToTick(state.playback.tempoMap, at);
    // The SVG is one staff space per viewBox unit; the image is that times
    // its own scale, so both the ink box and the cursor can be placed in
    // the units the engine measured them in.
    const imageSpace = state.image.naturalWidth / viewBox.width;
    const inkHeight = ink.height / imageSpace;

    if (state.mode === 'scroll') {
      // Horizontal: the system slides left under a marker that stays put.
      const pxPerSpace = (rect.height * 0.9) / inkHeight;
      const placement = api.computeCursorPlacement(state.playback, tick, {
        mode: 'notationMoves',
        viewportWidth: rect.width / pxPerSpace,
      });
      const originX = placement.notationTranslateX * pxPerSpace;
      const originY = (rect.height - inkHeight * pxPerSpace) / 2 - (ink.y / imageSpace) * pxPerSpace;
      ctx.drawImage(state.image, originX, originY,
        state.image.naturalWidth * (pxPerSpace / imageSpace),
        state.image.naturalHeight * (pxPerSpace / imageSpace));
      drawCursor(ctx, state, placement.markerX * pxPerSpace,
        originY + placement.systemY * pxPerSpace, CURSOR_SPACES * pxPerSpace, pxPerSpace);
      ctx.restore();
      return;
    }

    // Page: the sheet slides bottom to top, one system at a time -- the
    // Plan's own wording for this view.
    //
    // §၁၃.၂ asks for the staff whole inside the band, so the sheet is scaled
    // to fit one system's ink rather than to the band's width alone: a
    // width-scaled sheet drew one system 1313 px tall in a 342 px band at
    // 16:9 and sliced every staff at both edges. The ink is fitted above and
    // below the staff line the cursor sits on, so the reading line keeps its
    // place on the frame while the sheet travels. Whichever of the two fits
    // -- width or height -- wins, so a narrow frame still shows the width.
    // The window is this system's own ink plus a hair of margin, so the
    // system is whole inside it and no neighbour can reach the band's edges.
    const placement = api.computeCursorPlacement(state.playback, tick, { mode: 'cursorMoves' });
    const window = systemWindow(state, placement.systemY);
    const byWidth = (rect.width * 0.98) / viewBox.width;
    // The reading line sits a little above the middle, where the reference
    // picture puts it, and it holds still while the sheet travels under it.
    const lineY = rect.height * 0.4;
    // Both sides of that fixed line are budgets of their own: the ink reaches
    // further below the staff than above it, so a single total-height fit
    // would push the lower notes past the band's bottom edge. The budgets are
    // the score's worst system, not this frame's, so the notation keeps one
    // size from the first system to the last instead of zooming between them.
    const pad = rect.height * 0.02;
    // The window's margin is part of the budget, not spare room on top of it:
    // a margin the scale did not pay for would push the ink past the band.
    const worstAbove = Math.max(state.inkAbove ?? 0, 0) + SYSTEM_WINDOW_MARGIN;
    const worstBelow = Math.max(state.inkBelow ?? 0, 0) + SYSTEM_WINDOW_MARGIN;
    const byInk = worstAbove + worstBelow > 0
      ? Math.min(
        worstAbove > 0 ? (lineY - pad) / worstAbove : Infinity,
        worstBelow > 0 ? (rect.height - lineY - pad) / worstBelow : Infinity,
      )
      : Infinity;
    const pxPerSpace = Math.min(byWidth, byInk);
    const placementY = placement.systemY * pxPerSpace;
    const sheetHeight = state.image.naturalHeight * (pxPerSpace / imageSpace);
    const originX = (rect.width - viewBox.width * pxPerSpace) / 2;
    const originY = lineY - placementY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, lineY - window.above * pxPerSpace, rect.width, window.height * pxPerSpace);
    ctx.clip();
    ctx.drawImage(state.image, originX, originY,
      state.image.naturalWidth * (pxPerSpace / imageSpace), sheetHeight);
    ctx.restore();
    drawCursor(ctx, state, originX + placement.markerX * pxPerSpace,
      lineY, CURSOR_SPACES * pxPerSpace, pxPerSpace);
    ctx.restore();
  }

  // Half the reference picture's cursor box, in staff spaces: the box is
  // about two spaces wide, so a notehead and its stem sit inside it.
  const CURSOR_BOX_SPACES = 1;

  /**
   * The engine's cursor config, drawn rather than re-decoded from a glyph.
   * `bar` is the engine's own marker; `box` is the rounded box the Drum
   * reference picture uses to ring the note being played.
   */
  const drawCursor = (ctx, state, x, top, height, pxPerSpace) => {
    const alpha = state.cursor.opacity ?? 0.85;
    const thickness = Math.max(1.5, state.cursor.thickness * pxPerSpace);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = state.cursor.color;
    if (state.cursorShape === 'box') {
      const half = CURSOR_BOX_SPACES * pxPerSpace;
      const radius = Math.max(2, half * 0.45);
      // A wash of the same red inside the outline, so the box reads as a
      // marker over dense ink instead of as a barline the score never wrote.
      ctx.globalAlpha = alpha * 0.12;
      roundedRectPath(ctx, x - half, top, half * 2, height, radius);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = state.cursor.color;
      ctx.lineWidth = thickness;
      roundedRectPath(ctx, x - half, top, half * 2, height, radius);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillRect(x - thickness / 2, top, thickness, height);
    ctx.restore();
  };

  // The Plan's §၁၃ reference picture carries a second, small logo in the
  // bottom-right corner, not only the one beside Title 1.
  const CORNER_LOGO_FRACTION = 0.045;

  /**
   * The corner mark, drawn over the composed frame rather than inside a
   * band, because the reference picture puts it on the frame's own corner.
   * Its outline comes from the palette so the mark keeps an edge on a
   * background that matches its own plate (§၁၄).
   */
  function drawCornerLogo(ctx, { width, height, palette, image }) {
    if (!image || !image.complete || image.naturalWidth <= 0) return false;
    const size = Math.round(Math.min(width, height) * CORNER_LOGO_FRACTION);
    const pad = Math.round(Math.min(width, height) * 0.022);
    const x = width - pad - size;
    const y = height - pad - size;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.save();
    ctx.drawImage(image, x + (size - drawWidth) / 2, y + (size - drawHeight) / 2, drawWidth, drawHeight);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = Math.max(1, Math.round(size * 0.03));
    roundedRectPath(ctx, x, y, size, size, Math.round(size * 0.22));
    ctx.stroke();
    ctx.restore();
    return true;
  }

  /**
   * Title / Info: logo on the left, Title 1 beside it, Title 2 under it,
   * and the metre, tempo, key and beat on the same row.
   */
  function drawTitlePart(ctx, rect, at, meta, palette, options) {
    const scale = Math.max(0.5, Math.min(1.15, rect.height / 150));
    ctx.save();
    ctx.translate(rect.x, rect.y);
    drawInfoBand(ctx, { at, meta, settings: titleSettings(options, palette), palette, scale, width: rect.width });
    ctx.restore();
  }

  /**
   * The text as far as it fits, with an ellipsis where it was cut. A title
   * the user typed is never silently replaced: it is drawn as written up to
   * the last letter that fits, so a long name still reads as that name.
   */
  function fitText(ctx, text, maxWidth) {
    const value = String(text ?? '');
    if (value === '' || maxWidth <= 0) return '';
    if (ctx.measureText(value).width <= maxWidth) return value;
    let low = 0;
    let high = value.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (ctx.measureText(`${value.slice(0, middle)}\u2026`).width <= maxWidth) low = middle;
      else high = middle - 1;
    }
    return low > 0 ? `${value.slice(0, low)}\u2026` : '';
  }

  /**
   * The Title / Info band's fields, with the ones a page did not supply
   * left at the house default. A page that has no Title controls (the
   * Guitar page) still gets a complete band rather than "undefined".
   */
  function titleSettings(options = {}, palette = null) {
    return {
      titleOne: '',
      // A page that names no colour takes the frame's own, so a White frame
      // never gets the dark theme's near-white title by default -- the
      // failure §၁၄ calls out by name.
      titleOneColor: palette?.titleOne ?? '#f8fafc',
      titleOneSize: 22,
      titleTwo: '',
      titleTwoColor: palette?.titleTwo ?? '#91a0b5',
      titleTwoSize: 11,
      brand: 'M Sharing',
      model: '',
      notation: '',
      countEnabled: false,
      countDisplay: 'beats',
      infoBoxes: false,
      logoImage: null,
      ...options,
    };
  }

  /**
   * A rounded rectangle path. `ctx.roundRect` is not in every browser this
   * page has to run in, so the corners are drawn by hand.
   */
  function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * The three rounded boxes the Drum reference picture puts on the right of
   * the Title band: TIME, BPM and COUNT, label above value.
   *
   * COUNT is the one box that changes during the video -- it carries the
   * token the frame is sitting on, in the same `1` / `1&` / `1e&a` spelling
   * the count row uses. The Plan keeps that separate from the Count Voice
   * sound, so only the printed value is read here.
   */
  function drawInfoBoxes(ctx, { at, meta, settings, palette, scale, width, top }) {
    const tokens = countTokens(settings.countDisplay, meta.beats);
    const active = currentCountToken(tokens, settings.countDisplay, meta, at);
    const count = active >= 0 && active < tokens.length ? tokens[active] : '';
    const boxes = [
      { label: 'TIME', value: `${meta.beats}/${meta.beatType}`, highlight: false },
      { label: 'BPM', value: String(meta.bpm), highlight: false },
      { label: 'COUNT', value: count, highlight: true },
    ];

    const pad = Math.round(24 * scale);
    const boxWidth = Math.max(44, Math.min(Math.round(width * 0.085), Math.round(132 * scale)));
    const boxHeight = Math.max(30, Math.round(66 * scale));
    const gap = Math.max(6, Math.round(12 * scale));
    const radius = Math.round(Math.min(boxWidth, boxHeight) * 0.22);
    let x = width - pad - boxWidth * boxes.length - gap * (boxes.length - 1);

    for (const box of boxes) {
      ctx.save();
      roundedRectPath(ctx, x, top, boxWidth, boxHeight, radius);
      if (box.highlight) {
        ctx.fillStyle = palette.highlight;
        ctx.fill();
      }
      ctx.strokeStyle = box.highlight ? palette.highlight : palette.line;
      ctx.lineWidth = Math.max(1, Math.round(1.6 * scale));
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = box.highlight ? palette.highlightText : palette.muted;
      ctx.font = `600 ${Math.max(7, Math.round(9 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(fitText(ctx, box.label, boxWidth - Math.round(8 * scale)),
        x + boxWidth / 2, top + Math.round(boxHeight * 0.36));
      ctx.fillStyle = box.highlight ? palette.highlightText : palette.text;
      ctx.font = `800 ${Math.max(11, Math.round(20 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(fitText(ctx, box.value, boxWidth - Math.round(8 * scale)),
        x + boxWidth / 2, top + Math.round(boxHeight * 0.78));
      ctx.restore();
      x += boxWidth + gap;
    }
  }

  function drawInfoBand(ctx, { at, meta, settings, palette, scale, width }) {
    const pad = Math.round(24 * scale);
    const top = Math.round(10 * scale);
    const leftEdge = pad;
    const logoSize = Math.round(56 * scale);
    let textX = leftEdge;

    if (settings.logoImage?.complete && settings.logoImage.naturalWidth > 0) {
      const ratio = settings.logoImage.naturalWidth / settings.logoImage.naturalHeight;
      const logoWidth = Math.min(Math.round(logoSize * 1.9), Math.round(logoSize * ratio));
      ctx.drawImage(settings.logoImage, leftEdge, top + Math.round(4 * scale), logoWidth, logoSize);
      textX = leftEdge + logoWidth + Math.round(18 * scale);
    }

    // The right edge every line in the band has to stop before. A page that
    // does not say how wide it is leaves the band unconstrained, which is
    // what the tests that predate this did.
    const rightEdge = Number.isFinite(width) ? width - pad : Infinity;

    // The reference picture puts the three rounded boxes where the stats row
    // used to be, so the Title lines have to stop before them rather than
    // run underneath. The boxes are measured the same way here and in the
    // draw call, from the band's own width and scale.
    const boxesWidth = settings.infoBoxes
      ? Math.max(44, Math.min(Math.round(width * 0.085), Math.round(132 * scale))) * 3
        + Math.max(6, Math.round(12 * scale)) * 2 + pad
      : 0;
    const room = rightEdge - textX - boxesWidth;

    ctx.fillStyle = settings.titleOneColor;
    ctx.font = `700 ${Math.round(settings.titleOneSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(fitText(ctx, settings.titleOne, room), textX, top + Math.round(28 * scale));
    ctx.fillStyle = settings.titleTwoColor;
    ctx.font = `${Math.round(settings.titleTwoSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, settings.titleTwo, room), textX + Math.round(2 * scale), top + Math.round(52 * scale));

    if (settings.infoBoxes) {
      // The COUNT box is the count display. A row underneath it would
      // print the same count a second time, which is what the owner saw.
      drawInfoBoxes(ctx, { at, meta, settings, palette, scale, width, top: top + Math.round(6 * scale) });
      return;
    }

    const statsY = top + Math.round(78 * scale);
    const statSize = Math.max(10, Math.round(13 * scale));
    const gap = Math.round(26 * scale);
    const metronome = `${meta.beats}/${meta.beatType}`;
    const items = [metronome, `${meta.bpm} BPM`];
    if (meta.key) items.push(`Key ${meta.key}`);

    ctx.font = `600 ${statSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = palette.accent;
    let cursorX = leftEdge;
    for (const item of items) {
      const fitted = fitText(ctx, item, rightEdge - cursorX);
      if (fitted === '') break;
      ctx.fillText(fitted, cursorX, statsY);
      cursorX += ctx.measureText(fitted).width + gap;
    }

    drawMetronomeIcon(ctx, cursorX + Math.round(6 * scale), statsY - Math.round(statSize * 0.35), Math.round(statSize * 1.15), at, meta.bpm, palette.muted);

    ctx.fillStyle = palette.muted;
    ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
    const footer = [settings.brand, settings.model, settings.notation]
      .filter((part) => part && String(part).trim() !== '')
      .map((part) => String(part).toUpperCase());
    if (footer.length > 0) {
      ctx.fillText(fitText(ctx, footer.join(' \u00b7 '), rightEdge - leftEdge), leftEdge, statsY + Math.round(20 * scale));
    }
  }

  /**
   * The count as the video prints it: `1, 2, 3, 4` or its eighth/sixteenth
   * subdivision. The Plan keeps this display separate from the Count Voice
   * SOUND, so this only ever changes what is written on the frame. The
   * printed count has a single home, the COUNT box; the count-in itself is
   * heard, never printed.
   */
  const countTokens = (display, beats) => {
    const subdivisions = display === 'sixteenths' ? ['e', '&', 'a'] : display === 'eighths' ? ['&'] : [];
    const tokens = [];
    for (let beat = 1; beat <= beats; beat += 1) {
      tokens.push(String(beat));
      for (const subdivision of subdivisions) tokens.push(subdivision);
    }
    return tokens;
  };

  /** The token the frame is currently sitting on, or -1 when counting is off. */
  const currentCountToken = (tokens, display, meta, at) => {
    const perBeat = display === 'sixteenths' ? 4 : display === 'eighths' ? 2 : 1;
    const beatSeconds = (60 / Math.max(1, meta.bpm)) * (4 / Math.max(1, meta.beatType));
    const position = at / beatSeconds;
    const beatIndex = Math.floor(position) % Math.max(1, meta.beats);
    const within = position - Math.floor(position);
    return beatIndex * perBeat + Math.min(perBeat - 1, Math.floor(within * perBeat));
  };

  const LAYOUT_TEMPLATES = {
    // The Drum reference picture (Main Plan §၁၃) measures the three bands at
    // about 20 / 33 / 47 per cent, so a drum frame declares its own shares
    // rather than taking the row default. The kit is the subject of the
    // video and gets the largest band; the title band has to hold the logo,
    // two title lines and the three info boxes.
    drums: {
      shape: 'rows',
      order: ['title', 'notation', 'instrument'],
      shares: {
        '16:9': { title: 0.2, notation: 0.33, instrument: 0.47 },
        '1:1': { title: 0.18, notation: 0.36, instrument: 0.46 },
        '9:16': { title: 0.14, notation: 0.38, instrument: 0.48 },
      },
    },
    piano: { shape: 'rows', order: ['title', 'notation', 'instrument'] },
    guitar: { shape: 'rows', order: ['instrument', 'notation', 'title'] },
    // A bass is a fretted neck, so it stacks the way the guitar does:
    // the neck the notes are played on, then the sheet, then the title.
    bass: { shape: 'rows', order: ['instrument', 'notation', 'title'] },
    // Notation beside the instrument, with the Title / Info band across
    // the foot of the frame. Portrait stacks instead of splitting: two
    // columns there would leave neither part any width.
    violin: { shape: 'split', order: ['notation', 'instrument', 'title'], columns: [0.6, 0.4] },
    // A voice has no notation and no instrument to mark: the recording's own
    // waveform is the whole body of the frame, under the Title / Info band.
    voice: { shape: 'rows', order: ['title', 'instrument'] },
  };

  const LAYOUT_SHARES = {
    rows: {
      '16:9': { title: 0.12, notation: 0.46, instrument: 0.42 },
      '1:1': { title: 0.12, notation: 0.44, instrument: 0.44 },
      '9:16': { title: 0.08, notation: 0.42, instrument: 0.5 },
    },
    split: {
      '16:9': { title: 0.12, notation: 0.55, instrument: 0.33 },
      '1:1': { title: 0.12, notation: 0.52, instrument: 0.36 },
      '9:16': { title: 0.08, notation: 0.42, instrument: 0.5 },
    },
  };

  const LAYOUT_GUTTER = 0.02;

  /**
   * The one place a delivery picture size is written.
   *
   * The Plan gives every video -- Metronome included -- the same three
   * sizes, so a page asks for a ratio and takes the pixels from here
   * instead of carrying its own table. Two tables drift: one studio
   * ships 720p while the rest ship 1080p, and nothing notices until the
   * exports are compared.
   */
  const DELIVERY_SIZES = {
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
  };

  /**
   * Picture size for a ratio name. Pages spell the name either `16:9` or
   * `16x9`; both reach the same entry, so a page never has to agree with
   * this engine about a separator.
   */
  function sizeFor(ratio) {
    const name = String(ratio ?? '').replace('x', ':');
    const size = DELIVERY_SIZES[name];
    if (!size) throw new RangeError(`"${ratio}" is not a supported video ratio`);
    return { ...size };
  }

  /** Every ratio this engine delivers, in the order the Plan lists them. */
  const ratioNames = () => Object.keys(DELIVERY_SIZES);

  /** The ratio name a frame's own dimensions are closest to. */
  function ratioOf(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new TypeError('Layout width and height must be positive numbers');
    }
    const ratio = width / height;
    const candidates = [
      ['16:9', 16 / 9],
      ['1:1', 1],
      ['9:16', 9 / 16],
    ];
    let best = candidates[0];
    for (const candidate of candidates) {
      if (Math.abs(candidate[1] - ratio) < Math.abs(best[1] - ratio)) best = candidate;
    }
    return best[0];
  }

  /**
   * Rectangles for one instrument's frame. `options.parts` narrows the
   * layout to the parts a caller can actually draw; the rest renormalise.
   */
  /**
   * A page may pin a part to an absolute share of the frame -- the Guitar
   * page does, because its instrument is a photograph whose height at the
   * band's width is already known, and a band taller than that would only
   * leave the picture floating in empty background. A pinned share is
   * taken as given and the parts left over divide what remains in the
   * proportions the template declares, so the template still decides the
   * shape of everything the page did not pin.
   */
  function resolveShares(declared, overrides) {
    const pinned = {};
    let pinnedTotal = 0;
    for (const [name, share] of Object.entries(overrides)) {
      if (!Number.isFinite(share) || share <= 0) continue;
      pinned[name] = share;
      pinnedTotal += share;
    }
    const free = Object.keys(declared).filter((name) => !(name in pinned));
    const freeTotal = free.reduce((sum, name) => sum + declared[name], 0) || 1;
    const remaining = Math.max(0, 1 - pinnedTotal);
    const shares = { ...declared };
    for (const name of free) shares[name] = (declared[name] / freeTotal) * remaining;
    return { ...shares, ...pinned };
  }

  function layoutFor(instrument, options = {}) {
    const { width, height } = options;
    const template = LAYOUT_TEMPLATES[instrument];
    if (!template) throw new RangeError(`No video layout is declared for "${instrument}"`);
    const ratio = ratioOf(width, height);
    const declared = template.shares?.[ratio] ?? LAYOUT_SHARES[template.shape][ratio];
    const shares = options.shares ? resolveShares(declared, options.shares) : declared;
    const requested = Array.isArray(options.parts) && options.parts.length > 0 ? options.parts : template.order;
    const parts = template.order.filter((part) => requested.includes(part));
    if (parts.length === 0) throw new RangeError('A layout needs at least one part to place');
    const pad = Math.round(Math.min(width, height) * LAYOUT_GUTTER);

    if (template.shape === 'split' && ratio !== '9:16') {
      const [leftShare, rightShare] = template.columns;
      const bandHeight = Math.round(height * shares.title);
      const bodyBottom = height - bandHeight - pad * 2;
      const columnWidth = Math.round((width - pad * 3) * (leftShare / (leftShare + rightShare)));
      const rightWidth = width - pad * 3 - columnWidth;
      const rects = {};
      if (parts.includes('notation')) rects.notation = { x: pad, y: pad, width: columnWidth, height: bodyBottom };
      if (parts.includes('instrument')) {
        rects.instrument = { x: pad * 2 + columnWidth, y: pad, width: rightWidth, height: bodyBottom };
      }
      if (parts.includes('title')) {
        rects.title = { x: pad, y: height - bandHeight - pad, width: width - pad * 2, height: bandHeight };
      }
      return { ratio, shape: template.shape, parts, pad, rects };
    }

    const total = parts.reduce((sum, part) => sum + shares[part], 0) || 1;
    const rects = {};
    let y = pad;
    for (const part of parts) {
      const partHeight = Math.round((height - pad * 2) * (shares[part] / total));
      rects[part] = { x: pad, y, width: width - pad * 2, height: partHeight };
      y += partHeight;
    }
    return { ratio, shape: template.shape, parts, pad, rects };
  }

  /**
   * Draws one frame's three parts. The engine owns WHERE each part goes;
   * each part owns HOW it draws, and receives its own rectangle. A part
   * the caller does not pass is simply not drawn, so a page can ship one
   * part at a time without the engine knowing which instrument it is.
   */
  async function composeFrame(ctx, options) {
    const { instrument, width, height, parts } = options;
    if (!parts || typeof parts !== 'object') throw new TypeError('composeFrame needs a parts map');
    const layout = layoutFor(instrument, {
      width,
      height,
      shares: options.shares,
      parts: Object.keys(parts).filter((name) => typeof parts[name] === 'function'),
    });
    for (const name of layout.parts) {
      const rect = layout.rects[name];
      const draw = parts[name];
      if (!rect || typeof draw !== 'function') continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      await draw(ctx, rect, layout);
      ctx.restore();
    }
    return layout;
  }

  // The encoder owns the final asset contract. Pages may fetch photos or the
  // R2 Thank You clip through helper modules, but only this engine decides
  // whether an export is allowed to start.
  const requiredAssets = new Map();

  function requireAsset(label) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new TypeError('An asset label is required');
    }
    requiredAssets.set(label, { status: 'pending' });
    return label;
  }

  function resolveRequired(label, details = {}) {
    if (!requiredAssets.has(label)) requireAsset(label);
    requiredAssets.set(label, { status: 'ok', ...details });
  }

  function rejectRequired(label, error) {
    if (!requiredAssets.has(label)) requireAsset(label);
    requiredAssets.set(label, { status: 'error', error: error?.message || String(error) });
  }

  function assertAssetsReady() {
    const blocked = [...requiredAssets.entries()].filter(([, item]) => item.status !== 'ok');
    if (blocked.length === 0) return;
    const reason = blocked.map(([label, item]) => `${label}: ${item.error || 'not ready'}`).join('; ');
    throw new Error(`Video export blocked by required assets — ${reason}`);
  }

  // ---------------------------------------------------------------
  // The spoken count that counts the score in.
  //
  // The Plan hands the file names and the R2 path to the engine, the same
  // way it hands over the Thank You clip: a page asks for the recordings
  // it needs and never learns their address. R2 holds one recording per
  // beat number; a beat with no recording leaves the click alone rather
  // than failing the export.
  //
  // The bucket keeps two recordings of every beat, and they are different
  // sounds, not two names for one: `{n}.wav` speaks the number while
  // `M{n}.wav` is the metronome's own short marker. The owner chooses which
  // one the count uses, so the choice is a parameter here rather than a
  // fixed name -- a video counting a band in wants the voice, a video
  // showing tempo wants the marker.
  //
  // The recordings also live under two folder names. `Counts  vocal` is the
  // folder the owner keeps them in (the name carries two spaces); `Voices`
  // is the older copy, byte for byte the same files. Both are tried, in
  // that order, so renaming either one does not silence the count.
  // ---------------------------------------------------------------
  const COUNT_VOICE_ROOT = 'https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev';
  // Every folder the recordings are known by, newest name first.
  const COUNT_VOICE_FOLDERS = ['Counts%20%20vocal', 'Voices'];
  // The two sets of files the bucket holds. `spoken` is the number said
  // aloud, `marker` is the metronome's short tick.
  const COUNT_VOICE_SETS = {
    spoken: (beat) => `${beat}.wav`,
    marker: (beat) => `M${beat}.wav`,
  };
  const countVoiceCache = new Map();

  /**
   * Every R2 address that may hold the recording for a beat number.
   *
   * The chosen set is asked for first. The other set follows it, so a beat
   * whose chosen recording is not uploaded still counts in the owner's
   * other voice rather than falling silent; the order is what makes the
   * choice audible rather than merely nominal.
   */
  function countVoiceUrls(beat, setName = 'spoken') {
    const number = Math.round(beat);
    if (!(number >= 1)) return [];
    const chosenName = COUNT_VOICE_SETS[setName] ? setName : 'spoken';
    const names = [chosenName, ...Object.keys(COUNT_VOICE_SETS).filter((name) => name !== chosenName)];
    const urls = [];
    for (const name of names) {
      for (const folder of COUNT_VOICE_FOLDERS) {
        urls.push(`${COUNT_VOICE_ROOT}/${folder}/${COUNT_VOICE_SETS[name](number)}`);
      }
    }
    return urls;
  }

  /** One beat's recording, decoded once. A missing one resolves to null. */
  async function loadCountVoice(beat, setName = 'spoken') {
    const urls = countVoiceUrls(beat, setName);
    if (urls.length === 0) return null;
    const key = urls[0];
    if (countVoiceCache.has(key)) return countVoiceCache.get(key);
    const pending = (async () => {
      for (const url of urls) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) continue;
          const bytes = await response.arrayBuffer();
          const context = new OfflineAudioContext(1, 1, AUDIO_SAMPLE_RATE);
          return await context.decodeAudioData(bytes);
        } catch (error) {
          // Try the next name rather than giving up on the beat.
        }
      }
      return null;
    })();
    countVoiceCache.set(key, pending);
    const sample = await pending;
    // A miss is not remembered: the next export may find the file uploaded.
    if (!sample) countVoiceCache.delete(key);
    return sample;
  }

  /** One recording per beat, in beat order; a beat with none is null. */
  async function countVoiceSamples(beats, setName = 'spoken') {
    const wanted = [];
    for (let beat = 1; beat <= Math.max(0, Math.round(beats)); beat += 1) {
      wanted.push(loadCountVoice(beat, setName));
    }
    return await Promise.all(wanted);
  }

  // ---------------------------------------------------------------
  // The Thank You clip that closes every video.
  //
  // The Plan gives this whole matter to the engine: the file names, the
  // R2 path and what happens when a clip is missing are decided here and
  // nowhere else. The bucket holds one clip per ratio, instrument and
  // Video Color, at
  // `Thank Video/{ratio}/{instrument}/{ratio} {Colour} {Instrument}.mp4`.
  //
  // Not every combination is uploaded yet (1:1 Black Guitar, 9:16 White
  // Guitar and others are absent), so the lookup walks a short list of
  // candidates before giving up: the exact clip, then the same instrument
  // in the other colour, then the drum set in either colour, which is
  // complete for all three ratios. A missing clip leaves the video without
  // an ending rather than failing the export.
  // ---------------------------------------------------------------
  const THANK_YOU_BASE = 'https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/Thank%20Video';
  const THANK_YOU_RATIOS = { '16:9': '16x9', '1:1': '1x1', '9:16': '9x16' };
  const THANK_YOU_COLOURS = ['Black', 'White'];
  // Drum first in the fallback order because it is the one set uploaded
  // for every ratio in both colours.
  const THANK_YOU_INSTRUMENTS = ['drum', 'guitar', 'violin', 'piano', 'bass', 'strings', 'voice', 'metronome'];

  const thankYouCache = new Map();

  const capitalise = (word) => word.charAt(0).toUpperCase() + word.slice(1);

  /** The R2 address of one exact clip. `ratioOf` snaps to the nearest of the
   *  three shapes, so every frame has an address. */
  function thankYouUrl(width, height, { instrument = 'drum', color = 'black' } = {}) {
    const ratio = THANK_YOU_RATIOS[ratioOf(width, height)];
    const name = THANK_YOU_INSTRUMENTS.includes(instrument) ? instrument : 'drum';
    const colour = THANK_YOU_COLOURS.includes(capitalise(color)) ? capitalise(color) : 'Black';
    return `${THANK_YOU_BASE}/${ratio}/${name}/${ratio}%20${colour}%20${capitalise(name)}.mp4`;
  }

  /**
   * The clips to try, best first: the exact one, the same instrument in
   * the other colour, then the complete drum set. Every entry is a real
   * address, so the caller can stop at the first that answers.
   */
  function thankYouCandidates(width, height, { instrument = 'drum', color = 'black' } = {}) {
    const exact = thankYouUrl(width, height, { instrument, color });
    const ratio = THANK_YOU_RATIOS[ratioOf(width, height)];
    const name = THANK_YOU_INSTRUMENTS.includes(instrument) ? instrument : 'drum';
    const colour = THANK_YOU_COLOURS.includes(capitalise(color)) ? capitalise(color) : 'Black';
    const other = colour === 'Black' ? 'White' : 'Black';
    const clip = (which, shade) => `${THANK_YOU_BASE}/${ratio}/${which}/${ratio}%20${shade}%20${capitalise(which)}.mp4`;
    const candidates = [exact];
    const sameOtherColour = clip(name, other);
    if (!candidates.includes(sameOtherColour)) candidates.push(sameOtherColour);
    for (const shade of [colour, other]) {
      const fallback = clip('drum', shade);
      if (!candidates.includes(fallback)) candidates.push(fallback);
    }
    return candidates;
  }

  /**
   * The clip as a playable source plus its sound. Fetched once per
   * candidate list and kept: a clip is read for every frame of its
   * segment, and asking R2 each time would put a download behind every
   * frame. `clip.url` names the address that answered, which may be a
   * fallback rather than the one asked for.
   */
  async function loadThankYou(width, height, options = {}) {
    const candidates = thankYouCandidates(width, height, options);
    const key = candidates.join('|');
    if (thankYouCache.has(key)) return thankYouCache.get(key);
    const pending = (async () => {
      for (const url of candidates) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) continue;
          const blob = await response.blob();
          // A blob URL is what makes seeking honest: an element reading
          // from a plain URL reports a zero-length seekable range and stays
          // on its first frame however far it is asked to go.
          const objectUrl = URL.createObjectURL(blob);
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'auto';
          video.playsInline = true;
          video.muted = true;
          video.src = objectUrl;
          await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = () => reject(new Error(`Thank You clip could not be played: ${video.error?.code ?? 'unknown'}`));
            video.load();
          });
          let audio = null;
          try {
            const context = new OfflineAudioContext(1, 1, AUDIO_SAMPLE_RATE);
            audio = await context.decodeAudioData(await blob.arrayBuffer());
          } catch (error) {
            audio = null;
          }
          return { video, audio, objectUrl, seconds: video.duration, url, cacheKey: key };
        } catch (error) {
          // Try the next candidate rather than ending the video here.
        }
      }
      return null;
    })();
    thankYouCache.set(key, pending);
    const clip = await pending;
    // A missing clip must not be remembered: the next export may find it
    // uploaded, and a cached "no" would end every video after that one
    // short.
    if (!clip) thankYouCache.delete(key);
    return clip;
  }

  /**
   * Seeks a clip to `at` and resolves once that frame can be drawn.
   *
   * `seeked` says the element has moved, not that the decoder has produced
   * the frame: drawing straight away paints the old picture, which for a
   * fresh element is black. Waiting for the painted frame is what makes the
   * clip's first frames the clip rather than a black rectangle.
   *
   * `requestVideoFrameCallback` is asked for *before* the seek, because it
   * answers the next frame the element presents and a seek on a paused
   * element is the only thing that presents one. Asked for after `seeked`
   * it never arrives, so every frame of the clip used to sit out the 250 ms
   * bound below -- that wait, once per frame of the clip, is where the
   * export spent most of its time.
   */
  const seekThankYou = (video, at) => new Promise((resolve, reject) => {
    let settled = false;
    let seeked = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Thank You clip did not reach the requested frame'));
    }, 8000);
    // Bounded: a paused element does not always present a frame after a
    // seek, and an export that waits forever is worse than one frame of
    // the clip drawn a moment early.
    const bound = () => setTimeout(finish, 250);
    const canWaitForFrame = typeof video.requestVideoFrameCallback === 'function';
    // A callback registered ahead of the seek can be answered by the frame
    // still on screen, so a frame only counts once the element has said it
    // moved; until then the request is renewed for the next one.
    const awaitFrame = () => video.requestVideoFrameCallback(() => {
      if (settled) return;
      if (!seeked) {
        awaitFrame();
        return;
      }
      clearTimeout(timer);
      finish();
    });
    const done = () => {
      video.removeEventListener('seeked', done);
      seeked = true;
      clearTimeout(timer);
      // Without rVFC there is nothing to register ahead of the seek, so the
      // frame has to be waited for here, after the element has moved.
      if (!canWaitForFrame) requestAnimationFrame(() => finish());
      bound();
    };
    if (Math.abs(video.currentTime - at) < 1e-3 && video.readyState >= 2) {
      seeked = true;
      clearTimeout(timer);
      if (canWaitForFrame) awaitFrame();
      else requestAnimationFrame(() => finish());
      bound();
      return;
    }
    video.addEventListener('seeked', done);
    if (canWaitForFrame) awaitFrame();
    video.currentTime = at;
  });

  /**
   * The segment a page appends after its own: the clip fitted to the
   * frame, letterboxed rather than cropped so nothing of it is lost.
   * `null` when the clip is unavailable, so a page can skip it.
   */
  async function thankYouSegment(width, height, options = {}) {
    const clip = await loadThankYou(width, height, options);
    if (!clip || !Number.isFinite(clip.seconds) || clip.seconds <= 0) return null;
    return {
      seconds: clip.seconds,
      audio: clip.audio,
      draw: async (ctx, at) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        await seekThankYou(clip.video, Math.min(at, Math.max(0, clip.seconds - 0.05)));
        const scale = Math.min(width / clip.video.videoWidth, height / clip.video.videoHeight);
        const drawWidth = clip.video.videoWidth * scale;
        const drawHeight = clip.video.videoHeight * scale;
        ctx.drawImage(clip.video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      },
      onEnd: () => {
        URL.revokeObjectURL(clip.objectUrl);
        thankYouCache.delete(clip.cacheKey);
      },
    };
  }

  /**
   * The frame clock a render runs on, as data.
   *
   * A render walks its segments by cumulative frame rounding, so a segment
   * begins where the previous one's last frame ended -- not at the time its
   * own `seconds` would round to. A preview that added the seconds up for
   * itself would land a frame away from the file it is previewing, and on a
   * long video the gap would be visible. Both paths read this plan instead.
   */
  function timelinePlan(segments, fps) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new TypeError('A timeline needs at least one segment');
    }
    if (!Number.isFinite(fps) || fps <= 0) {
      throw new RangeError('A timeline needs a positive frame rate');
    }
    const plan = [];
    let startFrame = 0;
    for (const segment of segments) {
      if (!segment || !Number.isFinite(segment.seconds) || segment.seconds < 0) {
        throw new TypeError('Every timeline segment needs a duration');
      }
      if (typeof segment.draw !== 'function') {
        throw new TypeError('Every timeline segment needs a draw function');
      }
      const endFrame = Math.round((startFrame / fps + segment.seconds) * fps);
      const frames = Math.max(0, endFrame - startFrame);
      plan.push({ segment, startFrame, frames, startSeconds: startFrame / fps });
      startFrame = endFrame;
    }
    return { fps, segments: plan, frames: startFrame, seconds: startFrame / fps };
  }

  /** The segment, and that segment's own frame time, a global time lands on. */
  function frameAt(plan, seconds) {
    const lastFrame = Math.max(0, plan.frames - 1);
    const frame = Math.min(Math.max(0, Math.floor((Number(seconds) || 0) * plan.fps)), lastFrame);
    let entry = plan.segments[plan.segments.length - 1];
    for (const candidate of plan.segments) {
      if (frame < candidate.startFrame + candidate.frames) {
        entry = candidate;
        break;
      }
    }
    const index = Math.max(0, frame - entry.startFrame);
    return { segment: entry.segment, index, at: index / plan.fps, frame, startSeconds: entry.startSeconds };
  }

  /**
   * Draws the frame a preview is asking for. The encoder draws through the
   * same call, so a preview cannot show a frame the export would not.
   */
  async function drawFrameAt(ctx, plan, seconds) {
    const placed = frameAt(plan, seconds);
    await placed.segment.draw(ctx, placed.at, placed.index);
    return placed;
  }

  /** The timeline's sound as one buffer, or null when no segment has any. */
  async function timelineAudio(plan) {
    return await joinAudio(plan.segments.map((entry) => entry.segment), plan.seconds);
  }

  function validateRenderOptions(options) {
    if (!options || !Number.isFinite(options.width) || options.width <= 0 ||
        !Number.isFinite(options.height) || options.height <= 0) {
      throw new TypeError('Video render width and height must be positive numbers');
    }
    if (!Number.isFinite(options.fps) || options.fps <= 0 || options.fps > 120) {
      throw new RangeError('Video render fps must be between 0 and 120');
    }
    if (!Array.isArray(options.segments) || options.segments.length === 0) {
      throw new TypeError('Video render requires at least one segment');
    }
    for (const [index, segment] of options.segments.entries()) {
      if (!segment || !Number.isFinite(segment.seconds) || segment.seconds < 0) {
        throw new TypeError(`Video segment ${index} has an invalid duration`);
      }
      if (typeof segment.draw !== 'function') {
        throw new TypeError(`Video segment ${index} is missing a draw function`);
      }
      if (segment.audio && (!Number.isFinite(segment.audio.duration) || segment.audio.duration < 0)) {
        throw new TypeError(`Video segment ${index} has invalid audio`);
      }
    }
  }

  async function render(options) {
    validateRenderOptions(options);
    // Every instrument page shares this gate. Pages register mandatory R2
    // assets here; optional media such as the Thank You clip must not block
    // export when unavailable. Never write a video after a required-asset
    // failure was swallowed upstream.
    assertAssetsReady();
    const hasAudio = options.segments.some((segment) => segment.audio);
    if (hasWebCodecs(hasAudio)) {
      const result = await renderWithWebCodecs(options);
      if (result) return result;
    }
    return await recordInRealTime(options);
  }

  window.VideoEngine = {
    render,
    isRenderable: hasWebCodecs,
    // The shared parts: Title / Info and Notation, plus the notation
    // engine's own loading, so no page carries a second copy.
    paletteFor,
    titleSettings,
    keyName,
    scoreMeta,
    scoreTimeline,
    drawTitlePart,
    loadNotationEngine,
    readScoreText,
    prepareNotation,
    prepareNotationFor,
    drawNotationPart,
    // The count's own token rules, so a page that draws the count-in before
    // the score prints the same count the Title band does.
    countTokens,
    currentCountToken,
    // The Plan gives the Thank You clip to this engine: a page asks for a
    // segment and appends it, and never learns the clip's address.
    thankYouUrl,
    thankYouCandidates,
    thankYouSegment,
    // The spoken count, for the same reason: the recordings' address and
    // names stay in here, and a page asks for the beats it is counting in.
    countVoiceUrls,
    countVoiceSamples,
    // One clock for the encoder and the preview: the plan says where each
    // segment starts in frames, so a preview cannot drift from the file.
    timelinePlan,
    frameAt,
    drawFrameAt,
    timelineAudio,
    muxMp4,
    muxMp4ToStream,
    muxWebM,
    layoutFor,
    ratioOf,
    // One table of delivery sizes for every studio; a page asks for a
    // ratio name and gets the pixels the Plan specifies.
    sizeFor,
    ratioNames,
    DELIVERY_SIZES,
    composeFrame,
    drawCornerLogo,
    requireAsset,
    resolveRequired,
    rejectRequired,
    assertAssetsReady,
  };
})();
