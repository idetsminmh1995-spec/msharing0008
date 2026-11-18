# Third-party notices

The Notation Engine is internal to this project and is not published, so
there is no outbound license for it. This file records the third-party
components that are redistributed with it, because each of their licenses
requires its notice to travel with the copy.

Two things are distributed: the built bundles (`dist/notation-engine.js`,
`dist/sound-engine.js`) and the served assets under `Website/Website/assets/`.

## Bundled code

| Component | Version | License | Where it ends up |
| --- | --- | --- | --- |
| [fflate](https://github.com/101arrowz/fflate) | 0.8.3 | MIT | bundled into `dist/notation-engine.js` (MXL/compressed-archive unzip) |
| [spessasynth_lib](https://github.com/spessasus/spessasynth_lib) | 4.4.8 | Apache-2.0 | bundled into `dist/sound-engine.js`; its AudioWorklet is served as `assets/spessasynth_processor.min.js` |

Both are MIT/Apache-2.0, and both require that the copyright notice and the
license text be kept with the distributed copy. The MIT and Apache-2.0 texts
are reproduced below. `spessasynth_lib`'s full license is also present at
`node_modules/spessasynth_lib/LICENSE` after `npm ci`.

### fflate — MIT

```text
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### spessasynth_lib — Apache-2.0

Copyright the spessasynth_lib authors (spessasus). Licensed under the Apache
License, Version 2.0 (<http://www.apache.org/licenses/LICENSE-2.0>). The full
license text is distributed with the package at
`node_modules/spessasynth_lib/LICENSE` and is available at the URL above.

## Bundled assets

| Asset | License | Where it ends up |
| --- | --- | --- |
| Bravura 1.482 (SMuFL reference music font) | SIL Open Font License 1.1 | `dist/fonts/Bravura.woff2` and `Website/Website/assets/fonts/Bravura.woff2` |

The OFL requires the license be distributed with the font, so
`dist/fonts/LICENSE.md` carries the full copyright notice and OFL text, and
`scripts/sync-website-bundle.mjs` copies it next to the font on every build
(so the served `assets/fonts/` directory holds it too). A test
(`test/unit/website-bundle.test.js`) fails if the served copy goes missing or
drifts from the engine's own.

## Host assets (not distributed by this repo)

The SoundFonts are host assets fetched at runtime from Cloudflare R2; no
`.sf2`/`.sf3` is checked into this repository or shipped in the bundle. Their
licenses, attribution files and checksums live with the R2 objects under
`soundfonts/` and are documented in:

- `../Sound Plan/README.md` (asset and license decision)
- `../Sound Doc/MuseScore-General-R2-Asset.md` (default asset record)
- `../Sound Doc/SoundFont-Collection-R2.md` (the full collection)
