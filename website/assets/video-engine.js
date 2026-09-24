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
 * WHAT A PAGE HANDS OVER
 *
 *   VideoEngine.render({
 *     width, height, fps,
 *     segments: [ { seconds, draw, audio, realtime } ],
 *     onProgress, shouldStop,
 *   })  ->  { blob, extension, frames, fps, seconds, path }
 *
 * A SEGMENT is a stretch of the finished video. `draw(ctx, at, index)`
 * paints one frame of it, `at` measured from that segment's own start,
 * and may be async. `audio` is an AudioBuffer for the same stretch, or
 * null for silence. `realtime: true` says the segment cannot be drawn
 * faster than it plays -- a <video> element being read frame by frame
 * is the case that needs it -- and the engine paces those draws to the
 * wall clock while still stamping them exactly.
 *
 * Segments are what let the body of a video and the Thank You clip at
 * the end of it be one file without either page knowing how a WebM is
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
      blocks.push({ track: 1, ms: chunk.ms, key: chunk.key, data: chunk.data, order: 0 });
    }
    if (audio) {
      for (const chunk of audio.chunks) {
        blocks.push({ track: 2, ms: chunk.ms, key: true, data: chunk.data, order: 1 });
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

  /** The best video codec this browser will actually encode. */
  async function pickVideoCodec(width, height, fps, bitrate) {
    for (const codec of ['vp8', 'vp09.00.10.08']) {
      try {
        const support = await window.VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate,
          framerate: fps,
        });
        if (support && support.supported) return codec;
      } catch (err) {
        /* try the next */
      }
    }
    return null;
  }

  /**
   * Opus, from one AudioBuffer covering the whole video.
   *
   * Handed over in 20ms slices because that is what Opus encodes in;
   * anything else and the encoder does the slicing itself, less well.
   */
  async function encodeAudio(buffer, shouldStop) {
    const chunks = [];
    let description;
    const encoder = new window.AudioEncoder({
      output: (chunk, metadata) => {
        if (metadata && metadata.decoderConfig && metadata.decoderConfig.description) {
          description = new Uint8Array(metadata.decoderConfig.description);
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ ms: Math.round(chunk.timestamp / 1000), data });
      },
      error: (err) => console.error('Audio encoder:', err),
    });
    const channels = Math.min(2, buffer.numberOfChannels);
    encoder.configure({
      codec: 'opus',
      sampleRate: buffer.sampleRate,
      numberOfChannels: channels,
      bitrate: 128000,
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
    return { chunks, description, sampleRate: buffer.sampleRate, channels };
  }

  /** Joins the segments' audio into one buffer covering the whole video. */
  async function joinAudio(segments, totalSeconds) {
    const withAudio = segments.filter((s) => s.audio);
    if (withAudio.length === 0) return null;
    const sampleRate = 48000;
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
    const bitrate = options.bitrate ?? 6_000_000;
    const codec = await pickVideoCodec(width, height, fps, bitrate);
    if (!codec) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    const videoChunks = [];
    const encoder = new window.VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        videoChunks.push({
          ms: Math.round(chunk.timestamp / 1000),
          key: chunk.type === 'key',
          data,
        });
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
      const startedAt = performance.now();
      for (let i = 0; i < count; i++) {
        if (shouldStop && shouldStop()) {
          stopped = true;
          break;
        }
        const at = i / fps;
        // A real-time segment is reading something that plays at its
        // own speed -- a <video> -- so its frames cannot be fetched
        // early. The TIMESTAMP is still exact; only the waiting is real.
        if (segment.realtime) {
          const due = startedAt + at * 1000;
          const wait = due - performance.now();
          if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        }
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
    if (joined) audio = await encodeAudio(joined, shouldStop);

    if (onProgress) onProgress(1, 'Writing the file');
    const blob = muxWebM({
      videoCodec: codec,
      width,
      height,
      videoChunks,
      audio,
      durationMs: (frameIndex / fps) * 1000,
    });
    return {
      blob,
      extension: 'webm',
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
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
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
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: options.bitrate ?? 6_000_000 });
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
    return {
      blob: new Blob(chunks, { type: mimeType }),
      extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm',
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

  window.VideoEngine = { render, isRenderable: hasWebCodecs, muxWebM };
})();
