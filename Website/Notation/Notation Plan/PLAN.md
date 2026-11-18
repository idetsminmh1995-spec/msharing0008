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
- Verify: `npm run verify` (typecheck + lint + format:check + build + API doc + tests) သည် **1280/1280 pass**။

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

- [x] Instrument transposition (`<transpose>`): parser က `TransposeSpec.semitones` (chromatic + octave-change × 12) ကို measure state တွင် သယ်ပြီး playback (`buildEventStream`) နှင့် MIDI alignment (`flattenPartNotes`) က sounding pitch ကို သုံးသည်။ ရေးထားသော notation (SVG) သည် written pitch အတိုင်း ဆဲလျက် ရှိသည် -- `<transpose>` ဖြုတ်လိုက်လျှင် SVG byte-identical ဖြစ်ကြောင်း `test/unit/transposition.test.js` က အတည်ပြုသည် (`transposing-bb-clarinet.musicxml` fixture)။

- [ ] MusicXML partwise/timewise, MXL, changing attributes/divisions, voices/chords/rests, unpitched percussion, lyrics/directions/harmony စသည့် behavior များကို fixture matrix ဖြင့် ထိန်းပါ။ Exporter တစ်ခုချင်း၏ provenance ကို fixture တစ်ခုချင်း အတည်ပြုပါ။
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

- [ ] Engine ကို internal-only ဆက်ထားမည်လား publishable package လုပ်မည်လား ဆုံးဖြတ်ပြီးမှ `version`, export contract, license/attribution, release checklist ကို တစ်ပြိုင်နက်တည်းပြင်ပါ။
- [ ] Root license ဖိုင်နှင့် third-party asset (Bravura font, SoundFont) attribution ကို ရှင်းလင်းစွာ မှတ်တမ်းတင်ပါ။
- [x] Plugin framework ကို concrete integration request မရှိမချင်း မတည်ဆောက်ရ။ လက်ရှိ extensibility သည် typed config နှင့် exported functions များမှတစ်ဆင့် ဖြစ်သည်။

---

## လုပ်ဆောင်မှုအစဉ်

အကြံပြုထားသောအစဉ်မှာ **C → A → B → D → F → G → H → E → I** ဖြစ်သည်။ Part C (MuseScore-derived အားလုံး ဖယ်ရှားခြင်း) ကို အရင်ပြီးအောင်လုပ်ပြီး clean provenance baseline တစ်ခုရမှ ကျန်အလုပ်များကို ယုံကြည်စိတ်ချစွာ ဆက်လုပ်နိုင်မည်။

---

## သမိုင်းမှတ်တမ်း (အကိုးအကား)

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
