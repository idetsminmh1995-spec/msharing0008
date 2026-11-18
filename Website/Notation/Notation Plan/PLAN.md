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
- Verify: `npm run verify` (typecheck + lint + format:check + build + API doc + fixture matrix + tests) သည် **1286/1286 pass**။

---

## လုပ်ဆောင်ရန် အပိုင်းများ (work parts)

### Part A — Build / docs path ကို deploy structure နှင့် အပြီးသတ်ချိတ်ဆက်ရန်

- [x] `sync-website-bundle.mjs` ၏ destination ကို `Website/Website/assets/` အဖြစ် ပြင်ပြီးဖြစ်သည် (ယခင် plan ရဲ့ lowercase `Website/website` မှတ်ချက်သည် stale ဖြစ်သည်)။ `test/unit/website-bundle.test.js` က bundle hash နှင့် cache key ကို စစ်သည်။
- [x] `generate-api-docs.mjs` ၏ output ကို `Notation/Notation Plan/Documentation/API.md` အဖြစ် ရောက်နေပြီ။ `npm run docs:check` က up-to-date ကို စစ်သည်။
- [x] CI workflow `.github/workflows/notation-engine.yml` ထည့်ပြီးဖြစ်သည်: `npm ci` → Chromium install (visual check run ဖြစ်စေရန်) → `npm run verify`။ Browser test သည် Chromium မရှိလျှင် skip ဖြစ်ကြောင်း suite က ရှိပြီးသား (browser.test.js)။
- [x] Clean environment တွင် `npm ci` → `typecheck` → `lint` → `format:check` → `docs:check` → `test` ကို အစဉ်လိုက် run ပြီး failure တစ်ခုချင်းကို မှတ်တမ်းတင်ပါ။ 2026-11-18 တွင် `node_modules` ဖျက်၍ `npm ci` (140 packages, 39s) မှစပြီး အစဉ်လိုက် run သည်: `typecheck` ✓, `lint` ✓, `format:check` ✓ (`All matched files use Prettier code style`), `docs:check` ✓ (`API.md is up to date (775 symbols)`), `test` ✓ (**1284/1284 pass**; browser visual check သည် local Chromium ဖြင့် run ဖြစ်သည်)။ Run အပြီး `git status` သည် ပြောင်းလဲမှု မရှိ -- clean build သည် bundle ကို byte-identical ပြန်ထုတ်သည်။

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
- [x] **Generated doc မှ တကယ့် leak တစ်ခု ဖမ်းမိသည် (2026-11-18):** `src/musescore/` ကို ဖျက်ခဲ့သော်လည်း `tsc --emitDeclarationOnly` က ဖျက်လိုက်သော module ၏ `.d.ts` ကို `dist/` ထဲမှ မရှင်းလင်းသဖြင့် `dist/musescore/*.d.ts` (stale, gitignored) ကျန်ခဲ့သည်။ `scripts/generate-api-docs.mjs` က `dist/` တစ်ခုလုံးကို ဖတ်သဖြင့် `Documentation/API.md` ထဲသို့ MuseScore module ၁၁ ခု (52 ကြောင်း, "775 symbols") ဝင်သွားသည် -- Part C နှင့် တိုက်ရိုက်ဆန့်ကျင်သည်။ Fresh checkout (dist/ ရှင်းပြီး) တွင် `docs:check` က **fail** ဖြစ်သည် (committed API.md က polluted tree မှ generate ဖြစ်ခဲ့သည်)။ ပြင်ဆင်ပြီး: generator က `src/` ထဲ source မရှိတော့သော module ကို ချန်လှပ်သည်; stale `dist/musescore/` ကို ဖျက်သည်; API.md ကို ပြန်ထုတ်သည် (725 symbols, MuseScore ၀ ကြောင်း); `docs:check` ယခု green။

**ပြီးစီးမှုစံ:** Engine `src/` ထဲတွင် third-party notation program ၏ data/provenance လုံးဝမရှိ။ ကျန်သော တစ်ခုတည်းသော ရည်ညွှန်းချက်က host asset id ဖြစ်ပြီး၊ ယင်းကို host manifest က ပိုင်ဆိုင်ကြောင်း ရှင်းလင်းထားရမည်။

---

### Part D — Import compatibility နှင့် MIDI scope

- [x] Instrument transposition (`<transpose>`): parser က `TransposeSpec.semitones` (chromatic + octave-change × 12) ကို measure state တွင် သယ်ပြီး playback (`buildEventStream`) နှင့် MIDI alignment (`flattenPartNotes`) က sounding pitch ကို သုံးသည်။ ရေးထားသော notation (SVG) သည် written pitch အတိုင်း ဆဲလျက် ရှိသည် -- `<transpose>` ဖြုတ်လိုက်လျှင် SVG byte-identical ဖြစ်ကြောင်း `test/unit/transposition.test.js` က အတည်ပြုသည် (`transposing-bb-clarinet.musicxml` fixture)။

- [x] MusicXML partwise/timewise, MXL, changing attributes/divisions, voices/chords/rests, unpitched percussion, lyrics/directions/harmony behavior များကို fixture matrix ဖြင့် ထိန်းထားသည်။ `scripts/generate-fixture-matrix.mjs` က `test/fixtures/` မှ `Documentation/MusicXML-Fixture-Matrix.md` ကို **generate** လုပ်သည် (API.md နည်းတူ) -- behavior တစ်ခုချင်းကို XML မှ တိုက်ရိုက်ဖတ်သဖြင့် fixture တစ်ခုက မပါဝင်တဲ့ behavior ကို claim လုပ်လို့မရ၊ provenance ကို ဖိုင်၏ `<software>` မှ ဖတ်သည်။ `npm run fixtures:check` သည် `npm run verify` တွင် ပါပြီး matrix ကို corpus နှင့် drift မဖြစ်စေရ။ `test/unit/fixture-corpus.test.js` က test တစ်ခုမှ မဖတ်သော orphan fixture ကို fail စေသည်။ Matrix က တိုးလာလို့ တွေ့ရှိသည်မှာ -- ရှိပြီးသား 59 fixtures အားလုံးကို test တစ်ခုမှ ဖတ်သည်; တကယ့် third-party export သည် MuseScore တစ်ခုတည်း; `cross-software/` fixtures များသည် documented divergence များကို လက်ဖြင့် ပြန်ဖန်တီးထားသည် (မဟုတ်လျှင် အခြား program များမှ real export များ ထပ်ထည့်ရန် လိုသည်)။
- [x] Harmony၊ unusual notation၊ instrument transposition၊ malformed note/chord နှင့် multiple-staff cases အတွက် diagnostic/recovery tests တိုးချဲ့ပါ။ `test/unit/parser-recovery.test.js` သည် case တစ်ခုချင်းကို တူညီသောစည်းဖြင့် စစ်သည် -- (1) throw မလုပ်ရ, (2) ကိုယ်ပိုင် stable code ထုတ်ရမည်, (3) ကောင်းသော note များ ကျန်ရမည် (မပျောက်ရ)။ Harmony (`UNSUPPORTED_HARMONY_FEATURE`), numeral/degree forms, malformed `<note>`/chord (`UNSUPPORTED_NOTE`, `INVALID_CHORD`), transposition + mid-score clef change, grand-staff/staff-out-of-range, unknown `<notehead>`, clamped `<tremolo>` အားလုံး ပါဝင်သည်။
- [x] `parseMidiFile()` သည် MIDI event/meta reader အဖြစ်သာ ဆက်ရှိမည်ဟု ဆုံးဖြတ်ပြီးဖြစ်သည်; `MidiFile` (note list + tempo/time/key timeline) ပြန်သည်, `Score` မဟုတ်ပါ။ MIDI တွင် staff spelling/voice/beaming/clef data မပါသဖြင့် `midiFileToScore()`/`renderFromMidi()` ကို တမင်ဖန်တီးမထားပါ -- MIDI→notation policy သည် host ၏တာဝန်။ Format 0/1 ကိုသာ ပံ့ပိုးပြီး format 2/SMPTE ကို diagnostic ဖြင့် reject လုပ်သည်။ Boundary ကို root `README.md` ၏ "MIDI scope" အပိုင်းတွင် user-facing docs အဖြစ် ရေးပြီးဖြစ်သည်။

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
1. `[x]` `GenericPitchedMapping`, `InstrumentProfile`, shared input/context/result types, `MappingRegistry` နှင့် precedence ကို `src/mapping/` (`types.ts`, `generic.ts`, `percussion.ts`, `registry.ts`, `index.ts`) တွင် သတ်မှတ်ပြီး contract/type-level tests ရေးပါ။ `MappingSource` သည် precedence tier တစ်ခုချင်းကို ဖော်ပြသည်: `explicit-file` → `user-override` → `instrument-profile` → `fallback`။
2. `[x]` Instrument-specific map မရှိသော part များအပါအဝင် ပုံမှန် pitched instrument အားလုံးကို generic mapping ဖြင့် render လုပ်နိုင်ကြောင်း စစ်ပါ။ `GENERIC_PITCHED_PROFILE` သည် registry တွင် အမြဲနောက်ဆုံး tier ဖြစ်ပြီး note တစ်ခုကိုမျှ မပယ်ချပါ။
3. `[x]` Piano/grand staff, transposition/octave transposition, strings/tablature, pitched/unpitched percussion အတွက် profile/module တိုးချဲ့ပါ။ Unpitched percussion ကို `percussion.ts` (`UNPITCHED_PERCUSSION_PROFILE`) အဖြစ် ခွဲထုတ်ပြီး; ကျန် instrument များ (clef-driven position) ကို generic profile က ကိုင်တွယ်သည်။
4. `[x]` Orchestra/ensemble fixtures ဖြင့် multi-part, multi-staff, multi-voice, transposing instruments, part names/order, vertical/system layout ကို စမ်းသပ်ပါ။ ရှိပြီးသား `cross-software-corpus` နှင့် snapshot fixtures များ အားလုံး မပြောင်းဘဲ pass ဖြစ်သည်။ Group brackets/barlines နှင့် automatic condensing ကို Part E ၏ ပြင်ပ scope အဖြစ် ချန်ထားသည် (rendered output ကို မထိပါ)။
5. `[x]` `MappingProfile` customization/persistence (`profile.ts`), diagnostics နှင့် renderer bridge (`resolveNoteRendering`, `render-from-musicxml.ts`) ကို ချိတ်ဆက်ပါ။ Precedence: explicit MusicXML display/notehead/stem → user override → instrument profile → documented fallback + diagnostic။ Mapping က sounding pitch/playback ကို မပြောင်းရ။ Renderer ၏ drum-lookup diagnostic pass သည် `drumLookupDiagnostics()` ကို ဖြတ်သုံးသဖြင့် rule သည် mapping layer ထဲတွင်တစ်ခုတည်းရှိသည်; profile တစ်ခု throw လျှင် `MAPPING_PROFILE_FAILED` diagnostic ဖြင့် generic answer သို့ ဆုတ်သည်။ Bridge သည် byte-identical output ထုတ်သည် -- ရှိပြီးသား visual-regression snapshots အားလုံး (1238 tests) မပြောင်းဘဲ pass ဖြစ်သည်။

**ပြီးစီးမှုစံ:** Profile စာရင်းမပါသော instrument ပါဝင် valid note များ မပျောက်ဘဲ render ဖြစ်ရမည်။ Mapping သည် source MusicXML data, rhythm, sounding pitch, playback ကို မပြောင်းရ။

---

### Part F — Staff/tablature layout လိုက်လျောညီထွေမှု

- [x] `computeStaffGeometry()` က line count အမျိုးမျိုးကို တွက်နိုင်သော်လည်း `render-from-musicxml.ts` တွင် `STAFF_LINES = 5` assumptions ကျန်နေသည်။ Arbitrary staff-line count ကို import → geometry → note placement → SVG အဆုံးအထိ audit လုပ်ပြီး 1–6+ line fixtures ဖြင့် test ပါ။ `RenderCtx` တွင် staff ၏ ကိုယ်ပိုင် line count ကို သယ်ဆောင်ပြီး renderer helper အားလုံး (notehead/ledger/stem/rest/bar-number) က ၎င်းကို ဖတ်သည်; system-level reserves (`aboveStaff` headroom, `systemBottomRoom`, `fitSystemHeight`) ကလည်း တကယ့် staff အမြင့်ကို သုံးသည်။ `test/unit/staff-line-count.test.js` က 1–6 line staves အတွက် lines/ledger/stem direction/rest/tab-cleft ကို စစ်ပြီး 5-line output မပြောင်းကြောင်း အတည်ပြုသည်။
- [x] TAB clef/staff ကို end-to-end စစ်ပါ။ Code comments ထဲရှိ "tab staff not yet draw" သတိပေးချက်များနှင့် fixed-five-line assumptions ကို ဖြေရှင်းပါ။ Tab note placement သည် staff ၏ `<staff-lines>` ကို သုံးပြီးဖြစ်သည်; tab clef glyph `glyphY` ကို staff ၏ line distance (tab အတွက် 1.5) ဖြင့် scale လုပ်ပြီး staff centre ပေါ်တွင် တိကျစွာ ချထားသည် (ယခင် 1.25 units နိမ့်နေသည်)။ ခေတ်မမီတော့သော comment ကို ပြင်ဆင်ပြီး snapshot နှစ်ခုကို ရည်ရွယ်ချက်ရှိရှိ update လုပ်သည်။
- [x] Page-mode dimension change အတွက် resize/reflow ကို public flow အဖြစ် ဆုံးဖြတ်ပါ။ Pure scaling နှင့် page repagination ကို ခွဲဖော်ပြပြီး မတူညီသော system height ရှိ page တွင် clipping/overlap မဖြစ်စေရန် tests ထည့်ပါ။ `resize.ts` တွင် `planResize()` (public re-flow decision) နှင့် `pageUsableWidth`/`pageUsableHeight` ထည့်ပြီး pure-scale (`resizePureScale`, O(1)) နှင့် re-flow (cached `Score` မှ ပြန်ဆွဲ) ကို ခွဲထားသည်။ `page.ts` သည် `PageSystem.height`/`Page.height`/`PageLayout.totalHeight` ကို သယ်ဆောင်ပြီး system တစ်ခုသည် usable height ထက် မြင့်လျှင် page ကို ချဲ့သည် (မဟုတ်လျှင် နောက် page ပေါ် ထပ်/ဖြတ်မည်)။ Renderer က page များကို တကယ့်အမြင့်ဖြင့် ဆင့်၍ viewBox ကို `totalHeight` ဖြင့် တွက်သည်။ `page-layout.test.js`/`page-layout-wiring.test.js` (clip/overlap end-to-end)/`resize.test.js` တွင် tests ထည့်ပြီး; ပုံမှန် page output မပြောင်း (snapshots)။
- [x] Bravura metrics အခြေခံ custom music-font setting အတွက် compatible-font limitation ကို ဖော်ပြပါ၊ သို့မဟုတ် metrics provider ကို abstraction လုပ်ပါ။ `config.fonts.musicFont` ကို bundled `Bravura` မှ ကွဲပြားစွာ set လျှင် renderer က `MUSIC_FONT_METRICS` warning ထုတ်ပြီး glyph geometry သည် Bravura metrics မှ ဆဲလျက် ရှိကြောင်း ရှင်းလင်းစွာ ဖော်ပြသည် (metrics provider abstraction အစား limitation ကို diagnostic + doc ဖြင့် ဖော်ပြခြင်း)။

**ပြီးစီးမှုစံ:** ကြေညာထားသော configuration အားလုံးအတွက် staff/tablature layout ကို snapshot + integration tests ဖြင့် အတည်ပြုထားရမည်။

---

### Part G — Timing, playback နှင့် export correctness

- [x] `buildTempoMap()` တွင် non-finite/zero/negative tempo အတွက် validation/diagnostics ထည့်ပြီးဖြစ်သည် (`INVALID_TEMPO_EVENT`)။ Bad event ကို drop လုပ်ပြီး ကျန် map ကို ဆက်သုံးသည်။ Test က conversion ရလဒ် finite/non-decreasing ဖြစ်ကြောင်း စစ်သည်။
- [x] Playhead interpolation တွင် nominal time signature မဟုတ်ဘဲ pickup, shortened, overfull measure များ၏ actual tick length ကို `PlaybackData` ထဲ သယ်ဆောင်သုံးပါ။ Boundary နှင့် monotonicity tests ထည့်ပါ။ `PlaybackData.measureTicksByNumber` က measure တစ်ခုချင်း၏ တကယ့် content length ကို သယ်ဆောင်သည်; `playheadX` က ၎င်းအပေါ် interpolate လုပ်သည်။ `pickup-measure.musicxml` fixture နှင့် boundary/monotonicity tests ထည့်ပြီးဖြစ်သည်။
- [x] `rasterizeSvg()` ၏ rounded slice height ကြောင့် source row ပျောက်ခြင်းကို ဖြေရှင်းပြီးဖြစ်သည် -- slice boundary များကို floor division ဖြင့် တွက်သည်။ 40px/3 slices ကဲ့သို့ remainder အတွက် regression test ရှိသည်။
- [x] `exportPng()` က first slice ကိုသာပြန်ခြင်း၊ PDF က raster-image based ဖြစ်ခြင်း၊ rasterization အတွက် browser/host backend လိုခြင်းတို့ကို root `README.md` တွင် ဖော်ပြပြီးဖြစ်သည်။
- [x] Alignment, repeat expansion နှင့် raster/PDF encoding အတွက် representative performance budget များထည့်ပြီးဖြစ်သည် (`test/perf/budget.test.js`)။ `alignNotes()` ၏ tier 1/2 သည် ယခင် quadratic ဖြစ်ခဲ့သည် -- ယခု tick/pitch index ဖြင့် linear ဖြစ်သည် (random 4000 case ဖြင့် ရလဒ်တူကြောင်း အတည်ပြုပြီး)။

**ပြီးစီးမှုစံ:** Invalid timing data အတွက် deterministic diagnostics ရှိရမည်။ Raster output တွင် rows မပျောက်ရ/မထပ်ရ။

---

### Part H — Runtime config validation

- [x] `resolveConfigWithDiagnostics()` ထည့်ပြီးဖြစ်သည်: JavaScript caller များမှလာသော out-of-range numeric (`INVALID_CONFIG_VALUE`), unknown enum (`UNKNOWN_CONFIG_VALUE`), နှင့် mistyped/unknown field (`UNKNOWN_CONFIG_FIELD`) များကို diagnostic အဖြစ် ပြန်သည်။ Renderer သည် ၎င်းတို့ကို score-file diagnostic များနှင့် တူညီသော `diagnostics` channel ထဲ ထည့်သည် -- throw မလုပ်ပါ။ Invalid value ကို တိတ်တဆိတ် လက်မခံပါ။

**ပြီးစီးမှုစံ:** Invalid config behavior အဓိပ္ပာယ်ရှင်းလင်းပြီး diagnostic ဖြင့် သတိပေးရမည်။

---

### Part I — Release / maintenance

- [x] **Internal-only (decided).** The engine stays internal: `package.json` is `private`, version `0.0.0`, never published. So there is no outbound LICENSE file -- a license grants rights to someone receiving the work, and there is no such recipient. The extensibility contract stays what it is: typed `EngineConfig` plus exported functions. "Release" means rebuild the bundle and commit it (the static site has no build step), which the existing `npm run verify` + `sync-website-bundle.mjs` flow already covers.
- [x] Root attribution: there is no root license to add, but the third-party components that ARE redistributed are recorded in `Website/Notation/Notation Engine/THIRD-PARTY-NOTICES.md` (fflate MIT, spessasynth_lib Apache-2.0, Bravura OFL 1.1). The Bravura OFL notice now travels with the font: `scripts/sync-website-bundle.mjs` copies `dist/fonts/LICENSE.md` next to the served font, and `test/unit/website-bundle.test.js` guards it. The SoundFonts are host assets in R2, not redistributed here, and are documented in `../Sound Plan/README.md` and `../Sound Doc/`.
- [x] Plugin framework ကို concrete integration request မရှိမချင်း မတည်ဆောက်ရ။ လက်ရှိ extensibility သည် typed config နှင့် exported functions များမှတစ်ဆင့် ဖြစ်သည်။

---

### Part J — SoundFont asset များကို ပရောဂျက်ကိုယ်ပိုင်အဖြစ် ပြောင်းရန်

**နောက်ခံ:** Sound Engine သည် SoundFont ကို R2 မှ runtime တွင် fetch လုပ်သည် (repo ထဲ မဖြန့်ဖြဲ့)။ ဒါပေမယ့် engine ၏ `src/soundfont/browser.ts` (`DEFAULT_ASSET_PATHS`) နှင့် app ၏ `Website/Website/notation-editor.js` (`assetId`) တို့တွင် third-party အမည် (`musescore-general-*`) ပါနေသည်။ Part C ၏ "engine ကိုယ်ပိုင်" မူနှင့် တစ်သမတ်တည်း ဖြစ်စေရန် asset အမည်များကို ပရောဂျက်ကိုယ်ပိုင် id သို့ ပြောင်းသည်။

**လမ်းကြောင်း နှစ်ဆင့် (ဆုံးဖြတ်ပြီး):** (ဂ) အရင် → ပြီးမှ (ခ)။

**R2 path ဆုံးဖြတ်ချက် (ဆုံးဖြတ်ပြီး):** asset **id** သာမက R2 object **path/prefix** ကိုပါ neutral အမည်သို့ ပြောင်းမည် (`soundfonts/ms-core/v0.2/...`)။ သို့သော် **ချက်ချင်း မပြောင်းသေးပါ** — SoundFont အားလုံး (default + fallback များ) browser playback တွင် အသံ တကယ်ထွက်/မထွက် စမ်းသပ်အတည်ပြုပြီးမှ ပြောင်းမည်။ စမ်းသပ်မှု မပြီးခင် rename လုပ်လျှင် ဘယ် asset မှန်လဲ ဆိုတာ ခွဲခြားရ ခက်မည်။

#### R2 public URL (ရပြီး)

- Base URL: `https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev`
- Manifest: `<base>/soundfonts/manifest.json` → **200 OK**, `application/json`, `Cache-Control: no-cache` ✓
- Assets ၆ ခုလုံး range request ဖြင့် စစ်ပြီး → 206 ✓ (`musescore-general-sf3/sf2`, `ms-basic`, `generaluser-gs`, `fluidr3-gm`, `salamander-grand-piano`)
- Manifest ရဲ့ `runtime.defaultAssetId` မှာ `musescore-general-sf3` ဖြစ်သည် (Part J rename လုပ်ရမည့်အရာ)။

**Blocker — CORS မရှိသေး:** `<base>/soundfonts/manifest.json` ကို `Origin` header ဖြင့် GET လုပ်ကြည့်ရာ `Access-Control-Allow-Origin` header **မပါ**၊ OPTIONS preflight က **403**။ ဆိုတော့ browser က အခြား origin မှ fetch လုပ်လျှင် response ကို block လုပ်မည် — engine ၏ `fetch()` က manifest ကို ဖတ်လို့ ရမည် မဟုတ်။ **R2 bucket ပေါ်တွင် CORS policy သတ်မှတ်ရမည်** (Cloudflare Dashboard → R2 → bucket → Settings → CORS Policy)။

**အခြား မှတ်ချက်များ:**
- `salamander-grand-piano` SF2 သည် **1.26 GB** ဖြစ်ပြီး engine ၏ `decodedSampleBudget` (512 MB) ကို ကျော်သည် — optional asset အဖြစ်သာ စမ်းရန်။
- `r2.dev` သည် Cloudflare ၏ development/testing အတွက်သာ (rate-limited) — production အတွက် custom domain ချိတ်ရန်။

#### အသံစမ်းသပ်မှု (rename မလုပ်မီ လိုအပ်ချက်)

- [ ] R2 bucket ပေါ်တွင် CORS policy သတ်မှတ် (မရှိရင် browser fetch မလုပ်နိုင်)။
- [ ] Default asset (`ms-core-sf3` ဖြစ်လာမည့် MuseScore General SF3) ကို browser တွင် တကယ် play စမ်းပြီး အသံထွက် အတည်ပြု။
- [ ] Fallback asset များ (`ms-basic`, `generaluser-gs`, `fluidr3-gm`, `salamander-grand-piano`) တစ်ခုချင်း load/play စမ်း။
- [ ] Manifest fetch → asset download → SpessaSynth load → noteOn/noteOff အဆင့်ဆင့် အလုပ်လုပ် အတည်ပြု။
- **မှတ်ချက်:** လက်ရှိ app တွင် SoundFont အသံစမ်းသည့် စာမျက်နှာ မရှိသေးပါ (`notation-editor.html` ရဲ့ Play button သာ ရှိသည်)။ စမ်းသပ်ရန် R2 public CDN URL သို့မဟုတ် signed-URL config လည်း မရှိသေးပါ (`Sound Doc/SoundFont-Collection-R2.md` အရ public access မဖွင့်ရသေး)။ ဆိုတော့ ဒီအဆင့်ကို မစမီ R2 URL config ကို အရင် ဖြေရှင်းရမည်။

#### အဆင့် ၁ — (ဂ) Asset id နှင့် R2 path ကို ကိုယ်ပိုင်အမည် ပြောင်းခြင်း

လက်ရှိ sound source ဖြစ်သော MuseScore General သည် **MIT** ဖြစ်ပြီးသား (လိုင်စင် သန့်ရှင်း)။ ဒါကြောင့် ဖိုင်ကို မပြောင်းဘဲ **app-facing asset id နှင့် R2 object path ကိုသာ** ပရောဂျက်ကိုယ်ပိုင်အမည်သို့ ပြောင်းသည်။ (binary ဖိုင်အမည်များ ဖြစ်သည့် `MuseScore_General.sf3` ကို R2 object key ထဲ ဆက်ထားနိုင်သည်၊ သို့မဟုတ် `ms-core.sf3` သို့ပါ ပြောင်းနိုင်သည် — ရွေးချယ်ရန်။)

**ပြောင်းရမည့်အရာ အားလုံး (repo-side):**

- [ ] `Website/Notation/Notation Engine/src/soundfont/browser.ts` ရဲ့ `DEFAULT_ASSET_PATHS` (line 55–63):
  - key `'musescore-general-sf3'` → `'ms-core-sf3'`; `'musescore-general-sf2'` → `'ms-core-sf2'`
  - value (R2 path) → neutral prefix (`'musescore-general/v0.2/...'` → `'ms-core/v0.2/...'`)
  - အခြား key များ (`ms-basic`, `generaluser-gs`, `fluidr3-gm`, `salamander-grand-piano`) ကို လိုအပ်သလို neutral လုပ်/ထား
- [ ] `Website/Website/notation-editor.js` (line 805): `assetId: 'musescore-general-sf3'` → `'ms-core-sf3'`
- [ ] `Website/Website/notation-editor.js` (line 2, line 618) နှင့် `Website/Website/notation-doc.js` (line 6): `MuseScore` ကို ရည်ညွှန်းသော comment များကို neutral စကားလုံး ("semantic score editing") သို့ ပြောင်း (branding သာ၊ လိုင်စင် မသက်ဆိုင်)
- [ ] `Website/Notation/Notation Engine/test/unit/own-provenance.test.js`: `HOST_ASSET_FILE` exemption နှင့် `/['"][^'"]*musescore[^'"]*['"]/i` pattern ကို — rename ပြီးနောက် `src/` ထဲ MuseScore mention လုံးဝ မကျန်တော့သဖြင့် ဒီ exemption/pattern ကို **ဖျက်/ရှင်းနိုင်**သည် (သို့မဟုတ် `ms-core` အမည်အသစ်အတွက် ချိန်)
- [ ] `npm run build` (bundle ကို `Website/Website/assets/` သို့ copy) ပြီး `npm run verify` green ဖြစ်စေ

**ပြောင်းရမည့်အရာ အားလုံး (R2-side — repo ပြင်ပ၊ လက်ဖြင့်):**

- [ ] R2 object များကို neutral prefix အောက် ပြန် upload/rename (`soundfonts/ms-core/v0.2/...`)
- [ ] `soundfonts/manifest.json` ထဲ asset `id` နှင့် `path` များ update (manifest သည် authoritative)။ **Backward-compat:** id အဟောင်းအတွက် alias entry ထားနိုင် (R2 object တူတူကို ညွှန်း၍)
- [ ] `Sound Doc/SoundFont-Collection-R2.md` နှင့် `Sound Doc/MuseScore-General-R2-Asset.md` ရဲ့ R2 object layout/path မှတ်တမ်းများကို အသစ်နှင့် ကိုက်ညီအောင် update
- [ ] Rename ပြီးနောက် browser playback ကို ထပ်မံ စမ်းသပ် (URL ပြောင်းသဖြင့် cache key လည်း ပြောင်း)

#### အဆင့် ၂ — (ခ) ကိုယ်ပိုင်/CC0 sample မှ house SoundFont ဖန်တီးခြင်း

- [ ] Sample source ရွေး: (က) ကိုယ်တိုင် record, သို့မဟုတ် (ခ) **CC0/Public Domain** library စုစည်း (CC-BY/CC-BY-NC ရှောင်)။
- [ ] Polyphone (GUI) သို့မဟုတ် sf2utils (library) ဖြင့် SF2 ဖန်တီး — piano + drum kit ကို ဦးစားပေး။
- [ ] SF2 ကို R2 `soundfonts/<ကိုယ်ပိုင်-prefix>/vX/` သို့ upload; `manifest.json` ထဲ asset ထည့်။
- [ ] Asset id ကို အဆင့် ၁ id အတိုင်း ထား (engine/app ပြင်ရန် မလို)။
- [ ] Sample တစ်ခုချင်း၏ လိုင်စင်/မူလအရင်းအမြစ်/checksum ကို `Sound Doc/` တွင် မှတ်တမ်းတင်ရန်။
- [ ] Browser end-to-end playback စမ်းသပ်။

**MS Basic လိုင်စင် ပြဿနာ:** `MS Basic.sf3` ၏ upstream license file တွင် MuseScore General အမည်အဟောင်း ရှိနေသဖြင့် R2 public/commercial redistribution မလုပ်မီ rightsholder အတည်ပြုချက် ရယူရန် သို့မဟုတ် collection မှ ဖယ်ရန် လိုသည်။ အဆင့် ၁ နှင့် ၂ ပြီးပါက default asset မှာ ကိုယ်ပိုင်ဖြစ်သဖြင့် MS Basic သည် optional comparison asset သာဖြစ်လာမည်။

**ပြီးစီးမှုစံ:** engine/app ၏ ဖိုင်များတွင် third-party SoundFont အမည် မရှိတော့။ `npm run verify` green။ Default playback asset သည် ကိုယ်ပိုင် id ဖြင့် ချိတ်ဆက်ပြီး browser playback အလုပ်လုပ်။

---

## လုပ်ဆောင်မှုအစဉ်

အကြံပြုထားသောအစဉ်မှာ **C → A → B → D → F → G → H → E → I → J** ဖြစ်သည်။ Part C (MuseScore-derived အားလုံး ဖယ်ရှားခြင်း) ကို အရင်ပြီးအောင်လုပ်ပြီး clean provenance baseline တစ်ခုရမှ ကျန်အလုပ်များကို ယုံကြည်စိတ်ချစွာ ဆက်လုပ်နိုင်မည်။

---

## သမိုင်းမှတ်တမ်း (အကိုးအကား)

### Part J decision — soundfont asset ownership, deferred behind a sound-check — 2026-11-18

- ဆုံးဖြတ်ချက်: (ဂ) asset **id** နှင့် R2 **path** ကို ကိုယ်ပိုင်အမည်သို့ ပြောင်းမည်; ပြီးမှ (ခ) ကိုယ်ပိုင်/CC0 sample မှ house SoundFont ဖန်တီးမည်။
- **အခု မပြောင်းသေး:** SoundFont အားလုံး browser playback တွင် အသံ တကယ်ထွက်ကြောင်း စမ်းပြီးမှ ပြောင်းမည်။
- Rename လုပ်ရမည့်အရာ အားလုံးကို Part J တွင် repo-side (file:line အပါ) နှင့် R2-side ဟူ၍ မှတ်ထားသည်။
- Blocker: လက်ရှိ app တွင် SoundFont အသံစမ်းစာမျက်နှာ မရှိ၊ R2 public CDN/signed URL config လည်း မရှိသေး — စမ်းသပ်မှုမစမီ ဒါကို ဖြေရှင်းရမည်။

### Clean-environment verify + generated fixture matrix (Parts A and D) — 2026-11-18

Part A's last open item and Part D's fixture-matrix item, both closed.

- [x] **Clean-environment verify (Part A).** `node_modules` ကို ဖျက်ပြီး `npm ci` (140 packages) မှစ၍ `typecheck` → `lint` → `format:check` → `docs:check` → `test` ကို အစဉ်လိုက် run သည် -- အားလုံး ✓, 1284/1284 pass, run အပြီး working tree မပြောင်း (clean build က bundle ကို byte-identical ပြန်ထုတ်)။
- [x] **Fixture matrix (Part D).** `scripts/generate-fixture-matrix.mjs` က `test/fixtures/` မှ `Documentation/MusicXML-Fixture-Matrix.md` ကို generate လုပ်သည်; `npm run fixtures:check` သည် `npm run verify` တွင် ပါသည်။ Behavior တစ်ခုချင်းကို XML မှ ဖတ်သဖြင့် fixture တစ်ခုက မပါဝင်တဲ့ behavior ကို claim လုပ်လို့မရ; provenance ကို ဖိုင်၏ `<software>` မှ ဖတ်သည်။ `test/unit/fixture-corpus.test.js` က test တစ်ခုမှ မဖတ်သော fixture ကို fail စေသည်။
- [x] **တွေ့ရှိချက်:** 59 fixtures အားလုံးကို test ဖတ်ပြီး; တကယ့် third-party export သည် MuseScore တစ်ခုတည်း။ `cross-software/` corpus သည် documented divergence များကို လက်ဖြင့် ပြန်ဖန်တီးထားခြင်း -- အခြား program များမှ real export ထပ်ထည့်လိုပါက matrix က အလိုအလျောက် update ဖြစ်သည်။

### Release / attribution decision (Part I) + Bravura OFL gap — 2026-11-18

The engine stays internal-only, so there is no outbound license to write. What the review did surface was a real attribution gap and a missing record.

- [x] **Bravura OFL gap (fixed).** The site served `assets/fonts/Bravura.woff2` with no license beside it, but the SIL OFL requires the license be distributed with the font. `dist/fonts/LICENSE.md` was only an attribution note, not the OFL text; it now carries the full copyright notice and license, and `scripts/sync-website-bundle.mjs` copies it next to the font on every build. `test/unit/website-bundle.test.js` fails if the served copy goes missing or drifts.
- [x] **Third-party notices.** Added `Website/Notation/Notation Engine/THIRD-PARTY-NOTICES.md`: the bundled code (fflate MIT, spessasynth_lib Apache-2.0), the bundled font (Bravura OFL 1.1), and the R2-host SoundFonts (host assets, not redistributed here, cross-referenced to `Sound Plan/` and `Sound Doc/`).
- [x] **No outbound license, no root license file.** `package.json` stays `private` at `0.0.0`; the export contract stays typed `EngineConfig` + exported functions. README now says so and points at the notices.

### Stale-comment and dead-reference sweep — 2026-11-18

Part B's completion criterion is that no README or source comment describes an existing feature as a placeholder. An audit found the sweep had been partial: several comments still called shipped features "not yet built", and a set of cross-references pointed at a `Doc/` tree that no longer exists anywhere in the repo.

- [x] `src/layout/spacing.ts` (two comments), `src/layout/scroll.ts`, `src/geometry/barline.ts` and `src/layout/system.ts` no longer call system/page breaking, page mode or §15's skyline "not yet built"/`[TODO]`; they now name the module that carries each (`src/layout/page.ts`, `src/layout/system.ts`'s own skyline-aware variant).
- [x] Removed the dead `Doc/` references (`Doc/phase-10-clef-engine.md`, `-11-`, `-50-`, `-54-`, `Doc/STATUS.md`, `Doc/integration-i-`, `-n-`, `-o-`, `Doc/any-drum-notation.md`, `Doc/phase-08-testing-harness.md`) from `src/geometry/clef.ts`, `stem.ts`, `key-signature.ts`, `notehead.ts`, `src/render-from-musicxml.ts`, and the affected tests/READMEs. The claims they supported were kept; only the pointer to a missing file was dropped.
- [x] `test/fixtures/cross-software/print-breaks.musicxml` and its test said `<print>` breaks were ignored; page mode now forces breaks from them, so both now say so.
- [x] 1283/1283 pass.

### Cross-barline / cross-system slur continuation — 2026-11-18

The span pass resolved slurs only *within one measure*: a slur whose start and stop fell in different measures was left undrawn with an `UNMATCHED_SLUR` diagnostic, even though a slur crossing a barline is ordinary notation. Slurs now carry their start across measures the way ties already do.

- [x] A slur start that has no stop in its own measure is carried (per staff and voice) into the next measure; when its stop is reached the curve is drawn from the start note to the stop note. A within-system span is one path; a span that also crosses a system break is split at the break with the same `crossSystemHalves` helper ties use, so it is never drawn backwards.
- [x] Factored the slur-curve markup into `renderSlurCurve`, shared by the same-system and cross-system paths.
- [x] A slur stop with no start anywhere in its part, and a start that never stops in its part, still report `UNMATCHED_SLUR` rather than throwing. A stop on a staff whose own pass does not draw it (a grand-staff part's other staff) is not misreported.
- [x] Tuplets are still measure-local and still diagnose `UNMATCHED_TUPLET` across a barline; the scope difference is now stated in the pass's own doc comment.
- [x] Tests added to `slur-tuplet-wiring.test.js`: a slur across a barline (one curve, starting on measure 1), a slur across a barline AND a system break (split into two halves on two systems), and a stop with no start anywhere.

### Cross-system pedal / octave-shift continuation — 2026-11-18

The tie/hairpin/slide pass left two spans that crossed a system break *silently*: a sustain pedal span drew its whole line on the start system, running backwards off the system's left edge when the stop landed on the next system, and an octave-shift (8va/8vb) bracket vanished entirely when its start and stop landed on different systems. Neither emitted a diagnostic, so the mistake was invisible. Both now split at the break.

- [x] Factored `crossSystemSegments` out of `crossSystemHalves`: it returns the outgoing, whole-system and incoming pieces with each piece's own `systemIndex`, so a caller whose pieces draw differently (a pedal segment versus a bracket with hooks and a label) can still route every case through one place.
- [x] Pedal spans carry their start and end system; each segment is drawn on its own system's own y, forward only.
- [x] Octave-shift brackets draw one bracket (line, two hooks, label) per system the span covers.
- [x] Tests added to `page-layout-wiring.test.js`: pedal across one break and across two breaks, and an octave-shift across a break. 1280/1280 pass.

### Cross-system tie / hairpin / slide continuation — 2026-11-18

The renderer used to refuse three spans that ran off one system and back in on the next, each with a "not implemented" diagnostic: a tie (`TIE_CROSSES_SYSTEM`), a hairpin (`WEDGE_CROSSES_SYSTEM`), and a slide/glissando (`SLIDE_CROSSES_SYSTEM`). All three now split at the break the way an engraver does.

- [x] `render-from-musicxml.ts` computes each system's own horizontal span and vertical origin (`systemBounds`) once, after placement, and a shared `crossSystemHalves` helper draws the outgoing half to the start system's right edge, the incoming half from the stop system's left edge, and a whole-system span on any system between.
- [x] Ties, hairpins and slides each use that helper; a same-system span keeps drawing as one path, so existing output is byte-identical.
- [x] Retired the three diagnostics. Tests updated to assert the split (one half per system, on each system's own vertical band) instead of the old diagnostic.

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
- [x] Unpitched percussion mapping နှင့် MusicXML instrument program/bank routing ကို ထပ်တိုးရန်။ `midi-unpitched` က GM key number ဖြစ်လာပြီး unpitched note များ တကယ်မြည်ကြသည် (`buildEventStream` က `midiNotes` ထုတ်သည်)။ `<midi-program>`/`<midi-bank>`/`<midi-channel>` ကို `PlaybackTrack` တွင် သယ်ဆောင်ပြီး `assignTrackRouting()` (pure) က channel ခွဲပေးသည် -- percussion သည် GM channel 10 (index 9) အမြဲရသည်။ `INVALID_MIDI_PROGRAM`/`INVALID_MIDI_BANK`/`INVALID_MIDI_CHANNEL` diagnostic များ ထည့်ပြီး; MusicXML 1-based → MIDI 0-based ကို W3C spec အတိုင်း လျှော့သည်။ `test/unit/instrument-routing.test.js` နှင့် `test/unit/soundfont-routing.test.js` က စစ်သည်။

**Completion criterion (Part C):** the engine must have no build-time dependency on GPL-3.0-only source or tables, and every remaining default must name the public specification it comes from. `npm run verify` must be green. Both hold: 1280/1280 tests pass, and no engine module imports a MuseScore file.
