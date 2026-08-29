# Drum Asset Worker (Cloudflare)

A thin Cloudflare Worker that proxies the `msharing0008` R2 bucket for the
Drum MIDI → Video app. The frontend never talks to R2 directly — it only
calls this Worker, which holds the R2 binding.

## R2 bucket layout expected

```
drum-sets/
  {DrumSetName}/
    16:9/
      Bg/background.png
      R{note}.png
      L{note}.png
    9:16/
      ...
    1:1/
      ...
```

Upload your Drum Set folders into the `msharing0008` bucket following this
structure (via `wrangler r2 object put`, the Cloudflare dashboard, or `rclone`).
New Drum Sets are picked up automatically — nothing to change in code.

## Endpoints

- `GET /api/drum-sets` → `{ "drumSets": ["Drum1", "Drum2", ...] }`
- `GET /api/drum-sets/:drumSet/:aspect/manifest` → asset filenames for that
  drum set + aspect ratio. `:aspect` is one of `16x9`, `9x16`, `1x1`
  (URL-safe stand-ins for `16:9`, `9:16`, `1:1`).
- `GET /assets/:drumSet/:aspect/*filePath` → streams the actual PNG, e.g.
  `/assets/Drum1/16x9/Bg/background.png` or `/assets/Drum1/16x9/R38.png`.

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
npx wrangler login   # first time only
npm run deploy
```

The R2 bucket binding (`DRUM_ASSETS` → `msharing0008`) is already configured
in `wrangler.toml`. Before going to production, set `ALLOWED_ORIGINS` in
`wrangler.toml` (or as a dashboard variable) to your actual Cloudflare Pages
frontend URL instead of `"*"`.

## Security notes

- No R2 credentials ever reach the browser — only this Worker has the binding.
- `..` path segments are rejected to prevent path traversal into unrelated keys.
- CORS is restricted via `ALLOWED_ORIGINS`; tighten it before production.
