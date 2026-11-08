import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/r2-image-loader.js', import.meta.url), 'utf8');

function createHarness(fetchImpl) {
  const revoked = [];
  let objectId = 0;
  const fakeURL = {
    createObjectURL() {
      objectId += 1;
      return `blob:test-${objectId}`;
    },
    revokeObjectURL(url) {
      revoked.push(url);
    },
  };
  const window = {};
  const context = vm.createContext({
    window,
    URL: fakeURL,
    fetch: fetchImpl,
    Blob,
    AbortController,
    DOMException,
    setTimeout,
    clearTimeout,
    Promise,
    Error,
    TypeError,
    String,
    Number,
    Math,
  });
  vm.runInContext(source, context, { filename: 'r2-image-loader.js' });
  return { loader: window.R2ImageLoader, revoked };
}

function imageElement() {
  return {
    dataset: {},
    naturalWidth: 640,
    naturalHeight: 360,
    complete: true,
    src: '',
    async decode() {},
    removeAttribute(name) {
      if (name === 'src') this.src = '';
    },
  };
}

function response(status, body = 'image-data', type = 'image/png') {
  const blob = new Blob([body], { type });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? type : null) },
    blob: async () => blob,
  };
}

test('retries transient R2 errors, waits for decode, and releases the object URL', async () => {
  let calls = 0;
  const { loader, revoked } = createHarness(async () => {
    calls += 1;
    return calls === 1 ? response(503) : response(200);
  });
  const image = imageElement();
  const result = await loader.loadIntoImage(image, 'https://assets.test/kit/R38.png', {
    retries: 1,
    timeoutMs: 100,
  });

  assert.equal(calls, 2);
  assert.equal(result.bytes, 10);
  assert.equal(image.dataset.r2Ready, 'true');
  assert.equal(image.naturalWidth, 640);
  loader.release(image);
  assert.deepEqual(revoked, ['blob:test-1']);
});

test('does not retry a missing R2 object and rejects zero-byte or non-image responses', async () => {
  let missingCalls = 0;
  const missing = createHarness(async () => {
    missingCalls += 1;
    return response(404);
  });
  await assert.rejects(
    missing.loader.loadIntoImage(imageElement(), 'https://assets.test/missing.png', {
      retries: 2,
      timeoutMs: 100,
    }),
    /404/,
  );
  assert.equal(missingCalls, 1);

  const empty = createHarness(async () => response(200, '', 'image/png'));
  await assert.rejects(
    empty.loader.loadIntoImage(imageElement(), 'https://assets.test/empty.png', {
      retries: 0,
      timeoutMs: 100,
    }),
    /empty image/,
  );

  const wrongType = createHarness(async () => response(200, 'not-image', 'text/html'));
  await assert.rejects(
    wrongType.loader.loadIntoImage(imageElement(), 'https://assets.test/error.html', {
      retries: 0,
      timeoutMs: 100,
    }),
    /not an image/,
  );
});

test('aborts a stalled R2 request after the configured timeout', async () => {
  const { loader } = createHarness((_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }),
  );

  await assert.rejects(
    loader.loadIntoImage(imageElement(), 'https://assets.test/slow.png', {
      retries: 0,
      timeoutMs: 10,
    }),
    /Could not load R2 image/,
  );
});
