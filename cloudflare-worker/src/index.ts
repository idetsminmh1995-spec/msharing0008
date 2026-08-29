// cloudflare-worker/src/index.ts
//
// Thin R2 proxy/manifest API for the Drum MIDI -> Video app.
//
// Why this exists (spec sections 6, 18, 22, 24):
// - The R2 bucket must never be exposed directly to the browser (no public
//   bucket URL, no credentials in frontend JS).
// - New Drum Sets must be discoverable without hardcoding names in the UI.
// - The frontend should only ever load the assets for the currently
//   selected Drum Set + aspect ratio, never everything at once.
//
// R2 key layout actually used (matches what's uploaded in the bucket):
//   drums/{drumSetName}/{aspect}/Drum Bg.png
//   drums/{drumSetName}/{aspect}/R{note}.png
//   drums/{drumSetName}/{aspect}/L{note}.png
//
// `aspect` is one of "16x9", "9x16", "1x1" -- used as-is, both as the R2
// folder name and the public URL segment (no colon, so no URL-encoding
// headaches). The background file is named "Drum Bg.png" (with a space)
// and lives directly in the aspect folder, not in a separate subfolder.
//
// Endpoints:
//   GET /api/drum-sets
//     -> { "drumSets": ["drum1", "drum2", ...] }  (discovered from R2)
//
//   GET /api/drum-sets/:drumSet/:aspect/manifest
//     -> { drumSet, aspect, hasBackground, backgroundFile, files: [...] }
//
//   GET /assets/:drumSet/:aspect/*filePath
//     -> streams the actual PNG bytes from R2, e.g.
//        /assets/drum1/16x9/Drum%20Bg.png  or  /assets/drum1/16x9/R38.png

export interface Env {
  DRUM_ASSETS: R2Bucket;
  // Comma-separated list of allowed origins for CORS, e.g. "https://drum-midi.pages.dev".
  // Falls back to "*" (open) if unset -- tighten this before going to production.
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
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number, headers: HeadersInit): Response {
  return json({ error: message }, status, headers);
}

/** Discover distinct Drum Set names under drums/ using R2's delimiter listing. */
async function listDrumSets(bucket: R2Bucket): Promise<string[]> {
  const names = new Set<string>();
  let cursor: string | undefined;
  do {
    const result = await bucket.list({ prefix: R2_PREFIX, delimiter: '/', cursor });
    for (const prefix of result.delimitedPrefixes) {
      // prefix looks like "drums/drum1/" -> extract "drum1"
      const parts = prefix.split('/').filter(Boolean);
      if (parts.length >= 2) names.add(parts[1]);
    }
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return [...names].sort();
}

/** List asset filenames for a given drum set + aspect ratio. */
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
      if (relative === BACKGROUND_FILENAME) {
        hasBackground = true;
      } else {
        files.push(relative);
      }
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
    if (request.method !== 'GET') {
      return errorResponse('Only GET requests are supported.', 405, headers);
    }

    const url = new URL(request.url);
    // Decode each segment individually so filenames with spaces (e.g.
    // "Drum Bg.png" -> "Drum%20Bg.png" in the URL) resolve correctly.
    const segments = url.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));

    try {
      // GET /api/drum-sets
      if (segments[0] === 'api' && segments[1] === 'drum-sets' && segments.length === 2) {
        const drumSets = await listDrumSets(env.DRUM_ASSETS);
        return json({ drumSets }, 200, headers);
      }

      // GET /api/drum-sets/:drumSet/:aspect/manifest
      if (
        segments[0] === 'api' &&
        segments[1] === 'drum-sets' &&
        segments.length === 5 &&
        segments[4] === 'manifest'
      ) {
        const [, , drumSet, aspect] = segments;
        if (!VALID_ASPECTS.has(aspect)) {
          return errorResponse(
            `Unknown aspect ratio "${aspect}". Expected one of: ${[...VALID_ASPECTS].join(', ')}.`,
            400,
            headers
          );
        }
        const manifest = await listManifest(env.DRUM_ASSETS, drumSet, aspect);
        if (!manifest.hasBackground && manifest.files.length === 0) {
          return errorResponse(`Drum set "${drumSet}" (${aspect}) not found or has no assets.`, 404, headers);
        }
        return json(
          {
            drumSet,
            aspect,
            hasBackground: manifest.hasBackground,
            backgroundFile: manifest.hasBackground ? BACKGROUND_FILENAME : null,
            files: manifest.files,
          },
          200,
          headers
        );
      }

      // GET /assets/:drumSet/:aspect/*filePath
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
        respHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
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
// Version marker: retrigger build 2026-08-29T16:36:26Z
