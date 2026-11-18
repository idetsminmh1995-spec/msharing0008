# Notation Engine — နောက်ဆုံး Plan (final-engine plan)

**ပြန်လည်သုံးသပ်ရက်စွဲ:** 2026-11-18

**အခြေခံ:** လက်ရှိ `Website/Notation/Notation Engine/` codebase (TypeScript, esbuild bundle)

**အခြေအနေ:** engine သည် ကိုယ်ပိုင် data layer (`src/notation-defaults/`) နှင့် ကိုယ်ပိုင် provenance ကို သုံးပြီးဖြစ်သည်။ ဤ Plan သည် "MuseScore ကို ကျွန်ုပ်တို့၏ ကိုယ်ပိုင် Notation Engine အဖြစ် ပြောင်းခြင်း" ၏ နောက်ဆုံးအဆင့် ကျန်ရှိသော အလုပ်ကို အပိုင်း (parts) လိုက် ခွဲထားသည်။

> **မှတ်ချက် — ဤ Plan က အရေးကြီးသည်။** ယခင်က ရေးထားသော audit/remediation မှတ်တမ်းများသည် သမိုင်းအဖြစ် ဆက်တည်ရှိသည်။ သို့သော် လုပ်ဆောင်ရမည့် ဦးစားပေးအစီအစဉ်က ဤနောက်ဆုံး plan ဖြစ်သည်။

---

## ရည်မှန်းချက်

TypeScript ဖြင့်ရေးသားထားသော **instrument-neutral** score model ကို အသုံးပြုပြီး MusicXML မှ SVG notation၊ layout၊ playback-position data နှင့် export များကို ယုံကြည်စိတ်ချရစွာ ပေးနိုင်ရန်။ Engine သည် —

1. **ကိုယ်ပိုင်** — မည်သည့် third-party GPL-3.0-only table/source ကိုမျှ build-time မှီခိုမှုမရှိ။
2. **instrument-neutral** — Piano/Drum နှစ်မျိုးတည်းဖြင့် မကန့်သတ်။
3. **verifiable** — `npm run verify` အစိမ်းဖြစ်ပြီး public specification တစ်ခုချင်းကို test ဖြင့် ချိတ်ထားသည်။

---

## လက်ရှိ code snapshot

- Package: `notation-engine` (`private: true`, version `0.0.0`)။ Public API ကို `src/index.ts` (barrel) မှ export လုပ်ထားသည်။
- Main flow: `parseMusicXml()` → `ParseResult` → `renderParsedMusicXml()`; shortcut `renderFromMusicXml()` က `{ svg, diagnostics, playback }` ပြန်ပေးသည်။ `unzipMxl()` က သီးခြား function။
- Layers: `config core debug drums export geometry glyphs layout notation-defaults parser playback plugins render soundfont theme timing` + `render-from-musicxml.ts`။
- Data provenance: `src/notation-defaults/` ထဲက table တစ်ခုချင်းက `DefaultsSource` (`musicxml`, `smufl`, `gm1`, `drumNotation`, `houseStyle`) ဖြင့် ရင်းမြစ်ကို ဖော်ပြထားသည်။
- Bundle: esbuild IIFE၊ global `NotationEngine` / `NotationSoundFont`။ `scripts/sync-website-bundle.mjs` က bundle ကို `Website/Website/assets/` သို့ကူးသည်။
- Verify: `npm run verify` (typecheck + lint + format:check + build + API doc + tests) သည် **1163/1163 pass**။

---

## လုပ်ဆောင်ရန် အပိုင်းများ (work parts)

### Part A — Build / docs path ကို deploy structure နှင့် အပြီးသတ်ချိတ်ဆက်ရန်

- [x] `sync-website-bundle.mjs` ၏ destination ကို `Website/Website/assets/` အဖြစ် ပြင်ပြီးဖြစ်သည် (ယခင် plan ရဲ့ lowercase `Website/website` မှတ်ချက်သည် stale ဖြစ်သည်)။ `test/unit/website-bundle.test.js` က bundle hash နှင့် cache key ကို စစ်သည်။
- [x] `generate-api-docs.mjs` ၏ output ကို `Notation/Notation Plan/Documentation/API.md` အဖြစ် ရောက်နေပြီ။ `npm run docs:check` က up-to-date ကို စစ်သည်။
- [x] CI workflow `.github/workflows/notation-engine.yml` ထည့်ပြီးဖြစ်သည်: `npm ci` → Chromium install (visual check run ဖြစ်စေရန်) → `npm run verify`။ Browser test သည် Chromium မရှိလျှင် skip ဖြစ်ကြောင်း suite က ရှိပြီးသား (browser.test.js)။
- [ ] Clean environment တွင် `npm ci` → `typecheck` → `lint` → `format:check` → `docs:check` → `test` ကို အစဉ်လိုက် run ပြီး failure တစ်ခုချင်းကို မှတ်တမ်းတင်ပါ (CI က ဤအလုပ်ကို အလိုအလျောက်လုပ်ပေးပြီး၊ ပထမ run ၏ ရလဒ်ကို စောင့်ကြည့်ရမည်)။

**ပြီးစီးမှုစံ:** Clean install မှ verify ရလဒ်ကို မှတ်တမ်းတင်ထားရမည်။ CI တွင် browser test skip/fail အကြောင်းရင်း မရှင်းလင်းဘဲ မကျန်ရ။

---

### Part B — Documentation ကို code နှင့် ကိုက်ညီအောင်လုပ်ရန်

- [x] Root `README.md` ရေးပြီးဖြစ်သည်: install/build, DOMParser requirement, parse/render API example, MXL ကို သီးခြား unzip လုပ်ပုံ, export behavior (PNG = first slice, PDF = raster pages), host-dependent features (SoundFont/raster)။
- [x] `src/*/README.md` နှင့် `test/fixtures/README.md` မှ ကျန်နေသော "Phase 1 / Phase N" စာသားများနှင့် ပျောက်နေသော `Doc/phase-*.md` cross-reference များကို ဖြေရှင်းပြီးဖြစ်သည်။ ယခု README များက `Notation Plan/PLAN.md` ၏ Part များကို ညွှန်သည်။
- [x] MusicXML **support matrix** ကို `Notation Plan/Documentation/MusicXML-Support.md` အဖြစ် ရေးပြီးဖြစ်သည် (implemented / parsed-not-applied / recovered + stable diagnostic codes)။
- [x] `src/theme/` ကို `EngineConfig` ဖြင့် supersede လုပ်ထားပြီး၊ `src/plugins/` ကို concrete use case မရှိသေးသဖြင့် defer ထားကြောင်း ရှင်းလင်းထားသည်။ Duplicate theme/plugin API မဖန်တီးရ။

**ပြီးစီးမှုစံ:** README/source comments က ရှိပြီးသား feature ကို placeholder ဟု မဖော်ပြတော့ရ။

---

### Part C — Notation data layer ကို ကိုယ်ပိုင်အဖြစ် အပြီးသတ်ရန် (MuseScore-derived အားလုံး ဖယ်ရှားရန်)

- [x] `src/musescore/` folder ကို ဖျက်ပြီး `src/notation-defaults/` အဖြစ် အစားထိုးပြီးဖြစ်သည်။
- [x] Spacing law ကို `'musescore'` မှ `'power'` သို့ rename ပြီးဖြစ်သည်။
- [x] Drum kit heads ကို engine ကိုယ်ပိုင် shape-family vocabulary (`x`, `circle-x`, `diamond`, …) ဖြင့် ဖော်ပြပြီးဖြစ်သည်။
- [x] Engine `src/` ထဲမှ MuseScore-derived provenance comment အားလုံးကို house-style/public-spec အဖြစ် ပြန်ရေးပြီးဖြစ်သည် (value မပြောင်း)။
- [x] **Host asset id:** `src/soundfont/browser.ts` ထဲက `musescore-general-*` သည် **host asset id** (R2 က serve လုပ်သော downloadable SoundFont) ဖြစ်သည်၊ engine data မဟုတ်။ `R2SoundFontEngine.create()` သည် ယခု hardcoded default asset id မထားတော့ဘဲ manifest က စာရင်းပြထားသော ပထမ asset ကို default အဖြစ်ယူသည်၊ manifest က asset တစ်ခုချင်းအတွက် `path` ပေးလျှင် ထိုတန်ဖိုးကို ဦးစားပေးသည်။ Table က manifest က path မပေးသည့်အခါအတွက် fallback သာဖြစ်သည်။
- [x] Engine `src/` ထဲမှာ third-party notation program ၏ data/provenance ကျန်မကျန် အလိုအလျောက်စစ်တဲ့ `test/unit/own-provenance.test.js` guard ထည့်ပြီးဖြစ်သည် (host asset id ကိုသာ ခွင့်ပြုသည်၊ ကျန်အားလုံး ဖမ်းသည်)။

**ပြီးစီးမှုစံ:** Engine `src/` ထဲတွင် third-party notation program ၏ data/provenance လုံးဝမရှိ။ ကျန်သော တစ်ခုတည်းသော ရည်ညွှန်းချက်က host asset id ဖြစ်ပြီး၊ ယင်းကို host manifest က ပိုင်ဆိုင်ကြောင်း ရှင်းလင်းထားရမည်။

---

### Part D — Import compatibility နှင့် MIDI scope

- [ ] MusicXML partwise/timewise, MXL, changing attributes/divisions, voices/chords/rests, unpitched percussion, lyrics/directions/harmony စသည့် behavior များကို fixture matrix ဖြင့် ထိန်းပါ။ Exporter တစ်ခုချင်း၏ provenance ကို fixture တစ်ခုချင်း အတည်ပြုပါ။
- [ ] Harmony၊ unusual notation၊ instrument transposition၊ malformed note/chord နှင့် multiple-staff cases အတွက် diagnostic/recovery tests တိုးချဲ့ပါ။
- [ ] `parseMidiFile()` ကို MIDI event/meta parser အဖြစ်သာ ဆက်ထားမည်လား၊ သီးခြား MIDI→`Score` conversion API ဖန်တီးမည်လား ဆုံးဖြတ်ပါ။ MIDI တွင် staff spelling/voice/beaming data မပါသဖြင့် မူဝါဒမရှိဘဲ MusicXML renderer သို့ တိုက်ရိုက်ပို့သည်ဟု မဆိုရ။

**ပြီးစီးမှုစံ:** Parser/API တစ်ခုစီ၏ input/output boundary၊ မထောက်ပံ့သော MIDI formats နှင့် MusicXML recovery behavior ကို user-facing docs မှာ ရှင်းပြနိုင်ရမည်။

---

### Part E — Instrument-neutral mapping (Piano/Drum မှ ကျော်လွန်)

Notation Engine သည် instrument-neutral ဖြစ်ရမည်။ MusicXML တွင် note ပါသည့် မည်သည့် instrument part ကိုမဆို profile စာရင်းမပါခြင်းကြောင့် ပယ်မချဘဲ ဖတ်၍ render လုပ်နိုင်ရမည်။

ပြန်သုံးရန် ရှိပြီးသား:
- `src/core/pitch.ts`, `note.ts`, `chord.ts`, `duration.ts`, `part.ts`, `voice.ts` — pitched/unpitched pitch, chord/staff/voice/time။ Mapping အသစ်အတွက် ဒုတိယ score model မဖန်တီးရ။
- `src/drums/drum-map.ts` — `DrumMapEntry`, `DrumMappingTable`, `lookupDrumMapEntry()`, `mergeDrumMappingTable()`။
- `src/geometry/notehead.ts`, `clef.ts`, `staff.ts` — notehead resolution, clef-aware position conversion။
- `src/notation-defaults/` — clefs, staff positions, drum kit, strings/tab, engraving style, spacing law။

Implementation sequence:
1. `[ ]` `GenericPitchedMapping`, `InstrumentProfile`, shared input/context/result types, `MappingRegistry` နှင့် precedence ကို သတ်မှတ်ပြီး contract/type-level tests ရေးပါ။
2. `[ ]` Instrument-specific map မရှိသော part များအပါအဝင် ပုံမှန် pitched instrument အားလုံးကို generic mapping ဖြင့် render လုပ်နိုင်ကြောင်း စစ်ပါ။
3. `[ ]` Piano/grand staff, transposition/octave transposition, strings/tablature, pitched/unpitched percussion အတွက် profile/module တိုးချဲ့ပါ။
4. `[ ]` Orchestra/ensemble fixtures ဖြင့် multi-part, multi-staff, multi-voice, transposing instruments, part names/order, vertical/system layout ကို စမ်းသပ်ပါ။ Group brackets/barlines နှင့် automatic condensing ကို သီးခြားဆုံးဖြတ်ပါ။
5. `[ ]` `MappingProfile` customization/persistence, diagnostics နှင့် renderer bridge ကို ချိတ်ဆက်ပါ။ Precedence: explicit MusicXML display/notehead/stem → user override → instrument profile → documented fallback + diagnostic။ Mapping က sounding pitch/playback ကို မပြောင်းရ။

**ပြီးစီးမှုစံ:** Profile စာရင်းမပါသော instrument ပါဝင် valid note များ မပျောက်ဘဲ render ဖြစ်ရမည်။ Mapping သည် source MusicXML data, rhythm, sounding pitch, playback ကို မပြောင်းရ။

---

### Part F — Staff/tablature layout လိုက်လျောညီထွေမှု

- [ ] `computeStaffGeometry()` က line count အမျိုးမျိုးကို တွက်နိုင်သော်လည်း `render-from-musicxml.ts` တွင် `STAFF_LINES = 5` assumptions ကျန်နေသည်။ Arbitrary staff-line count ကို import → geometry → note placement → SVG အဆုံးအထိ audit လုပ်ပြီး 1–6+ line fixtures ဖြင့် test ပါ။
- [ ] TAB clef/staff ကို end-to-end စစ်ပါ။ Code comments ထဲရှိ "tab staff not yet draw" သတိပေးချက်များနှင့် fixed-five-line assumptions ကို ဖြေရှင်းပါ။
- [ ] Page-mode dimension change အတွက် resize/reflow ကို public flow အဖြစ် ဆုံးဖြတ်ပါ။ Pure scaling နှင့် page repagination ကို ခွဲဖော်ပြပြီး မတူညီသော system height ရှိ page တွင် clipping/overlap မဖြစ်စေရန် tests ထည့်ပါ။
- [ ] Bravura metrics အခြေခံ custom music-font setting အတွက် compatible-font limitation ကို ဖော်ပြပါ၊ သို့မဟုတ် metrics provider ကို abstraction လုပ်ပါ။

**ပြီးစီးမှုစံ:** ကြေညာထားသော configuration အားလုံးအတွက် staff/tablature layout ကို snapshot + integration tests ဖြင့် အတည်ပြုထားရမည်။

---

### Part G — Timing, playback နှင့် export correctness

- [ ] `buildTempoMap()` နှင့် measure map တို့တွင် non-finite/zero/negative tempo နှင့် meter values အတွက် validation/diagnostics ထည့်ပါ။ Conversion ရလဒ် finite ဖြစ်ကြောင်း tests ဖြင့်စစ်ပါ။
- [ ] Playhead interpolation တွင် nominal time signature မဟုတ်ဘဲ pickup, shortened, overfull measure များ၏ actual tick length ကို `PlaybackData` ထဲ သယ်ဆောင်သုံးပါ။ Boundary နှင့် monotonicity tests ထည့်ပါ။
- [ ] `rasterizeSvg()` ၏ rounded slice height ကြောင့် source row ပျောက်/ထပ်နိုင်ခြေကို ဖြေရှင်းပါ။ 40px/3 slices ကဲ့သို့ remainder ရှိသည့် dimension တွင် pixel row အားလုံး တစ်ကြိမ်တည်းပါဝင်ကြောင်း စစ်ပါ။
- [ ] `exportPng()` က first slice ကိုသာပြန်ခြင်း၊ PDF က raster-image based ဖြစ်ခြင်း၊ rasterization အတွက် browser/host backend လိုခြင်းတို့ကို public docs တွင်ဖော်ပြပါ။
- [ ] Alignment, repeat expansion နှင့် raster/PDF encoding အတွက် representative performance budget များထည့်ပါ။

**ပြီးစီးမှုစံ:** Invalid timing data အတွက် deterministic diagnostics ရှိရမည်။ Raster output တွင် rows မပျောက်ရ/မထပ်ရ။

---

### Part H — Runtime config validation

- [ ] `resolveConfig()` က JavaScript caller များမှလာသော enum/numeric ranges နှင့် unknown override များကို runtime validation/diagnostics ဖြင့် ကိုင်တွယ်ပါ။ Invalid value ကို တိတ်တဆိတ် လက်မခံရ။

**ပြီးစီးမှုစံ:** Invalid config behavior အဓိပ္ပာယ်ရှင်းလင်းပြီး diagnostic ဖြင့် သတိပေးရမည်။

---

### Part I — Release / maintenance

- [ ] Engine ကို internal-only ဆက်ထားမည်လား publishable package လုပ်မည်လား ဆုံးဖြတ်ပြီးမှ `version`, export contract, license/attribution, release checklist ကို တစ်ပြိုင်နက်တည်းပြင်ပါ။
- [ ] Root license ဖိုင်နှင့် third-party asset (Bravura font, SoundFont) attribution ကို ရှင်းလင်းစွာ မှတ်တမ်းတင်ပါ။
- [x] Plugin framework ကို concrete integration request မရှိမချင်း မတည်ဆောက်ရ။ လက်ရှိ extensibility သည် typed config နှင့် exported functions များမှတစ်ဆင့် ဖြစ်သည်။

---

## လုပ်ဆောင်မှုအစဉ်

အကြံပြုထားသောအစဉ်မှာ **C → A → B → D → F → G → H → E → I** ဖြစ်သည်။ Part C (MuseScore-derived အားလုံး ဖယ်ရှားခြင်း) ကို အရင်ပြီးအောင်လုပ်ပြီး clean provenance baseline တစ်ခုရမှ ကျန်အလုပ်များကို ယုံကြည်စိတ်ချစွာ ဆက်လုပ်နိုင်မည်။

---

## သမိုင်းမှတ်တမ်း (အကိုးအကား)

### MuseScore provenance remediation — 2026-11-18

The audit left one concrete risk: the engine shipped `src/musescore/`, a copy of a GPL-3.0-only program's tables, and several engine defaults read from it. That folder is deleted, and the engine answers from its own `src/notation-defaults/` data layer.

- [x] Build `src/notation-defaults/` as the engine's own data layer (clefs, staff positions, notehead groups, GM drum kit, string/tab data, engraving style, spacing law, segment stretch), each table carrying a `DefaultsSource`.
- [x] Correct engraving measurements to the bundled Bravura font's own `engravingDefaults`.
- [x] Rewire the engine (`drums/drum-map.ts`, `layout/spacing.ts`, `config/config.ts`, `index.ts`) to read `notation-defaults`.
- [x] Rename the shipped spacing law from `'musescore'` to `'power'`.
- [x] Express the drum kit's heads in the engine's own shape-family vocabulary.
- [x] Delete `src/musescore/` and stop exporting the `MuseScore` namespace.
- [x] Replace the two MuseScore-comparison test files with `notation-data.test.js` and `engraving-parity.test.js`.
- [x] Add `test/unit/editor-integration.test.js` (drives the Notation Lab editor against the built engine in jsdom).
- [x] Retire the MuseScore-derived provenance comments in `src/` (comment-only pass, no value change): engine defaults are now named as the house style or the public spec they come from.

**What is deliberately kept:** the audited upstream repository remains a pinned reference *only* — links and behaviour notes, no copied source. Exporter-provenance references (a fixture another program exported, a format's own element) stay, because they are cross-software facts, not engine provenance.

### R2 SoundFont integration milestone — 2026-11-13

- [x] Notation playback event များတွင် `midiNotes` နှင့် `durationTicks` ထည့်ပြီး Sound Engine scheduling အတွက် typed data ပေးရန်။
- [x] R2 `soundfonts/manifest.json` ကို fetch/cache လုပ်ပြီး versioned SoundFont object path မှ `.sf2/.sf3` တစ်ကြိမ် load လုပ်ရန်။
- [x] SpessaSynth AudioWorklet ဖြင့် SoundFont ကို WebAudio output သို့ချိတ်ပြီး Notation Lab play/pause/volume lifecycle နှင့် ချိတ်ရန်။
- [ ] Unpitched percussion mapping နှင့် MusicXML instrument program/bank routing ကို ထပ်တိုးရန်။

**Completion criterion (Part C):** the engine must have no build-time dependency on GPL-3.0-only source or tables, and every remaining default must name the public specification it comes from. `npm run verify` must be green. Both hold: 1163/1163 tests pass, and no engine module imports a MuseScore file.
