// cloudflare-worker/src/index.ts
//
// API/asset-proxy backend ONLY -- the frontend app is hosted separately
// (GitHub Pages) and talks to this Worker over CORS using its full URL.
//
//   - GET /api/drum-sets                   lists drum sets discovered in R2
//   - GET /api/drum-sets/:name/:aspect/manifest   lists that set's assets
//   - GET /assets/:name/:aspect/*file      streams a drum-set PNG from R2
//   - GET /assets/shared/*file             streams a shared asset from R2
//                                          (Voices/, NotationEngine/, etc.)
//
// R2 key layout actually used:
//   drums/{drumSetName}/{aspect}/Drum Bg.png
//   drums/{drumSetName}/{aspect}/R{note}.png
//   drums/{drumSetName}/{aspect}/L{note}.png
// `aspect` is one of "16x9", "9x16", "1x1".
// Shared (non-drum-set) assets live at the R2 key directly, e.g.
// "Voices/1.wav" or "Notation Engine/alphaTab.min.js".

export interface Env {
  DRUM_ASSETS: R2Bucket;
  ALLOWED_ORIGINS?: string;
}

const R2_PREFIX = 'drums/';
const BACKGROUND_FILENAME = 'Drum Bg.png';
const VALID_ASPECTS = new Set(['16x9', '9x16', '1x1']);

function corsHeaders(request: Request, env: Env): HeadersInit {
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const origin = request.headers.get('Origin') ?? '';
  const allowOrigin = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function errorResponse(message: string, status: number, headers: HeadersInit): Response {
  return json({ error: message }, status, headers);
}

async function listDrumSets(bucket: R2Bucket): Promise<string[]> {
  const names = new Set<string>();
  let cursor: string | undefined;
  do {
    const result = await bucket.list({ prefix: R2_PREFIX, delimiter: '/', cursor });
    for (const prefix of result.delimitedPrefixes) {
      const parts = prefix.split('/').filter(Boolean);
      if (parts.length >= 2) names.add(parts[1]);
    }
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return [...names].sort();
}

async function listManifest(bucket: R2Bucket, drumSet: string, aspect: string) {
  const prefix = `${R2_PREFIX}${drumSet}/${aspect}/`;
  const files: string[] = [];
  let hasBackground = false;
  let cursor: string | undefined;
  do {
    const result = await bucket.list({ prefix, cursor });
    for (const obj of result.objects) {
      const relative = obj.key.slice(prefix.length);
      if (!relative || relative.endsWith('/')) continue;
      if (relative === BACKGROUND_FILENAME) hasBackground = true;
      else files.push(relative);
    }
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return { hasBackground, files: files.sort() };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));

    if (request.method === 'GET' && segments.length === 0) {
      return json({ status: 'ok', service: 'Drum MIDI -> Video API', endpoints: ['/api/drum-sets', '/api/drum-sets/:name/:aspect/manifest', '/assets/:name/:aspect/*file', '/assets/shared/*file'] }, 200, headers);
    }

    if (request.method !== 'GET') {
      return errorResponse('Only GET requests are supported.', 405, headers);
    }

    try {
      if (segments[0] === 'api' && segments[1] === 'drum-sets' && segments.length === 2) {
        const drumSets = await listDrumSets(env.DRUM_ASSETS);
        return json({ drumSets }, 200, headers);
      }

      if (segments[0] === 'api' && segments[1] === 'drum-sets' && segments.length === 5 && segments[4] === 'manifest') {
        const [, , drumSet, aspect] = segments;
        if (!VALID_ASPECTS.has(aspect)) {
          return errorResponse(`Unknown aspect ratio "${aspect}". Expected one of: ${[...VALID_ASPECTS].join(', ')}.`, 400, headers);
        }
        const manifest = await listManifest(env.DRUM_ASSETS, drumSet, aspect);
        if (!manifest.hasBackground && manifest.files.length === 0) {
          return errorResponse(`Drum set "${drumSet}" (${aspect}) not found or has no assets.`, 404, headers);
        }
        return json({ drumSet, aspect, hasBackground: manifest.hasBackground, backgroundFile: manifest.hasBackground ? BACKGROUND_FILENAME : null, files: manifest.files }, 200, headers);
      }

      // Shared assets that aren't tied to a specific drum set/aspect --
      // e.g. GET /assets/shared/Voices/1.wav -> R2 key "Voices/1.wav"
      if (segments[0] === 'assets' && segments[1] === 'shared' && segments.length >= 3) {
        const filePath = segments.slice(2).join('/');
        if (filePath.includes('..')) {
          return errorResponse('Invalid asset path.', 400, headers);
        }
        const object = await env.DRUM_ASSETS.get(filePath);
        if (!object) {
          return errorResponse(`Shared asset not found: ${filePath}`, 404, headers);
        }
        const respHeaders = new Headers(headers as HeadersInit);
        object.writeHttpMetadata(respHeaders);
        respHeaders.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream');
        respHeaders.set('Cache-Control', 'public, max-age=60, must-revalidate');
        respHeaders.set('ETag', object.httpEtag);
        return new Response(object.body, { status: 200, headers: respHeaders });
      }

      if (segments[0] === 'assets' && segments.length >= 4) {
        const [, drumSet, aspect, ...rest] = segments;
        if (!VALID_ASPECTS.has(aspect)) {
          return errorResponse(`Unknown aspect ratio "${aspect}".`, 400, headers);
        }
        const filePath = rest.join('/');
        if (filePath.includes('..')) {
          return errorResponse('Invalid asset path.', 400, headers);
        }
        const key = `${R2_PREFIX}${drumSet}/${aspect}/${filePath}`;
        const object = await env.DRUM_ASSETS.get(key);
        if (!object) {
          return errorResponse(`Asset not found: ${filePath}`, 404, headers);
        }
        const respHeaders = new Headers(headers as HeadersInit);
        object.writeHttpMetadata(respHeaders);
        respHeaders.set('Content-Type', object.httpMetadata?.contentType ?? 'image/png');
        respHeaders.set('Cache-Control', 'public, max-age=60, must-revalidate');
        respHeaders.set('ETag', object.httpEtag);
        return new Response(object.body, { status: 200, headers: respHeaders });
      }

      return errorResponse('Not found.', 404, headers);
    } catch (err) {
      console.error('Worker error:', err);
      return errorResponse('Internal error while accessing R2.', 500, headers);
    }
  },
};
