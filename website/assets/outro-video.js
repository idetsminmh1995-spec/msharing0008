/**
 * outro-video.js — the Thank You clip that closes a generated video.
 *
 * The clip lives in R2 beside the count voices, under `Thank Video/`,
 * in one file per aspect, instrument and frame colour:
 *
 *   Thank Video/16x9/drum/16x9 Black Drum.mp4
 *   Thank Video/9x16/metronome/9x16 White Metronome.mp4
 *
 * Both video pages append it the same way, so the naming rule and the
 * two traps below live here rather than being written out twice.
 *
 * The traps:
 *
 * 1. The clip is fetched as a BLOB and played from an object URL, not
 *    pointed at with a cross-origin src. A <video> streaming from
 *    another origin taints the canvas it is drawn onto -- which stops
 *    the recording dead -- and wants Range requests the Worker does not
 *    answer. A blob is same-origin, seekable, and already downloaded
 *    when the take reaches it.
 * 2. `createMediaElementSource` may be called ONCE per element for the
 *    life of the page. The node is cached on the element, so a second
 *    take still has sound.
 */
(function () {
  const ROOT = 'Thank Video';

  /** "drum" -> "Drum": the file name capitalises what the folder does not. */
  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * The keys to try, best first.
   *
   * A bucket that has only some of the nine-odd combinations should
   * still close a video, so the list walks outward: this instrument in
   * this colour, then its other colour, then the drum clip of the same
   * shape, and finally the one clip known to exist. The caller takes
   * the first that answers.
   */
  function outroKeys(options) {
    const aspect = options.aspect || '16x9';
    const kind = options.kind || 'drum';
    const style = options.style === 'white' ? 'White' : 'Black';
    const other = style === 'White' ? 'Black' : 'White';
    const kindAliases = kind === 'paino' ? ['paino', 'piano'] : kind === 'piano' ? ['piano', 'paino'] : [kind];
    const wanted = [];
    for (const candidate of kindAliases) {
      wanted.push([aspect, candidate, style], [aspect, candidate, other]);
    }
    wanted.push(
      [aspect, 'drum', style],
      [aspect, 'drum', 'Black'],
      ['16x9', 'drum', 'Black'],
    );
    const keys = [];
    for (const [a, k, s] of wanted) {
      const key = `${ROOT}/${a}/${k}/${a} ${s} ${titleCase(k)}.mp4`;
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }

  function sharedUrl(apiBase, key) {
    return `${apiBase}/assets/shared/` + key.split('/').map(encodeURIComponent).join('/');
  }

  /** Successful clips are cached; failures are remembered for 30 seconds only. */
  const cache = new Map();
  const failureCache = new Map();
  const FAILURE_CACHE_MS = 30_000;
  const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 15_000;
  const DEFAULT_STALL_TIMEOUT_MS = 15_000;
  const DEFAULT_TOTAL_TIMEOUT_MS = 120_000;
  const DEFAULT_RETRIES = 2;
  const RETRY_DELAYS_MS = [500, 1500];
  let lastFailure = null;

  function releaseClip(clip) {
    if (!clip) return;
    try {
      clip.video.pause();
      clip.video.removeAttribute('src');
      clip.video.load();
    } catch (err) {
      /* a partially loaded element may not have anything to release */
    }
    if (clip.objectUrl) URL.revokeObjectURL(clip.objectUrl);
  }

  function waitForMetadata(video, timeoutMs, signal) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('R2 video did not decode'));
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('Outro load aborted'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for R2 video metadata'));
      }, timeoutMs);
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  }

  function abortError(message) {
    const error = new Error(message);
    error.code = 'OUTRO_TIMEOUT';
    return error;
  }

  function isRetryableStatus(status) {
    return status === 408 || status === 429 || status >= 500;
  }

  function failureKindForStatus(status) {
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not-found';
    if (status === 408 || status === 429) return status === 429 ? 'http-429' : 'timeout';
    if (status >= 500) return 'http-5xx';
    return 'unavailable';
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Outro load aborted'));
        return;
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('Outro load aborted'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  function readWithTimeout(reader, timeoutMs, signal, first) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => finishReject(abortError(first ? 'Outro first-byte timeout' : 'Outro stalled while downloading')), timeoutMs);
      const onAbort = () => finishReject(new Error('Outro load aborted'));
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      const finishResolve = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };
      const finishReject = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      reader.read().then(finishResolve, finishReject);
    });
  }

  async function readResponseBytes(response, signal, options, onProgress) {
    const total = Number(response.headers?.get?.('content-length')) || null;
    if (!response.body?.getReader) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      onProgress?.({ loaded: bytes.length, total, attempt: options.attempt, key: options.key });
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    let first = true;
    try {
      while (true) {
        let result;
        try {
          result = await readWithTimeout(reader, first ? options.firstByteTimeoutMs : options.stallTimeoutMs, signal, first);
        } catch (error) {
          try { await reader.cancel(); } catch (cancelError) { /* best effort */ }
          throw error;
        }
        if (result.done) break;
        if (result.value) {
          const chunk = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value);
          chunks.push(chunk);
          loaded += chunk.byteLength;
          first = false;
          onProgress?.({ loaded, total, attempt: options.attempt, key: options.key });
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (error) { /* best effort */ }
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  async function fetchCandidate(apiBase, key, options, onProgress) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), Math.max(1, options.deadline - Date.now()));
    try {
      const response = await fetch(sharedUrl(apiBase, key), {
        mode: 'cors',
        credentials: 'omit',
        cache: options.attempt > 0 ? 'reload' : 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(`Outro request returned HTTP ${response.status}`);
        error.status = response.status;
        error.kind = failureKindForStatus(response.status);
        throw error;
      }
      const bytes = await readResponseBytes(response, controller.signal, options, onProgress);
      if (bytes.length === 0) {
        const error = new Error('Outro response was empty');
        error.kind = 'unavailable';
        throw error;
      }
      return { response, bytes };
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) {
        const timeoutError = abortError('Outro download timeout');
        timeoutError.cause = error;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Downloads the first clip that exists and returns it ready to play.
   *
   * Resolves to null when the bucket has none of them -- an ending
   * nobody uploaded is not a failed video, and the caller says so and
   * writes the take without it.
   */
  async function loadOutro(apiBase, options = {}) {
    const keys = outroKeys(options);
    const cacheKey = keys.join('|');
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const failedAt = failureCache.get(cacheKey);
    if (failedAt && Date.now() - failedAt.at < FAILURE_CACHE_MS) {
      lastFailure = failedAt.info;
      return null;
    }
    failureCache.delete(cacheKey);
    const startedAt = Date.now();
    const totalTimeoutMs = options.totalTimeoutMs || DEFAULT_TOTAL_TIMEOUT_MS;
    const deadline = startedAt + totalTimeoutMs;
    const firstByteTimeoutMs = options.firstByteTimeoutMs || DEFAULT_FIRST_BYTE_TIMEOUT_MS;
    const stallTimeoutMs = options.stallTimeoutMs || DEFAULT_STALL_TIMEOUT_MS;
    const retries = Number.isInteger(options.retries) ? Math.max(0, options.retries) : DEFAULT_RETRIES;
    const retryDelay = options.retryDelayMs ?? RETRY_DELAYS_MS;
    let attempts = 0;
    let found = null;
    let failureKind = 'not-found';
    for (const key of keys) {
      for (let retry = 0; retry <= retries; retry += 1) {
        if (Date.now() >= deadline) {
          failureKind = 'timeout';
          lastFailure = { kind: failureKind, key, attempts, ms: Date.now() - startedAt };
          break;
        }
        attempts += 1;
        let video = null;
        let objectUrl = null;
        try {
          const { response, bytes } = await fetchCandidate(apiBase, key, {
            attempt: retry,
            deadline,
            firstByteTimeoutMs,
            stallTimeoutMs,
            signal: options.signal,
          }, options.onProgress);
          const blob = new Blob([bytes], { type: response.headers?.get?.('content-type') || 'video/mp4' });
          video = document.createElement('video');
          video.preload = 'auto';
          video.playsInline = true;
          objectUrl = URL.createObjectURL(blob);
          const metadataReady = waitForMetadata(video, options.metadataTimeoutMs || 15_000, options.signal);
          video.src = objectUrl;
          await metadataReady;
          if (!(video.videoWidth > 0)) {
            const error = new Error('R2 video has no decodable picture dimensions');
            error.kind = 'codec';
            throw error;
          }
          found = {
            source: 'r2',
            video,
            key,
            objectUrl,
            bytes: bytes.length,
            ms: Date.now() - startedAt,
            attempts,
            reason: null,
            seconds: Number.isFinite(video.duration) ? video.duration : 0,
            async audio(ctx) {
              try {
                return await ctx.decodeAudioData(bytes.slice().buffer);
              } catch (err) {
                console.error('The Thank You clip has no sound this browser can read:', err);
                return null;
              }
            },
          };
          break;
        } catch (err) {
          releaseClip({ video, objectUrl });
          const status = err?.status;
          const kind = err?.kind || (err?.code === 'OUTRO_TIMEOUT' ? 'timeout' : 'network');
          failureKind = kind;
          lastFailure = { kind, status, key, attempts, message: err?.message || String(err), ms: Date.now() - startedAt };
          if (options.signal?.aborted) throw err;
          if (status === 404 || status === 403 || kind === 'codec') break;
          if (!isRetryableStatus(status || 0) && !['timeout', 'network', 'unavailable'].includes(kind)) break;
          if (retry >= retries || Date.now() >= deadline) break;
          const baseDelay = Array.isArray(retryDelay) ? retryDelay[Math.min(retry, retryDelay.length - 1)] : retryDelay;
          const jitter = options.jitterMs === 0 ? 0 : Math.floor(Math.random() * (options.jitterMs ?? 100));
          await sleep(Math.min(baseDelay + jitter, Math.max(0, deadline - Date.now())), options.signal);
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) {
      lastFailure = null;
      failureCache.delete(cacheKey);
      for (const [oldKey, oldClip] of cache) {
        if (oldKey !== cacheKey) {
          releaseClip(oldClip);
          cache.delete(oldKey);
        }
      }
      cache.set(cacheKey, found);
    } else {
      const info = lastFailure || { kind: failureKind, key: keys[keys.length - 1] };
      failureCache.set(cacheKey, { at: Date.now(), info });
      lastFailure = { ...info, attempts, ms: Date.now() - startedAt };
    }
    return found;
  }

  /** The tap into the recording, made once per element. */
  function outroSource(ctx, video) {
    if (!video.__outroSource) {
      video.__outroSource = ctx.createMediaElementSource(video);
    }
    return video.__outroSource;
  }

  /** `object-fit: cover`, so a clip of the wrong shape fills rather than letterboxes. */
  function drawCover(ctx2d, canvas, source) {
    const w = source.videoWidth || source.naturalWidth || 0;
    const h = source.videoHeight || source.naturalHeight || 0;
    if (!(w > 0) || !(h > 0)) return false;
    // A <video> with no current data draws NOTHING, and a frame
    // blacked out first and not drawn on is a black frame in the
    // finished video. Rather than that, leave what is already on the
    // canvas: the take's last frame held for a moment reads as a
    // pause, where black reads as a fault.
    if (source.readyState !== undefined && source.readyState < 2) return false;
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    ctx2d.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    return true;
  }

  // -----------------------------------------------------------------
  // Reading the clip a FRAME AT A TIME.
  //
  // The clip used to be played and photographed: the renderer waited
  // out each frame's worth of wall-clock time and copied whatever the
  // <video> happened to be showing. Two things go wrong with that,
  // and both of them were being seen.
  //
  // It JUDDERS: the encoder's own backpressure can hold the loop past
  // the moment a frame was due, so the same picture is copied twice
  // and the next one is missed. Nothing in the video says which frame
  // was wanted, so nothing can put it right.
  //
  // And it can come out as SOUND ONLY: the audio is decoded from the
  // file and mixed exactly, but the picture depends on `play()`
  // succeeding and on the element having data at the instant it is
  // read. A clip whose audio track outlasts its video track plays
  // past its last frame the same way. Either leaves the ending heard
  // but not seen.
  //
  // So the clip is never played. Each frame is SEEKED to and drawn:
  // the element is asked for the frame at 0, 1/30, 2/30... and waited
  // for. It is exact, it cannot drift, and it does not care how busy
  // the encoder is.
  // -----------------------------------------------------------------

  /** A seek that cannot hang a render: after this, the last good frame stands. */
  const SEEK_TIMEOUT_MS = 2000;
  /** How long to wait for the seeked frame to actually be presented. */
  const PRESENT_TIMEOUT_MS = 80;
  /** The rate a caller that does not say is assumed to be rendering at. */
  const DEFAULT_FPS = 30;

  function seekTo(video, seconds) {
    if (video.readyState >= 2 && Math.abs(video.currentTime - seconds) < 1e-3) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener('seeked', finish);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, SEEK_TIMEOUT_MS);
      video.addEventListener('seeked', finish);
      try {
        video.currentTime = seconds;
      } catch (err) {
        finish();
      }
    });
  }

  /**
   * Waits for the frame to be on screen, not merely decoded.
   *
   * `seeked` says the data is there; `requestVideoFrameCallback` says
   * the picture has actually been put up, which is the one drawImage
   * will copy. Capped, because a browser without it -- or a frame
   * identical to the one already showing -- must not stall the render.
   */
  function presented(video) {
    if (typeof video.requestVideoFrameCallback !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, PRESENT_TIMEOUT_MS);
      video.requestVideoFrameCallback(finish);
    });
  }

  /**
   * The clip's frame at a moment, ready to draw.
   *
   * Held just inside the end: a clip whose audio runs a beat longer
   * than its pictures is asked for a frame it does not have, and the
   * honest answer is its last one rather than black.
   */
  async function frameAt(video, seconds) {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const last = duration > 0 ? Math.max(0, duration - 0.001) : seconds;
    await seekTo(video, Math.max(0, Math.min(seconds, last)));
    await presented(video);
  }

  /**
   * The clip as a segment of a render: its own length, its own sound,
   * and one seeked frame per frame of video.
   *
   * Built here rather than on each page, so all four pages end the
   * same way and there is one place this has to be right.
   */
  function outroSegment(outro, audio, fps) {
    const rate = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS;
    // Each frame is asked for in the MIDDLE of its own slice of time,
    // not on the edge of it. A clip's frames begin where its container
    // says they begin -- rounded to the millisecond in a WebM, to a
    // timescale tick in an MP4 -- and a frame boundary asked for
    // exactly lands on either side of itself: one frame comes out
    // twice and the next never comes out at all. That is what the
    // judder was. Half a frame in, nothing rounds far enough to
    // matter.
    const middle = 0.5 / rate;
    return {
      seconds: outro.seconds,
      ...(audio ? { audio } : {}),
      onStart: async () => {
        // Never played: muted, paused, and parked on its first frame,
        // so the very first frame of the ending is the right one.
        outro.video.muted = true;
        try {
          outro.video.pause();
        } catch (err) {
          /* an element that will not pause was not playing */
        }
        await frameAt(outro.video, middle);
      },
      draw: async (ctx, at) => {
        await frameAt(outro.video, at + middle);
        drawCover(ctx, ctx.canvas, outro.video);
      },
    };
  }

  window.OutroVideo = {
    outroKeys,
    sharedUrl,
    loadOutro,
    lastFailure: () => lastFailure,
    outroSource,
    drawCover,
    frameAt,
    outroSegment,
  };
})();
