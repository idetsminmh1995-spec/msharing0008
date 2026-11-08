(function (global) {
  'use strict';

  const states = new WeakMap();
  const DEFAULT_TIMEOUT_MS = 15_000;
  const DEFAULT_RETRIES = 2;

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        reject(new DOMException('Asset loading was cancelled', 'AbortError'));
        return;
      }
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Asset loading was cancelled', 'AbortError'));
          },
          { once: true },
        );
      }
    });
  }

  function isRetryable(error, timedOut) {
    if (timedOut) return true;
    if (error && Number.isFinite(error.status)) {
      return error.status === 408 || error.status === 429 || error.status >= 500;
    }
    return !error || error.name !== 'AbortError';
  }

  async function decode(image) {
    if (typeof image.decode === 'function') {
      await image.decode();
      return;
    }
    if (image.complete && image.naturalWidth > 0) return;
    await new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('The browser could not decode the R2 image'));
      };
      const cleanup = () => {
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
      };
      image.addEventListener('load', onLoad, { once: true });
      image.addEventListener('error', onError, { once: true });
    });
  }

  async function loadIntoImage(image, url, options) {
    if (!image || typeof image !== 'object') throw new TypeError('An image element is required');
    if (typeof url !== 'string' || url.length === 0) throw new TypeError('An asset URL is required');
    const settings = options || {};
    const timeoutMs = Number.isFinite(settings.timeoutMs) ? settings.timeoutMs : DEFAULT_TIMEOUT_MS;
    const retries = Number.isInteger(settings.retries) ? Math.max(0, settings.retries) : DEFAULT_RETRIES;
    const externalSignal = settings.signal;
    const previous = states.get(image);
    if (previous) {
      if (previous.controller) previous.controller.abort();
      if (previous.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      states.delete(image);
    }

    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (externalSignal && externalSignal.aborted) {
        throw new DOMException('Asset loading was cancelled', 'AbortError');
      }
      const controller = new AbortController();
      let timedOut = false;
      let objectUrl = null;
      const state = { controller, objectUrl };
      states.set(image, state);
      const abortFromCaller = () => controller.abort();
      if (externalSignal) externalSignal.addEventListener('abort', abortFromCaller, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        image.crossOrigin = 'anonymous';
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal,
          cache: attempt === 0 ? 'default' : 'reload',
        });
        if (!response.ok) {
          const error = new Error(`R2 request failed (${response.status}) for ${url}`);
          error.status = response.status;
          throw error;
        }
        const blob = await response.blob();
        if (!blob || blob.size === 0) throw new Error(`R2 returned an empty image: ${url}`);
        const contentType = (response.headers && response.headers.get('content-type')) || blob.type || '';
        if (contentType && !contentType.toLowerCase().startsWith('image/')) {
          throw new Error(`R2 returned ${contentType}, not an image, for ${url}`);
        }
        objectUrl = URL.createObjectURL(blob);
        state.objectUrl = objectUrl;
        image.src = objectUrl;
        await decode(image);
        if (externalSignal && externalSignal.aborted) {
          throw new DOMException('Asset loading was cancelled', 'AbortError');
        }
        if (states.get(image) !== state) {
          throw new DOMException('Asset request was superseded', 'AbortError');
        }
        if (!(image.naturalWidth > 0) || !(image.naturalHeight > 0)) {
          throw new Error(`The decoded R2 image has no dimensions: ${url}`);
        }
        state.controller = null;
        image.dataset.r2AssetUrl = url;
        image.dataset.r2Ready = 'true';
        image.dataset.r2Bytes = String(blob.size);
        return { url, objectUrl, bytes: blob.size, contentType, width: image.naturalWidth, height: image.naturalHeight };
      } catch (error) {
        lastError = error;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        if (states.get(image) === state) states.delete(image);
        image.dataset.r2Ready = 'false';
        if (image.src === objectUrl) image.removeAttribute('src');
        if (externalSignal && externalSignal.aborted) {
          throw new DOMException('Asset loading was cancelled', 'AbortError');
        }
        if (attempt >= retries || !isRetryable(error, timedOut)) break;
      } finally {
        clearTimeout(timer);
        if (externalSignal) externalSignal.removeEventListener('abort', abortFromCaller);
      }
      await sleep(Math.min(250 * 2 ** attempt, 1000), externalSignal);
    }
    throw new Error(`Could not load R2 image after ${retries + 1} attempt(s): ${lastError?.message || url}`);
  }

  function release(image) {
    if (!image) return;
    const state = states.get(image);
    if (state) {
      if (state.controller) state.controller.abort();
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      states.delete(image);
    }
    const objectUrl = image.dataset && image.dataset.r2ObjectUrl;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (image.dataset) {
      delete image.dataset.r2Ready;
      delete image.dataset.r2AssetUrl;
      delete image.dataset.r2Bytes;
      delete image.dataset.r2ObjectUrl;
    }
    if (typeof image.removeAttribute === 'function') image.removeAttribute('src');
  }

  global.R2ImageLoader = { loadIntoImage, release };
})(window);
