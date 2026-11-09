/* Shared asset loader for preview and export. */
(function () {
  const MAX_CONCURRENCY = 6;
  const REQUEST_TIMEOUT_MS = 20_000;
  const GATE_TIMEOUT_MS = 120_000;
  const objectUrls = new Map();
  const queue = [];
  let active = 0;

  function release(img) {
    const url = objectUrls.get(img);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrls.delete(img);
    }
    if (img) img.removeAttribute('src');
  }

  function revokeAfterRender() {
    for (const [img, url] of objectUrls) {
      URL.revokeObjectURL(url);
      objectUrls.delete(img);
    }
  }

  function slot() {
    if (active < MAX_CONCURRENCY) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => queue.push({ resolve, reject }));
  }

  function freeSlot() {
    active = Math.max(0, active - 1);
    const next = queue.shift();
    if (next) {
      active += 1;
      next.resolve();
    }
  }

  function cancelQueue() {
    while (queue.length) queue.shift().reject(new Error('Asset gate was cancelled before this asset started.'));
  }

  function retryDelay(attempt) {
    return [500, 1500, 4000][Math.min(attempt, 2)] + Math.floor(Math.random() * 250);
  }

  async function fetchBlob(url, label, gateSignal) {
    let lastError;
    for (let attempt = 0; attempt <= 3; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const forwardAbort = () => controller.abort();
      gateSignal?.addEventListener('abort', forwardAbort, { once: true });
      try {
        const separator = url.includes('?') ? '&' : '?';
        const response = await fetch(`${url}${separator}assetAttempt=${attempt}`, {
          cache: 'no-store',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = new Error(`${label} returned HTTP ${response.status}.`);
          error.status = response.status;
          error.retryable = response.status === 429 || response.status >= 500;
          throw error;
        }
        const blob = await response.blob();
        if (!blob.size) throw new Error(`${label} returned an empty response.`);
        return blob;
      } catch (error) {
        const message = String(error?.message || error);
        const corsLike = /cors|cross-origin|opaque/i.test(message);
        lastError = error?.name === 'AbortError'
          ? Object.assign(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`), { retryable: true })
          : Object.assign(error instanceof Error ? error : new Error(message), {
              retryable: !corsLike && error?.name === 'TypeError',
            });
        if (gateSignal?.aborted) throw new Error(`Asset gate timed out while loading ${label}.`);
        if (!lastError.retryable || attempt === 3) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
      } finally {
        clearTimeout(timer);
        gateSignal?.removeEventListener('abort', forwardAbort);
      }
    }
    throw lastError || new Error(`Could not load ${label}.`);
  }

  async function loadImage(url, img, label, gateSignal) {
    await slot();
    try {
      for (let decodeAttempt = 0; decodeAttempt < 2; decodeAttempt += 1) {
        let objectUrl;
        try {
          const blob = await fetchBlob(url, label, gateSignal);
          objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
          await img.decode();
          if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) throw new Error(`${label} decoded to an empty image.`);
          const previous = objectUrls.get(img);
          if (previous) URL.revokeObjectURL(previous);
          objectUrls.set(img, objectUrl);
          return img;
        } catch (error) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          img.removeAttribute('src');
          if (error?.status || decodeAttempt === 1) {
            throw new Error(`${label} could not be decoded. ${error?.message || error}`);
          }
        }
      }
    } finally {
      freeSlot();
    }
  }

  async function fetchJson(url, label, gateSignal) {
    const blob = await fetchBlob(url, label, gateSignal);
    try {
      return JSON.parse(await blob.text());
    } catch (error) {
      throw new Error(`${label} returned invalid JSON. ${error?.message || error}`);
    }
  }

  function waitForImage(img, label) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      const onLoad = () => { cleanup(); resolve(img); };
      const onError = () => { cleanup(); reject(new Error(`Could not load ${label}.`)); };
      const timer = setTimeout(() => { cleanup(); reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`)); }, REQUEST_TIMEOUT_MS);
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });
  }

  async function withGateTimeout(work) {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        work(controller.signal),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error(`Asset gate exceeded ${GATE_TIMEOUT_MS / 1000}s.`)); }, GATE_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      controller.abort();
      cancelQueue();
    }
  }

  window.AssetLoader = Object.freeze({
    MAX_CONCURRENCY,
    REQUEST_TIMEOUT_MS,
    GATE_TIMEOUT_MS,
    loadImage,
    fetchJson,
    waitForImage,
    objectUrlFor: (img) => objectUrls.get(img) || null,
    withGateTimeout,
    release,
    revokeAfterRender,
  });
})();
