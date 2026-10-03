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
 * An MP4: H.264 video, AAC-LC sound at 48kHz, at exactly the size the
 * page asked for. That is the file every phone, editor and upload page
 * takes without being asked twice, which a WebM is not.
 *
 * Nothing is converted to get there. The frames are encoded as H.264
 * in the first place and the file is written around them, so there is
 * no second pass to lose a generation of quality in -- and no renaming
 * either: `muxMp4` writes a real ISO BMFF, boxes and sample tables and
 * all, which is the only way a .mp4 is an MP4.
 *
 * The codecs and the container are ONE decision, made in `pickFormat`
 * before a frame is drawn, because an MP4 cannot hold VP8 and a WebM
 * cannot hold H.264. A browser that will not encode H.264 and AAC gets
 * the old VP8-and-Opus WebM instead, and the result says which it got.
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
        elem(ID.Video, [elem(ID.PixelWidth, uint(width)), elem(ID.PixelHeight, uint(height))]),
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
      dts: i * videoDelta,
      pts: Math.round((chunk.us * VIDEO_TIMESCALE) / 1e6),
      seconds: (i * videoDelta) / VIDEO_TIMESCALE,
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

    // An AAC frame is 1024 samples, but the encoder is believed over
    // the specification: the last frame's length is taken from the gap
    // before it, so a file still adds up if it ever differs.
    const audioDelta =
      audioSamples.length > 1
        ? audioSamples[audioSamples.length - 1].dts - audioSamples[audioSamples.length - 2].dts
        : 1024;

    const ordered = [...videoSamples, ...audioSamples].sort(
      (a, b) => a.seconds - b.seconds || a.track - b.track,
    );
    let mdatBytes = 0;
    for (const sample of ordered) {
      sample.offset = mdatBytes;
      mdatBytes += sample.data.length;
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
    const videoSpan = spanOf(videoSamples, videoDelta);
    const audioSpan = spanOf(audioSamples, audioDelta);
    const asMs = (ticks, timescale) => Math.round((ticks / timescale) * MOVIE_TIMESCALE);
    const videoMs = asMs(videoSpan, VIDEO_TIMESCALE);
    const audioMs = audio ? asMs(audioSpan, audio.sampleRate) : 0;
    const movieMs = Math.max(videoMs, audioMs);

    /** The sample tables for one track, in that track's decode order. */
    const sampleTable = (entry, samples, lastDelta, base) => {
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
        // One sample to a chunk. The offset table then names every
        // sample outright, which is what lets the two tracks be
        // interleaved sample by sample rather than in blocks.
        fullBox('stsc', 0, 0, [u32(1), u32(1), u32(1), u32(1)]),
        fullBox('stsz', 0, 0, [
          u32(0),
          u32(samples.length),
          ...samples.map((sample) => u32(sample.data.length)),
        ]),
        wide
          ? fullBox('co64', 0, 0, [
              u32(samples.length),
              ...samples.map((sample) => u64(base + sample.offset)),
            ])
          : fullBox('stco', 0, 0, [
              u32(samples.length),
              ...samples.map((sample) => u32(base + sample.offset)),
            ]),
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
    ]);

    const mp4a = !audio
      ? null
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
     */
    const trak = ({ id, handler, label, timescale, span, trackMs, samples, lastDelta, entry }, base) => {
      // An encoder that reports its own priming -- a first sample timed
      // before zero -- is saying to throw that much away before playing.
      // An edit list is how an MP4 says so, and is why the sound and the
      // picture still start together when it does.
      const first = samples.length > 0 ? samples[0].pts : 0;
      const edits =
        first === 0
          ? []
          : [
              box('edts', [
                fullBox(
                  'elst',
                  0,
                  0,
                  first < 0
                    ? [u32(1), u32(trackMs), i32(-first), u16(1), u16(0)]
                    : [
                        u32(2),
                        u32(asMs(first, timescale)), i32(-1), u16(1), u16(0),
                        u32(trackMs), i32(0), u16(1), u16(0),
                      ],
                ),
              ]),
            ];

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
            sampleTable(entry, samples, lastDelta, base),
          ]),
        ]),
      ]);
    };

    const tracks = [
      {
        id: 1, handler: 'vide', label: 'VideoHandler',
        timescale: VIDEO_TIMESCALE, span: videoSpan, trackMs: videoMs,
        samples: videoSamples, lastDelta: videoDelta, entry: avc1,
      },
    ];
    if (audio) {
      tracks.push({
        id: 2, handler: 'soun', label: 'SoundHandler',
        timescale: audio.sampleRate, span: audioSpan, trackMs: audioMs,
        samples: audioSamples, lastDelta: audioDelta, entry: mp4a,
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

  // ---------------------------------------------------------------
  // Encoding.
  // ---------------------------------------------------------------

  function hasWebCodecs() {
    return (
      typeof window.VideoEncoder === 'function' &&
      typeof window.VideoFrame === 'function' &&
      typeof window.AudioEncoder === 'function' &&
      typeof window.AudioData === 'function'
    );
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

  /** AAC-LC, the only audio an MP4 is guaranteed to be played with. */
  const AAC = 'mp4a.40.2';
  const AAC_BITRATE = 192000;
  const OPUS_BITRATE = 128000;

  /**
   * What this browser can actually produce -- codecs AND container, as
   * one decision.
   *
   * It has to be one decision: an MP4 cannot hold VP8 and a WebM cannot
   * hold H.264, so there is no choosing a codec and then asking what to
   * put it in. MP4 with H.264 and AAC is what every phone, editor and
   * upload page takes without being asked twice, so it is tried first,
   * and WebM is what a browser that will not encode it falls back to.
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

    if (await encodesAudio(AAC, AAC_BITRATE)) {
      for (const codec of avcCodecs(width, height, fps)) {
        if (await encodesVideo(codec)) {
          return { container: 'mp4', video: codec, audio: AAC, audioBitrate: AAC_BITRATE };
        }
      }
    }
    if (await encodesAudio('opus', OPUS_BITRATE)) {
      for (const codec of ['vp8', 'vp09.00.10.08']) {
        if (await encodesVideo(codec)) {
          return { container: 'webm', video: codec, audio: 'opus', audioBitrate: OPUS_BITRATE };
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
    const encoder = new window.AudioEncoder({
      output: (chunk, metadata) => {
        if (metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
          description = new Uint8Array(metadata.decoderConfig.description);
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ us: chunk.timestamp, data });
      },
      error: (err) => console.error('Audio encoder:', err),
    });
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
      const interleaved = new Float32Array(count * channels);
      for (let c = 0; c < channels; c++) {
        interleaved.set(planes[c].subarray(start, start + count), c * count);
      }
      const data = new window.AudioData({
        format: 'f32-planar',
        sampleRate: buffer.sampleRate,
        numberOfFrames: count,
        numberOfChannels: channels,
        timestamp: Math.round((start / buffer.sampleRate) * 1e6),
        data: interleaved,
      });
      encoder.encode(data);
      data.close();
      if (encoder.encodeQueueSize > 40) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    await encoder.flush();
    encoder.close();
    return {
      chunks,
      description:
        description ?? (format.audio === AAC ? aacConfigFor(buffer.sampleRate, channels) : undefined),
      sampleRate: buffer.sampleRate,
      channels,
      bitrate: format.audioBitrate,
    };
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

  /** 48kHz: what an MP4 is mastered at, and what every encoder here takes. */
  const AUDIO_SAMPLE_RATE = 48000;

  /** Joins the segments' audio into one buffer covering the whole video. */
  async function joinAudio(segments, totalSeconds) {
    const withAudio = segments.filter((s) => s.audio);
    if (withAudio.length === 0) return null;
    const sampleRate = AUDIO_SAMPLE_RATE;
    const channels = Math.max(1, Math.min(2, ...withAudio.map((s) => s.audio.numberOfChannels)));
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
    const audioChannels = segments.some((s) => s.audio)
      ? Math.max(1, Math.min(2, ...segments.filter((s) => s.audio).map((s) => s.audio.numberOfChannels)))
      : 0;
    const format = await pickFormat(width, height, fps, bitrate, audioChannels);
    if (!format) return null;
    const codec = format.video;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    const videoChunks = [];
    // The parameter sets -- the few bytes saying what shape the stream
    // is -- come alongside the first frame rather than inside it, and
    // an MP4 cannot be written without them.
    let videoDescription;
    const encoder = new window.VideoEncoder({
      output: (chunk, metadata) => {
        if (metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
          videoDescription = new Uint8Array(metadata.decoderConfig.description);
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        videoChunks.push({ us: chunk.timestamp, key: chunk.type === 'key', data });
      },
      error: (err) => console.error('Video encoder:', err),
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

    const totalSeconds = segments.reduce((sum, s) => sum + s.seconds, 0);
    const frameDuration = 1e6 / fps;
    const keyEvery = Math.max(1, Math.round(fps * 2));
    let frameIndex = 0;
    let stopped = false;

    for (const segment of segments) {
      if (stopped) break;
      if (segment.onStart) await segment.onStart();
      const count = Math.max(0, Math.round(segment.seconds * fps));
      for (let i = 0; i < count; i++) {
        if (shouldStop && shouldStop()) {
          stopped = true;
          break;
        }
        const at = i / fps;
        // Every segment is drawn as fast as the machine manages, and
        // nothing waits on a clock. A segment reading a <video> used
        // to be paced in real time and photographed as it played,
        // which meant the encoder's own backpressure could make it
        // copy one frame twice and miss the next. A source that has
        // to be waited for waits inside its own `draw` -- for the
        // frame it was actually asked for.
        await segment.draw(ctx, at, i);
        const frame = new window.VideoFrame(canvas, {
          timestamp: Math.round(frameIndex * frameDuration),
          duration: Math.round(frameDuration),
        });
        encoder.encode(frame, { keyFrame: frameIndex % keyEvery === 0 });
        frame.close();
        frameIndex += 1;
        // Encoding is asynchronous; letting its queue run away would
        // hold every frame in memory at once. Waiting here is exactly
        // the thing MediaRecorder could not do, and why this never
        // drops one.
        if (encoder.encodeQueueSize > 12) {
          while (encoder.encodeQueueSize > 6) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }
        if (onProgress && frameIndex % 10 === 0) {
          onProgress(frameIndex / Math.max(1, Math.round(totalSeconds * fps)), 'Rendering');
        }
      }
      if (segment.onEnd) await segment.onEnd();
    }

    await encoder.flush();
    encoder.close();

    if (onProgress) onProgress(1, 'Encoding the sound');
    let audio = null;
    const joined = await joinAudio(segments, totalSeconds);
    if (joined) audio = await encodeAudio(joined, format, shouldStop);

    if (onProgress) onProgress(1, 'Writing the file');
    // An MP4 cannot be written without the parameter sets the encoder
    // reports alongside its first frame. A browser that encoded H.264
    // and then did not describe it has given us something we cannot
    // put in a file, so say so rather than write a broken one.
    if (format.container === 'mp4' && !videoDescription) return null;
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
    };
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

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const totalSeconds = segments.reduce((sum, s) => sum + s.seconds, 0);
    const joined = await joinAudio(segments, totalSeconds);

    const stream = canvas.captureStream(fps);
    for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.bitrate ?? defaultBitrate(width, height, fps),
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.start(1000);

    if (joined) {
      const source = audioCtx.createBufferSource();
      source.buffer = joined;
      source.connect(dest);
      source.start();
    }

    let frameIndex = 0;
    const startedAt = performance.now();
    for (const segment of segments) {
      if (segment.onStart) await segment.onStart();
      const count = Math.max(0, Math.round(segment.seconds * fps));
      for (let i = 0; i < count; i++) {
        if (shouldStop && shouldStop()) break;
        const due = startedAt + (frameIndex / fps) * 1000;
        const wait = due - performance.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        await segment.draw(ctx, i / fps, i);
        frameIndex += 1;
        if (onProgress && frameIndex % 10 === 0) {
          onProgress(frameIndex / Math.max(1, Math.round(totalSeconds * fps)), 'Recording');
        }
      }
      if (segment.onEnd) await segment.onEnd();
    }
    recorder.stop();
    await done;
    for (const track of stream.getTracks()) track.stop();
    await audioCtx.close();
    const container = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    return {
      blob: new Blob(chunks, { type: mimeType }),
      extension: container,
      container,
      frames: frameIndex,
      fps,
      seconds: frameIndex / fps,
      path: 'mediarecorder',
      cancelled: false,
    };
  }

  async function render(options) {
    if (hasWebCodecs()) {
      const result = await renderWithWebCodecs(options);
      if (result) return result;
    }
    return await recordInRealTime(options);
  }

  window.VideoEngine = { render, isRenderable: hasWebCodecs, muxMp4, muxWebM };
})();
