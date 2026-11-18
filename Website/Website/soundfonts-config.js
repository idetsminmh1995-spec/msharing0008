/**
 * SoundFont host configuration.
 *
 * The Sound Engine fetches its SoundFonts at runtime from Cloudflare R2;
 * nothing here ships a `.sf2`/`.sf3`. This file is the one place the
 * host's public R2 URL is stated, so the engine's own source stays free
 * of a deployment URL. `notation-editor.js` reads it as
 * `window.MSHARING_SOUNDFONT_CONFIG` and passes it straight into
 * `R2SoundFontEngine.create(...)`.
 *
 * The base is the bucket's public r2.dev subdomain. It is
 * development/testing access (Cloudflare rate-limits it); move to a
 * custom domain for production.
 */
window.MSHARING_SOUNDFONT_CONFIG = {
  manifestUrl: 'https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/soundfonts/manifest.json',
  assetBaseUrl: 'https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/soundfonts',
};
