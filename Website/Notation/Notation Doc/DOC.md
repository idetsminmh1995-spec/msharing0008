# Notation Engine — Code Review နှင့် ပြီးစီးပြီးသားများ

**သုံးသပ်ရက်စွဲ:** 2026-11-13

**Source:** chat မှတင်ပေးထားသော `notation-engine.rar`
**Repository လမ်းကြောင်း:** `Website/Notation/Notation Engine/`

## ဤအလုပ်တွင် ပြီးစီးခဲ့သောအရာများ

- [x] RAR archive ကို integrity-test လုပ်ခဲ့သည်။ `unrar t` ၏ရလဒ်မှာ `All OK` ဖြစ်သည်။ Archive စာရင်းတွင် entry 406 ခုရှိပြီး `notation-engine/` root တစ်ခုတည်းအောက်တွင်သာရှိကာ path traversal path မတွေ့ခဲ့ပါ။
- [x] Archive ထဲမှ root contents ကို `Website/Notation/Notation Engine/` ထဲသို့ တစ်ဆင့်ပိုသော nested `notation-engine/` folder မဖန်တီးဘဲ ထည့်သွင်းခဲ့သည်။ ရရှိလာသော file 372 ခု၏စုစုပေါင်းအရွယ်အစားမှာ 7.4 MB ခန့်ဖြစ်သည်။ Source, tests, package manifests နှင့် bundled `dist/` တို့ပါဝင်သည်။
- [x] Core/parser/render/layout/playback/export modules, public API entry points, test inventory, package/build scripts နှင့် module README များကို static code review လုပ်ခဲ့သည်။
- [x] ဆက်လက်လုပ်ဆောင်ရန် roadmap ကို [`../Notation Plan/PLAN.md`](../Notation%20Plan/PLAN.md) တွင်ရေးသားခဲ့သည်။
- [x] လက်ရှိ implementation နှင့် review ကန့်သတ်ချက်များကို ဤ Doc တွင် မှတ်တမ်းတင်ခဲ့သည်။
- [x] R2 SoundFont integration ကို `src/soundfont/browser.ts` တွင် `R2SoundFontEngine` အဖြစ် ထည့်ပြီး manifest/cache/SF2-SF3 AudioWorklet playback ကို Website Notation Lab နှင့် ချိတ်ထားသည်။ Unpitched percussion note များသည် `midi-unpitched` GM key number ဖြင့် တကယ်မြည်ပြီး၊ `<midi-program>`/`<midi-bank>`/`<midi-channel>` routing ကို `assignTrackRouting()` (`src/playback/routing.ts`) က channel ခွဲပေးသည် (percussion → GM channel 10 index 9)။
- [x] PLAN.md Part E: instrument-neutral note mapping ကို သီးခြား typed layer အဖြစ် `src/mapping/` တွင် ခွဲထုတ်ပြီးဖြစ်သည်။ `MappingRegistry` (ordered profiles + precedence + diagnostics), `InstrumentProfile`, `GenericPitchedProfile` (instrument မသိသော pitched note အားလုံး), `UNPITCHED_PERCUSSION_PROFILE` (GM drum logic), နှင့် `MappingProfile` customization/persistence ပါဝင်သည်။ Renderer သည် `resolveNoteRendering` မှတစ်ဆင့် ဤ layer ကို ခေါ်သည်။ Mapping သည် sounding pitch/playback ကို မထိပါ; ရှိပြီးသား visual-regression snapshots အားလုံး မပြောင်းဘဲ pass ဖြစ်သည်။

- [x] Editor dock ၏ `⋯` tab ကို အကောင်အထည်ဖော်ပြီးဖြစ်သည် (`buildMorePanel()`). ယခင်က `ready: false` placeholder ဖြစ်ခဲ့ပြီး နှိပ်လျှင် "not wired up yet" သာ ပြောခဲ့သည်။ ယခု tab သည် တကယ့် panel ဖြစ်ပြီး လက်ရှိ part ၏ instrument surface (drums → pads, fretted → fretboard, ကျန် → 88-key) နှင့် Mixer ကို အတူ ပြသည်။ `SIDEBAR_TABS` ထဲ ထည့်ထားသဖြင့် reload လျှင်လည်း ပြန်ပွင့်သည်; `sidebarPanelSignature()` က part/instrument ပြောင်းလျှင် panel ကို ပြန်ဆွဲသည်။ `test/unit/editor-integration.test.js` ၏ `the ⋯ tab` suite (test ၃ ခု) က ဖုံးထားသည်။
- [x] MuseScore 4 ၏ `Add Palettes` စာရင်း (၂၉ အုပ်စု, `src/palette/internal/palettecreator.cpp`) နှင့် editor ၏ catalogue (၂၀ အုပ်စု) ကို တိုက်စစ်ပြီးဖြစ်သည်။ Engine က မပံ့ပိုးသေးသည့် အုပ်စုများ — Breaths & pauses (parse/render မရှိ), Brackets, Fingerings (parse ရှိ၊ render မရှိ), Fretboard diagrams, Frames, Accordion, Bagpipe embellishments, Handbells, Harp — ကို မထည့်ရသေးပါ။ Beam properties မှာမူ engine က `<beam>` ကို parse/render လုပ်နိုင်ပြီး editor command သာ မရှိသေးပါ။
- [x] Guitar staff ↔ Tab တစ်ပြိုင်တည်း ရေးခြင်းကို စစ်ဆေးပြီးဖြစ်သည်။ Fretboard မှ ရေးခြင်း၊ notation staff မှ ရေးခြင်း၊ Delete၊ Properties ၏ pitch/duration/staff၊ accidental palette အားလုံး `mirrorCounterpart()` မှတစ်ဆင့် staff နှစ်ခုလုံးသို့ ရောက်သည် (`a guitar part that prints notation and tab` suite)။

## Engine ၏ လက်ရှိဖွဲ့စည်းပုံ

`src/index.ts` သည် public barrel ဖြစ်သည်။ အဓိက flow မှာ `parseMusicXml(xmlText)` → `ParseResult` → `renderParsedMusicXml(parsed, { config })` ဖြစ်ပြီး shortcut `renderFromMusicXml(xmlText, options)` သည် parse/render ကို တစ်ခါတည်းလုပ်ကာ `{ svg, diagnostics, playback }` ပြန်ပေးသည်။ တူညီသော score ကို config ပြောင်းပြီး ပြန်ထုတ်လိုလျှင် parsed result ကို ပြန်အသုံးပြုနိုင်သည်။

| Layer | လက်ရှိ code ၏တာဝန် |
|---|---|
| `src/core/` | Pitch, Duration, Note, Rest, Chord, Voice, Measure, Part, Score အပါအဝင် instrument-neutral score model နှင့် tick math |
| `src/parser/musicxml/` | MusicXML parse, attributes/cursor, notes/voices/chords, directions, notations, metadata, diagnostics |
| `src/parser/midi/` | MIDI byte stream မှ notes နှင့် tempo/time/key-signature meta events ကို parse လုပ်ခြင်း |
| `src/glyphs/` | SMuFL glyph names နှင့် bundled Bravura metadata/metrics |
| `src/geometry/`, `src/render/` | Staff-space geometry တွက်ချက်ခြင်းနှင့် SVG markup/DOM string တည်ဆောက်ခြင်း |
| `src/layout/` | Spacing, skyline clearance, continuous scroll နှင့် page/system layout |
| `src/timing/`, `src/playback/` | Tempo/tick conversions, MIDI-ready event stream, position mapping, cursor/playhead နှင့် repeat unfolding |
| `src/soundfont/` | R2 manifest/cache, SoundFont binary loading နှင့် SpessaSynth WebAudio adapter |
| `src/drums/`, `src/notation-defaults/` | Drum mapping/overrides နှင့် engine ကိုယ်ပိုင် notation defaults (clef, drum kit, string/tab, engraving style, spacing law) နှင့် source provenance |
| `src/mapping/` | Instrument-neutral note mapping layer: `MappingRegistry`, `InstrumentProfile`, generic pitched fallback, unpitched percussion profile, precedence diagnostics နှင့် `MappingProfile` customization/persistence |
| `src/export/`, `src/debug/` | SVG/PNG/PDF export helpers, diagnostic filtering နှင့် layout/debug overlays |
| `src/config/` | `EngineConfig`, defaults နှင့် field-by-field `resolveConfig()` merge |

## Code ထဲတွင် ရှိပြီးသား capabilities

### Parsing နှင့် score data

- MusicXML parser သည် partwise/timewise score အတွက် typed `Score` data ထုတ်ပေးပြီး voices, notes/rests/chords, multi-part/staff attributes, divisions/ticks, positioned attribute changes နှင့် diagnostics ကို ကိုင်တွယ်ထားသည်။
- Side tables အနေဖြင့် tempo marks, dynamics/directions, octave shifts, harmony, print/layout breaks, instrument mapping, score defaults/identity/credits တို့ကို ထိန်းထားသည်။ Parsing result အားလုံးကို `Score` core type ထဲ ထည့်မထားခြင်းမှာ intentional design ဖြစ်သည်။
- MXL (`.mxl`) အတွက် `unzipMxl(bytes, domParser)` ရှိသော်လည်း MXL bytes ကို `renderFromMusicXml()` ထဲ တိုက်ရိုက်ပေးသည့် API မဟုတ်ပါ; unzip ပြီး XML text ကို MusicXML API သို့ပေးရသည်။
- MIDI `parseMidiFile(bytes)` သည် format 0/1 ကို parse လုပ်ပြီး file PPQ မှ internal 480 ticks-per-quarter သို့ normalize လုပ်သည်။ Format 2 နှင့် SMPTE timing ကို diagnostic ဖြင့် reject လုပ်သည်။ MIDI output သည် note/meta timeline သာဖြစ်ပြီး လက်ရှိ API တွင် MIDI→`Score` conversion သို့ MusicXML renderer နှင့်ပေါင်းထားသော high-level flow မရှိပါ။

### Engraving, layout နှင့် playback

- SMuFL glyph table နှင့် Bravura metadata ကို အသုံးပြုပြီး notes/rests, accidentals, clefs, key/time signatures, stems/flags/beams, ties/slurs/tuplets, dynamics/hairpins, lyrics, chord symbols, rehearsal marks, tablature စသည်များအတွက် geometry/render code ပါဝင်သည်။
- `EngineConfig` မှ color/font/layout/cursor/notehead/beam/spacing/page/drum/text/debug options များကို override လုပ်နိုင်သည်။ Scroll နှင့် page mode, spacing laws, skyline staves clearance, explicit break hints တို့ကို layout layer က ကိုင်တွယ်သည်။ Page mode သည် system အမြင့်ကို ထည့်သွင်းစဉ်းစားပြီး (`Page.height`/`PageLayout.totalHeight`) system တစ်ခုသည် usable height ထက် မြင့်လျှင် page ကို ချဲ့သဖြင့် clipping/overlap မဖြစ်ပါ။ `planResize()` က resize ကို pure-scale (O(1)) သို့မဟုတ် re-flow အဖြစ် ဆုံးဖြတ်ပေးသည်။
- Playback layer သည် score/layout ပေါ်အခြေခံသော note event stream, stable event ID, pitched MIDI note number/duration, written/performance repeat position mapping, cursor/playhead position helpers တို့ကိုပေးသည်။ Core engine သည် audio context ကို မဖွင့်ဘဲ သီးခြား `R2SoundFontEngine` host adapter က R2 နှင့် WebAudio playback ကို ကိုင်တွယ်သည်။
- Notation defaults အားလုံးကို `src/notation-defaults/` ထဲတွင် ထားရှိပြီး table တစ်ခုချင်းစီက ၎င်းလာသည့် public specification (`musicxml`, `smufl`, `gm1`, `drumNotation`) သို့မဟုတ် engine ၏ကိုယ်ပိုင်ရွေးချယ်မှု (`houseStyle`) ကို `DefaultsSource` ဖြင့်ဖော်ပြထားသည်။ Drum kit သည် General MIDI 1 percussion map အတိုင်းဖြစ်ပြီး engraving thickness များသည် bundled Bravura font ၏ `engravingDefaults` မှလာသည်။ Engine သည် မည်သည့် third-party GPL-3.0-only table ကိုမျှ မှီခိုခြင်းမရှိတော့ပါ။
- Export layer တွင် SVG, PNG နှင့် PDF helpers ပါဝင်သည်။ PDF သည် vector PDF မဟုတ်ဘဲ raster image များဖြင့်ဖွဲ့ထားသည်။ Browser သို့မဟုတ် host-provided backend လိုအပ်နိုင်သည်။ `exportPng()` သည် raster slice တစ်ခုကိုသာ ပြန်ပေးသည်။

## Test source ရှိမှုနှင့် မစမ်းသပ်ရသေးသောအချက်

Repo ထဲတွင် unit test file 102 ခု၊ visual snapshot file 29 ခု၊ fixture file 60 ခုနှင့် performance test 1 ခုရှိသည်။ Tests သည် core, parsers, notation geometry, page/scroll layout, timing/alignment, playback/cursor/repeats, drums, config, exports နှင့် visual render cases များကို cover လုပ်ရန်ရေးသားထားသည်။

**လက်ရှိ integration verification:** `npm run verify` (typecheck + lint + format:check + build + API doc + fixture matrix + unit/visual tests) သည် **1295/1295 pass** ဖြစ်သည်။ Fixture matrix (`Notation Plan/Documentation/MusicXML-Fixture-Matrix.md`) ကို `scripts/generate-fixture-matrix.mjs` မှ generate လုပ်ပြီး `npm run fixtures:check` က drift ကို စစ်သည်။ Build/verify destination ကို `Website/Website/assets/` သို့ reconcile ပြီးဖြစ်ပြီး `test/unit/website-bundle.test.js` က app bundle နှင့် cache key ကို စစ်သည်။ `test/unit/own-provenance.test.js` က engine `src/` ထဲတွင် third-party notation program ၏ provenance ပြန်မဝင်လာစေရန် guard လုပ်သည်။ Runtime config validation (`resolveConfigWithDiagnostics`) နှင့် tempo-event validation (`INVALID_TEMPO_EVENT`) အတွက် tests ပါဝင်သည်။ Instrument transposition (`<transpose>`) ကို sounding pitch အဖြစ် playback/MIDI alignment တွင် အသုံးချပြီး notation ကို written pitch အတိုင်း ဆက်ထားသည် (`test/unit/transposition.test.js`)။ MusicXML element support matrix ကို `Notation Plan/Documentation/MusicXML-Support.md` တွင်၊ fixture တစ်ခုချင်း၏ behavior/provenance matrix ကို `Notation Plan/Documentation/MusicXML-Fixture-Matrix.md` တွင် မှတ်တမ်းတင်ထားသည်။ Performance budget test သည် sandbox runtime တွင် timing overrun ဖြစ်နိုင်သေးသည်။ SoundFont binary ကို R2 runtime asset အဖြစ်သာထားသောကြောင့် local test တွင် actual audio render မပါဝင်သေးပါ။ Notation Lab editor တွင် note ရေးခြင်း (staff click, letter key, duration/accidental/chord, arrow-key transpose) နှင့် **ရေးစဉ် အသံကြားခြင်း** (engine `midiNoteNumber()` + sound engine `preview()`) ပါဝင်သည်; `test/unit/midi-note-number.test.js` က preview နှင့် playback event stream သည် MIDI note တူတူ ရကြောင်း စစ်သည်။ (PLAN.md Part K) Editor သည် `notation-editor.html` ကို `?intent=` မပါဘဲ (သို့) file handoff မပါဘဲ ဖွင့်လျှင်လည်း starter score တစ်ခုကို အမြဲ ဖွင့်ပေးသဖြင့် ရေးစရာ staff အမြဲ ရှိသည်။ Note-input mode တွင် staff click သည် အမြဲ ရေးသည် — ရှိပြီးသား note ပေါ် click လုပ်လျှင် ထို note ကို replace (Shift → chord) ဖြစ်သည်; note ကို select/transpose လုပ်လိုလျှင် note input ကို ပိတ်ရမည် (`test/unit/editor-integration.test.js` တွင် စစ်သည်)။

## နောက်ဆုံး engine plan

"နောက်တစ်ဆင့် လုပ်ဆောင်ရန်" အစီအစဉ်ကို [`../Notation Plan/PLAN.md`](../Notation%20Plan/PLAN.md) တွင် **Part A–I** အဖြစ် ပြန်ရေးထားသည်။ Part C (MuseScore-derived အားလုံး ဖယ်ရှားခြင်း) ကို အရင်ပြီးအောင်လုပ်ပြီး clean provenance baseline ရမှ ကျန်အလုပ်များကို ဆက်လုပ်ရမည်။

## တွေ့ရှိထားသော follow-up gaps / risks

1. **README drift (resolved):** `src/*/README.md` နှင့် `test/fixtures/README.md` တို့သည် `PLAN.md` ၏ Part များကို ညွှန်ပြီး၊ "Nothing here yet / Phase 1" placeholder စာသားနှင့် မရှိတော့သော `Doc/phase-*.md` cross-reference များ ဖယ်ရှင်းပြီးဖြစ်သည်။ `theme/` သည် `EngineConfig` ဖြင့် superseded, `plugins/` သည် use case မရှိသေးသဖြင့် intentionally deferred ဖြစ်သည်။ (PLAN.md Part B)
2. **MIDI boundary (resolved as a decision):** `parseMidiFile()` သည် MIDI event/meta reader အဖြစ်သာ ရှိမည်ဟု ဆုံးဖြတ်ပြီးဖြစ်သည် -- `MidiFile` (note list + tempo/time/key timeline) ပြန်သည်, `Score` မဟုတ်ပါ။ MIDI တွင် notation concepts (staff spelling/voice/beaming/clef) မပါသဖြင့် `midiFileToScore()`/`renderFromMidi()` ကို တမင်မဖန်တီးပါ; MIDI→notation policy သည် host ၏တာဝန်။ Boundary ကို root `README.md` ၏ "MIDI scope" အပိုင်းတွင် ဖော်ပြထားသည်။
3. **Staff-line/TAB integration (resolved):** `RenderCtx` က staff တစ်ခုချင်း၏ ကိုယ်ပိုင် line count ကို သယ်ဆောင်ပြီး renderer helper အားလုံး ဖတ်သည်; 1–6 line staves နှင့် TAB clef/staff ကို end-to-end test လုပ်ပြီးဖြစ်သည် (`test/unit/staff-line-count.test.js`)။
4. **Page reflow (resolved):** `planResize()` သည် pure-scale (`resizePureScale`, O(1)) နှင့် re-flow (cached `Score` မှ ပြန်ဆွဲ) ကို ခွဲဖော်ပြသည်။ `Page.height`/`PageLayout.totalHeight` ဖြင့် system တစ်ခုသည် usable height ထက် မြင့်လျှင် page ကို ချဲ့သဖြင့် clipping/overlap မဖြစ်တော့ပါ; ပုံမှန် page output မပြောင်းပါ (snapshots)။
4b. **Music-font metrics limitation:** glyph geometry (bBox/anchor/advance) သည် bundled Bravura metrics မှ လာသည်။ `config.fonts.musicFont` ကို Bravura မှ ကွဲပြားစွာ set လျှင် renderer က `MUSIC_FONT_METRICS` warning ထုတ်သည်; Bravura-compatible metrics ရှိသော SMuFL font သာ ပံ့ပိုးသည် (metrics provider abstraction မလုပ်ရသေးပါ)။
5. **Runtime validation:** `resolveConfig()` သည် defaults merge လုပ်သော်လည်း JavaScript caller များမှလာသော value ranges/enums ကို runtime အဆင့်တွင် အပြည့်အဝ validate မလုပ်ပါ။ Timing-map input values အတွက်လည်း zero/negative/non-finite cases ကို harden လုပ်ရန် roadmap ထဲတွင် ထည့်ထားသည်။
6. **Raster slicing:** `rasterizeSvg()` တွင် slice height rounding ကြောင့် အချို့ non-divisible dimension များတွင် pixel rows ပျောက်/ထပ်နိုင်သည့် risk ကို targeted test ဖြင့်စစ်ရန်လိုသည်။
7. **Build path (resolved):** Engine build script သည် bundle ကို `Website/Website/assets/` သို့ကူးပြီး API doc ကို `Website/Notation/Notation Plan/Documentation/API.md` သို့ရေးသည်။ `website-bundle.test.js` က bundle hash နှင့် cache key တိုက်ဆိုင်မှုကို စစ်ဆေးသည်။
8. **Visual tests:** SVG snapshot များရှိသော်လည်း browser render check သည် Chromium/font မရှိလျှင် skip ဖြစ်နိုင်သည်။ CI မှာ prerequisites ကိုပြတ်သားစွာသတ်မှတ်ရန်လိုသည်။
9. **Release / attribution (resolved):** Engine ကို internal-only ဆက်ထားသည် (`package.json` `private`, `0.0.0`) ဖြစ်သဖြင့် outbound LICENSE မထုတ်။ Redistribute လုပ်သည့် third-party component များ (fflate MIT, spessasynth_lib Apache-2.0, Bravura OFL 1.1) ကို `Notation Engine/THIRD-PARTY-NOTICES.md` တွင် မှတ်တမ်းတင်ထားသည်။ Bravura OFL notice ကို font နှင့်အတူ `sync-website-bundle.mjs` က ကူးပေးပြီး `website-bundle.test.js` က guard လုပ်သည်။ SoundFont များသည် R2 host asset ဖြစ်သဖြင့် repo တွင် မပါဝင်ပါ။ (PLAN.md Part I)

## ဒီ review မှာ မလုပ်ခဲ့သည့်အရာ

- Engine implementation ကို ပြင်ဆင်/feature အသစ်ရေးသားခြင်း မလုပ်ခဲ့ပါ။
- Project ၏ npm build/test scripts များကို မ run ခဲ့ပါ။
- Test suite pass/fail ကို အတည်မပြုခဲ့ပါ။
- Source comments ထဲတွင်ပါသည့် plan/phase ရည်ညွှန်းချက်များကို လက်ရှိ code behavior နှင့်မတူပါက အမှန်တရားအဖြစ် မယူဆခဲ့ပါ။
