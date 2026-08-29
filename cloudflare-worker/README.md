# Drum Asset Worker (Cloudflare)

A thin Cloudflare Worker that proxies the `msharing0008` R2 bucket for the
Drum MIDI → Video app. The frontend never talks to R2 directly — it only
calls this Worker, which holds the R2 binding.

Live at: **https://msharing0008.idetsminmh1995.workers.dev**

## R2 bucket layout expected

```
drums/
  {drumSetName}/
    16x9/
      Drum Bg.png
      R{note}.png
      L{note}.png
    9x16/
      ...
    1x1/
      ...
```

- Aspect folders are named `16x9`, `9x16`, `1x1` (no colon — URL-safe).
- The background image is named `Drum Bg.png` and sits directly in the
  aspect folder (no separate `Bg/` subfolder).
- Upload your Drum Set folders into the `msharing0008` bucket following this
  structure (Cloudflare dashboard drag-and-drop, `wrangler r2 object put`,
  or rclone). New Drum Sets are picked up automatically — nothing to change
  in code.

## Endpoints

- `GET /api/drum-sets` → `{ "drumSets": ["drum1", ...] }`
- `GET /api/drum-sets/:drumSet/:aspect/manifest` → asset filenames for that
  drum set + aspect ratio, e.g.
  `{ "drumSet": "drum1", "aspect": "16x9", "hasBackground": true, "backgroundFile": "Drum Bg.png", "files": ["R38.png", "L38.png", ...] }`.
  `:aspect` is one of `16x9`, `9x16`, `1x1`.
- `GET /assets/:drumSet/:aspect/*filePath` → streams the actual PNG, e.g.
  `/assets/drum1/16x9/Drum%20Bg.png` or `/assets/drum1/16x9/R38.png`.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Deployed automatically via Cloudflare Workers Builds (GitHub-connected) on
every push to `main`. To deploy manually instead:

```bash
npx wrangler login   # first time only
npm run deploy
```

The R2 bucket binding (`DRUM_ASSETS` → `msharing0008`) is already configured
in the root `wrangler.toml`. Before going to production, set
`ALLOWED_ORIGINS` to your actual Cloudflare Pages frontend URL instead of `"*"`.

## Security notes

- No R2 credentials ever reach the browser — only this Worker has the binding.
- `..` path segments are rejected to prevent path traversal into unrelated keys.
- CORS is restricted via `ALLOWED_ORIGINS`; tighten it before production.
