# Notation Engine — ဆက်လက်လုပ်ဆောင်ရန် Plan

**သုံးသပ်ရက်စွဲ:** 2026-11-13

**အခြေခံထားသော source:** အသုံးပြုသူတင်ပေးသော `notation-engine.rar` ၏ code snapshot

ဤ Plan သည် လက်ရှိ code ကို ဖတ်ရှုသုံးသပ်ပြီးနောက် အကြံပြုထားသော လုပ်ငန်းစဉ်ဖြစ်သည်။ အောက်ပါ roadmap ထဲရှိ item များကို မလုပ်ရသေးပါက အဲဒါများကို ပြီးစီးပြီးဟု မယူဆရ။ လက်ရှိ code နှင့် စစ်ဆေးထားသော test evidence ကို `../Notation Doc/DOC.md` တွင် မှတ်တမ်းတင်ထားသည်။

## ရည်မှန်းချက်

TypeScript ဖြင့်ရေးသားထားသော instrument-neutral music score model ကို အသုံးပြုပြီး MusicXML မှ SVG notation ထုတ်ပေးခြင်း၊ layout၊ playback-position data နှင့် export များကို ယုံကြည်စိတ်ချရစွာ ပေးနိုင်ရန်။ MIDI parsing နှင့် MIDI မှ notation ပြောင်းခြင်းတို့သည် သီးခြား scope ဖြစ်သင့်/မသင့်ကို အတည်ပြုရန်။

## လက်ရှိ code snapshot

- Package သည် `notation-engine` (`private: true`, version `0.0.0`) ဖြစ်ပြီး `src/index.ts` မှ public API ကို export လုပ်ထားသည်။
- Main data flow: `parseMusicXml()` → `ParseResult` → `renderParsedMusicXml()`; shortcut API `renderFromMusicXml()` က SVG၊ diagnostics နှင့် playback data ကို ပြန်ပေးသည်။ MXL extraction (`unzipMxl`) သည် သီးခြား function ဖြစ်သည်။
- Core အပိုင်းများတွင် score model, MusicXML/MIDI parsers, SMuFL glyph data, geometry, SVG renderer, scroll/page layout, timing/playback, drums, debug နှင့် SVG/PNG/PDF export တို့ပါဝင်သည်။
- Test source footprint: unit test file 90 ခု၊ visual snapshot 29 ခု၊ fixture file 56 ခုနှင့် performance test 1 ခု။ ဤအရေအတွက်သည် repo ထဲရှိ test files ကိုသာ ဖော်ပြခြင်းဖြစ်ပြီး ဒီ review မှာ tests run/pass ဖြစ်ကြောင်း မဆိုလိုပါ။

## ဦးစားပေး roadmap

### P0 — Build / validation ကို လက်ရှိ repository နဲ့ကိုက်ညီအောင် ပြင်ဆင်ရန်

- [ ] `scripts/sync-website-bundle.mjs` ၏ destination များကို အတည်ပြုပါ။ ယခု script သည် Engine package ၏ parent ဖြစ်သော `Website/website/assets` သို့ bundle ကူးပြီး `Website/website` နှင့် `Website/web-preview` ထဲက HTML version များကို ပြင်ဆင်ရန် ကြိုးစားသည်။ လက်ရှိ checkout တွင် `Website/website` နှင့် `Website/web-preview` lowercase directory များ မရှိပါ; `Website/index.html`, `script.js`, `styles.css` တို့က root မှာရှိသည်။ Build destination နှင့် cache-busting target ကို တကယ့် deploy structure နှင့်ကိုက်ညီအောင် ပြင်ပြီး မရည်ရွယ်သော overwrite မဖြစ်ကြောင်း စစ်ပါ။
- [ ] `scripts/generate-api-docs.mjs` ၏ output path (`Website/Plan/Notation Plan/Documentation/API.md`) ကို အသုံးပြုသူတောင်းထားသော `Website/Notation/Notation Plan` လမ်းကြောင်းနှင့် သတ်မှတ်ချက်ရှင်းလင်းပါ။ Generated API reference နှင့် hand-written roadmap တို့၏ canonical location/ownership ကိုရွေးချယ်ပါ။
- [ ] Build side-effects ကို သေချာစစ်ပြီးနောက် clean environment တွင် `npm ci`၊ `npm run typecheck`၊ `npm run lint`၊ `npm run format:check`၊ `npm run docs:check` နှင့် `npm test` ကို အစဉ်လိုက် run လုပ်ကာ failure များကို ခွဲခြားမှတ်တမ်းတင်ပါ။
- [ ] CI workflow တစ်ခုတွင် verification steps များကို ထည့်ပြီး browser test အတွက် Chromium နှင့် Bravura font ရရှိနိုင်မှုကို သတ်မှတ်ပါ။

**ပြီးစီးမှုစံ:** Build/test command များသည် ရည်ရွယ်ထားသော output path များတွင်သာ အလုပ်လုပ်ရမည်၊ clean install မှ verify ရလဒ်ကို မှတ်တမ်းတင်ထားရမည်၊ browser test skip/fail အကြောင်းရင်း မရှင်းလင်းဘဲ မကျန်ရ။

### P1 — Documentation နှင့် supported-scope ကို code နဲ့ညီအောင်လုပ်ရန်

- [ ] `src/parser/README.md`, `src/layout/README.md`, `src/export/README.md`, `test/fixtures/README.md` တွင် ကျန်နေသော “Nothing here yet / Phase 1 folder structure only” စာသားများကို အမှန်တကယ် implementation နှင့်ညီအောင် ပြင်ပါ။ `core`, parser, direction/harmony စသည်တို့မှ obsolete comments များကိုလည်း ပြန်စစ်ပါ။
- [ ] Root README တစ်ခုတွင် install/build, DOMParser requirement, API example, MXL ကိုသီးခြား unzip လုပ်ပုံ၊ export behavior နှင့် host အပေါ်မူတည်သော features များကို ရှင်းပြပါ။
- [ ] MusicXML elements များကို **implemented / partially supported / unsupported** ဟူ၍ support matrix ပြုလုပ်ပါ။ Unknown/malformed construct များကို drop/recover လုပ်ပုံနှင့် diagnostic code များကို contract အဖြစ် မှတ်တမ်းတင်ပါ။
- [ ] `src/theme/` ကို `EngineConfig` ဖြင့် supersede လုပ်ထားပြီး `src/plugins/` ကို concrete use case မရှိသေးသဖြင့် defer လုပ်ထားကြောင်း ရှင်းလင်းစွာ ထိန်းသိမ်းပါ။ Duplicate theme/plugin API ကို မဖန်တီးပါနှင့်။

**ပြီးစီးမှုစံ:** README နှင့် source comments များက ရှိပြီးသား feature ကို placeholder ဟု မဖော်ပြတော့ရ၊ unsupported behavior နှင့် environment requirement များကို API consumer သိနိုင်ရမည်။

### P2 — Import compatibility နှင့် MIDI scope ကို ဆုံးဖြတ်ရန်

- [ ] MusicXML partwise/timewise, MXL, changing attributes/divisions, voices/chords/rests, unpitched percussion, lyrics/directions/harmony စသည့် behavior များကို fixture matrix ဖြင့်ထိန်းပါ။ Actual exporters ၏ provenance ကို fixture တစ်ခုချင်း အတည်ပြုပါ။
- [ ] Harmony၊ unusual notation၊ instrument transposition၊ malformed note/chord နှင့် multiple-staff cases အတွက် diagnostic/recovery tests တိုးချဲ့ပါ။
- [ ] `parseMidiFile()` ကို MIDI event/meta parser အဖြစ်သာ ဆက်ထားမည်လား၊ သီးခြား MIDI→Score conversion API တစ်ခုဖန်တီးမည်လား ဆုံးဖြတ်ပါ။ MIDI သည် staff spelling, voice assignment, beaming စသည့် notation data မပါသည့်အတွက် မူဝါဒမရှိဘဲ MusicXML renderer သို့ တိုက်ရိုက်ပို့သည်ဟု မဆိုပါနှင့်။
- [ ] MIDI alignment ကို host-side integration အဖြစ်ထားမည်ဆိုလျှင် multi-part assignment, duplicate pitches/ticks, unmatched notes နှင့် stable event association အတွက် tests/documentation ထည့်ပါ။

**ပြီးစီးမှုစံ:** Parser/API တစ်ခုစီ၏ input/output boundary၊ မထောက်ပံ့သော MIDI formats နှင့် MusicXML recovery behavior ကို user-facing docs မှာရှင်းပြနိုင်ရမည်။

### P2B — တူရိယာအားလုံးနှင့် Orchestra/ensemble score များကို ပံ့ပိုးရန်

Notation Engine သည် instrument-neutral ဖြစ်ရမည်၊ Piano/Drum နှစ်မျိုးတည်းဖြင့် မကန့်သတ်ရ။ MusicXML တွင် note များပါဝင်သည့် မည်သည့် instrument part ကိုမဆို profile စာရင်းတွင် မပါခြင်းကြောင့် ပယ်မချဘဲ ဖတ်၍ render လုပ်နိုင်ရန် ရည်ရွယ်ရမည်။ ပုံမှန် pitched instrument များအတွက် generic mapping ကို default သုံးပြီး၊ သီးခြား notation rule လိုအပ်သည့်အခါမှသာ instrument/family-specific profile ထည့်ပါ။ Orchestra သည် instrument တစ်မျိုးမဟုတ်ဘဲ ensemble ဖြစ်သဖြင့် full score ထဲရှိ multi-part, multi-staff, multi-voice structure, instrument identity, transposition နှင့် system layout ကို ထိန်းသိမ်းပြီး render လုပ်ရမည်။

လက်ရှိ code မှ ပြန်သုံးရန်:

- `src/core/pitch.ts`, `note.ts`, `chord.ts`, `duration.ts`, `part.ts`, `voice.ts` တို့သည် pitched/unpitched pitch, note metadata, chord/staff/voice/time ကို ထိန်းထားပြီးဖြစ်သည်။ Mapping အသစ်အတွက် ဒုတိယ score model မဖန်တီးပါနှင့်။
- `src/drums/drum-map.ts` တွင် `DrumMapEntry`, `DrumMappingTable`, `lookupDrumMapEntry()` နှင့် `mergeDrumMappingTable()` ရှိပြီးသားဖြစ်သည်။ `src/musescore/drumset.ts`, `adapters.ts`, `staff-position.ts` တို့က provenance ပါသော MuseScore default data/conversion ကို ပေးထားသည်။ Drum mapping ကို ထပ်မံ duplicate မလုပ်ဘဲ shared contract အဖြစ် တိုးချဲ့ပါ။
- `src/geometry/notehead.ts` တွင် MusicXML notehead, SMuFL glyph, configured override, duration default တို့ကို စဉ်လိုက်ရွေးသည့် logic ရှိသည်။ `src/geometry/clef.ts` နှင့် `src/geometry/staff.ts` ကို clef-aware position conversion အတွက် သုံးပါ။

အကြံပြုထားသော architecture:

- `NoteMapping` contract သည် pitched/unpitched `Note` နှင့် part/staff/clef/instrument context ကို လက်ခံပြီး display-only result ပြန်ပေးပါစေ။ Result တွင် staff index/position, notehead family/glyph, stem/voice preference နှင့် optional label ပါနိုင်သည်။ Pitch, duration, MIDI playback note နှင့် source MusicXML metadata ကို canonical model ထဲတွင် မပြောင်းပါနှင့်။
- `GenericPitchedMapping` သည် ordinary pitched notes အားလုံးအတွက် default ဖြစ်ရမည်။ `InstrumentProfile` သည် part/instrument identity, clef, staff count, written-to-sounding transposition, octave transposition နှင့် optional engraving settings ကို ဖော်ပြနိုင်ရမည်။
- `MappingRegistry` သည် instrument/part identity, `InstrumentProfile` နှင့် user override ကို ကြည့်ပြီး generic mapping သို့မဟုတ် လိုအပ်သည့် specialized mapping ကို ရွေးပါစေ။ Registry တွင် mapping မရှိသော instrument ဖြစ်သော်လည်း valid note data ကို generic mapping ဖြင့် render လုပ်ရမည်။ Engine core မှ mapping profile သို့ dependency တစ်ဖက်သတ်သာ ဖြစ်ရမည်။
- `PianoMapping` သည် note letter, accidental, octave, clef နှင့် grand-staff policy တို့မှ staff position ကိုတွက်ပါစေ။ Written pitch နှင့် sounding pitch transposition ကို သီးခြားထားပြီး treble/bass clef, ledger line, grand-staff split/overlap, user remap များအတွက် tests ထည့်ပါ။
- `DrumMapping` သည် လက်ရှိ `DrumMappingTable` ကို shared interface မှတစ်ဆင့် သုံးပါစေ။ `instrumentId` သို့မဟုတ် MIDI pitch ကို အသုံးပြုပြီး drum identity, staff position, notehead, voice နှင့် articulation ကို သတ်မှတ်ပါ။ MusicXML တွင် explicit `<display-step>/<display-octave>` ပါလျှင် staff position ကို ထိုတန်ဖိုးမှယူပါ။ Explicit `<notehead>` သည် default/profile ထက် ဦးစားပေးရမည်။
- Piano နှင့် Drum သည် specialized mapping ၏ ဥပမာများသာဖြစ်ပြီး engine ၏ အကျယ်အဝန်းကို မသတ်မှတ်ရ။ Strings, woodwinds, brass, keyboard/organ, vocal parts, octave-transposing instruments နှင့် pitched/unpitched percussion အပါအဝင် MusicXML မှတ်တမ်းတင်ထားသည့် အခြား instrument များကို generic support နှင့် လိုအပ်သည့် `InstrumentProfile` များဖြင့် ကိုင်တွယ်ပါ။ Instrument တစ်ခုချင်းစီအတွက် သီးခြား map မဖြစ်မနေ မလိုအပ်စေရ။
- Orchestra/ensemble score များအတွက် instrument part များစွာ၊ part တစ်ခုအတွင်း staff/voice များစွာ၊ transposing part, part name/abbreviation, score order နှင့် system spacing ကို ထိန်းသိမ်း၍ render လုပ်နိုင်ကြောင်း fixture/tests ထည့်ပါ။ Group bracket/barline နှင့် automatic condensing ကို သီးခြား scope အဖြစ် ဆုံးဖြတ်ပြီး basic multi-part support ကို ထို feature များအပေါ် မမှီခိုစေရ။
- `MappingProfile` သည် MuseScore မှ ကိုးကားထားသော default နှင့် project ၏ ကိုယ်ပိုင် house style ကို သီးခြားထားပါစေ။ MuseScore တန်ဖိုးများကို project default အဖြစ်သုံးမသုံးကို fixture comparison နှင့် အသုံးပြုသူဆုံးဖြတ်ချက်နောက်မှ ဆုံးဖြတ်ပါ။ Profile တစ်ခုချင်းကို config မှ override လုပ်နိုင်ရမည်။
- Resolution precedence ကို tests များဖြင့် အတည်ပြုပါ: source MusicXML ၏ explicit display/notehead/stem metadata → user profile override → instrument mapping → documented fallback + diagnostic။ Fallback ကြောင့် note ကို မဖယ်ရှားဘဲ diagnostic ပေးရမည်။

Implementation sequence:

1. `[ ]` Generic pitched mapping, `InstrumentProfile`, shared input/context/result types, `MappingRegistry` နှင့် precedence ကို သတ်မှတ်ပြီး contract/type-level tests ရေးပါ။
2. `[ ]` Instrument-specific map မရှိသော part များအပါအဝင် ပုံမှန် pitched instrument အားလုံးကို generic mapping ဖြင့် render လုပ်နိုင်ကြောင်း စစ်ဆေးပါ။ မသိသော instrument identifier တစ်ခုကြောင့် note ကို မပယ်ချရ။
3. `[ ]` လိုအပ်သည့် special notation အတွက် profile/module များကို တိုးချဲ့ပါ။ ရှိပြီးသား Drum mapping ကို adapter ဖြင့်ဆက်သုံးပြီး Piano/grand staff, transposition/octave transposition, strings/tablature, pitched/unpitched percussion စသည့် case များကို သက်ဆိုင်ရာ tests ဖြင့် ဖြေရှင်းပါ။
4. `[ ]` Orchestra/ensemble fixtures ဖြင့် multi-part, multi-staff, multi-voice, transposing instruments, part names/order နှင့် vertical/system layout ကို စမ်းသပ်ပါ။ Group brackets/barlines နှင့် automatic condensing ကို သီးခြားဆုံးဖြတ်ပါ။
5. `[ ]` `MappingProfile` customization/persistence, diagnostics နှင့် renderer bridge ကို ချိတ်ဆက်ပါ။ MusicXML explicit data → user override → instrument profile → generic fallback precedence ကို စမ်းသပ်ပါ။ Mapping က sounding pitch/playback ကို မပြောင်းရ။
6. `[ ]` MuseScore reference behavior နှင့် pinned fixture/snapshot comparison လုပ်ပြီး project style ၏ ရည်ရွယ်ထားသော ကွာခြားချက်များ၊ per-source license နှင့် attribution ကို မှတ်တမ်းတင်ပါ။

**ပြီးစီးမှုစံ:** Profile စာရင်းထဲမပါသော instrument ပါအဝင် valid note များ မပျောက်ဘဲ render ဖြစ်ရမည်။ အမျိုးမျိုးသော instrument family များနှင့် orchestra/ensemble ၏ multi-part, multi-staff score များကို fixture/integration tests ဖြင့် အတည်ပြုရမည်။ Mapping သည် source MusicXML data, rhythm, sounding pitch သို့မဟုတ် playback ကို မပြောင်းရ။

### P3 — Rendering/layout လိုက်လျောညီထွေမှုကို တိုးတက်စေရန်

- [ ] `computeStaffGeometry()` က အမျိုးမျိုးသော line count ကိုတွက်နိုင်သော်လည်း `render-from-musicxml.ts` တွင် `STAFF_LINES = 5` assumptions များကျန်နေသည်။ Arbitrary staff-line count ကို import → geometry → note placement → SVG အဆုံးအထိ audit လုပ်ပြီး 1–6+ line fixtures ဖြင့် test လုပ်ပါ။
- [ ] TAB clef/staff ကို end-to-end စစ်ဆေးပါ။ Tablature numbers နှင့် string positions ပါဝင်သော်လည်း code comments ထဲရှိ “tab staff not yet draw” သတိပေးချက်များနှင့် fixed-five-line assumptions ကို ဖြေရှင်းပါ။
- [ ] Page-mode dimension change အတွက် resize/reflow ကို public flow တစ်ခုအဖြစ် ဆုံးဖြတ်ပါ။ Pure scaling နှင့် page repagination ကို ခွဲခြားဖော်ပြပြီး မတူညီသော system height များရှိ page တွင် clipping/overlap မဖြစ်စေရန် tests ထည့်ပါ။
- [ ] Bravura metrics ကို အခြေခံသော custom music-font setting အတွက် compatible-font limitation ကို ဖော်ပြပါ၊ သို့မဟုတ် metrics provider ကို သီးခြား abstraction လုပ်ပါ။
- [ ] TypeScript အပြင်မှလာသော config များအတွက် enum/numeric ranges နှင့် unknown override များကို runtime validation သို့မဟုတ် diagnostics ဖြင့်ကိုင်တွယ်ပါ။

**ပြီးစီးမှုစံ:** Staff/tablature layout သည် ပံ့ပိုးထားကြောင်း ကြေညာသည့် configuration အားလုံးတွင် snapshot + integration tests ဖြင့် အတည်ပြုထားရမည်။ Resize, reflow, font compatibility နှင့် invalid config behavior ကို အဓိပ္ပာယ်ရှင်းလင်းစွာ သတ်မှတ်ထားရမည်။

### P4 — Timing, playback နှင့် export correctness

- [ ] `buildTempoMap()` နှင့် measure map တို့တွင် non-finite/zero/negative tempo နှင့် meter values အတွက် validation/diagnostics ထည့်ပါ။ Conversion ရလဒ်များ finite ဖြစ်ကြောင်း tests ဖြင့်စစ်ပါ။
- [ ] Playhead interpolation တွင် nominal time signature ကိုသာ မယူဘဲ pickup, shortened, overfull measure များ၏ actual tick length ကို `PlaybackData` ထဲသယ်ဆောင်အသုံးပြုပါ။ Boundary နှင့် monotonicity tests ထည့်ပါ။
- [ ] Raster slices ၏ rounded height များကြောင့် source row ပျောက်/ထပ်နိုင်ခြေကို ဖြေရှင်းပါ။ 40px/3 slices ကဲ့သို့ remainder ရှိသည့် dimension များတွင် pixel row အားလုံး တစ်ကြိမ်တည်းပါဝင်ကြောင်းစစ်ပါ။
- [ ] `exportPng()` သည် first slice ကိုသာ ပြန်ပေးခြင်း၊ PDF သည် raster-image based ဖြစ်ခြင်း၊ rasterization အတွက် browser သို့မဟုတ် host backend လိုခြင်းတို့ကို public docs တွင်ဖော်ပြပါ။
- [ ] Alignment, repeat expansion နှင့် raster/PDF encoding တို့အတွက် representative performance budget များထည့်ပါ။

**ပြီးစီးမှုစံ:** Invalid timing data အတွက် deterministic diagnostics ရှိရမည်၊ actual measure boundaries တွင် playback position မလွဲရ၊ raster output တွင် rows မပျောက်ရ/မထပ်ရ၊ performance regression ကို measurable budget ဖြင့်ဖမ်းနိုင်ရမည်။

### P5 — Release / maintenance

- [ ] Engine ကို internal-only ဆက်ထားမည်လား publishable package လုပ်မည်လား ဆုံးဖြတ်ပြီးမှ `version`, export contract, license/attribution နှင့် release checklist ကို တစ်ပြိုင်နက်တည်းပြင်ပါ။
- [ ] Plugin framework ကို concrete integration request မရှိမချင်း မတည်ဆောက်ပါနှင့်။ လက်ရှိ extensibility သည် typed config နှင့် exported functions များမှတစ်ဆင့်ဖြစ်သည်။

## လုပ်ဆောင်မှုအစဉ်

အကြံပြုထားသောအစဉ်မှာ **P0 → P1 → P2 → P2B → P3 → P4 → P5** ဖြစ်သည်။ P0 ဖြေရှင်းပြီး clean baseline တစ်ခုမရမချင်း feature work မှရသော regression များကို ယုံကြည်စိတ်ချစွာ ခွဲခြားရန်ခက်နိုင်သည်။

## R2 SoundFont integration milestone — 2026-11-13

- [x] Notation playback event များတွင် `midiNotes` နှင့် `durationTicks` ထည့်ပြီး Sound Engine scheduling အတွက် typed data ပေးရန်။
- [x] R2 `soundfonts/manifest.json` ကို fetch/cache လုပ်ပြီး versioned SoundFont object path မှ `.sf2/.sf3` တစ်ကြိမ် load လုပ်ရန်။
- [x] SpessaSynth AudioWorklet ဖြင့် SoundFont ကို WebAudio output သို့ချိတ်ပြီး Notation Lab play/pause/volume lifecycle နှင့် ချိတ်ရန်။
- [ ] Unpitched percussion mapping နှင့် MusicXML instrument program/bank routing ကို ထပ်တိုးရန်။


## MuseScore note-source audit — 2026-11-13

Official-source review inspected the MuseScore Studio repository at `main` commit `e32154cc04e12a05f52942cd9dc7b7e7f67685ce`. This is a moving-branch snapshot, not a release tag. The existing engine's `src/musescore/provenance.ts` remains pinned to the earlier `9140c5e4b7b5b48357b8d38dfebd0dd979653d21`; do not silently replace its provenance or tables with the newer snapshot. New reference comparisons must record their own pinned source revision.

Relevant upstream areas identified for later reference-only review:

- Score/note model: `src/engraving/dom/note.h/.cpp`, `pitchspelling.h`, `chord.h`, `chordrest.h`, `rest.h`, `tie.h`, `durationtype.h`, `staff.h`, and `segment.h`. These illustrate note pitch/spelling, duration, chord membership, ties, staff and voice/track semantics, but depend on MuseScore's broader C++ engraving model.
- MusicXML note semantics: `src/importexport/musicxml/internal/import/importmusicxmlnotepitch.cpp/.h`, `importmusicxmlnoteduration.cpp/.h`, `importmusicxmlpass2.cpp`, and `musicxmlvoicedesc.cpp/.h`. Use these as behavior references for pitch, divisions, voices/chords, instrument IDs and unpitched notes; the import pipeline is coupled to MuseScore's score model.
- Engraving: `src/engraving/dom/note.cpp`, `stem.cpp`, `beam.cpp`, `accidental.cpp`, `ledgerline.cpp`, `notedot.cpp`, `tie.cpp`, `clef.cpp`, and `src/engraving/rendering/score/horizontalspacing.cpp`. Derive independent tests and TypeScript geometry rules; do not port the native rendering subsystem as a unit.
- Note entry/editing: `src/notation/inotationnoteinput.h`, `src/notation/internal/notationnoteinput.cpp`, and `src/engraving/editing/noteinput.h`, `editnote.h`, `editduration.h`, `editchord.h`. These are desktop C++/Qt interaction and undo code; treat them as behavior/API references, not browser-engine modules.
- Instrument/Piano/Drum data and semantics: `share/instruments/instruments.xml`, `src/engraving/dom/instrument.h/.cpp`, `drumset.h/.cpp`, and `staff.h/.cpp`. Separate declarative instrument data from rendering and playback behavior; verify per-file notices before considering any data reuse.
- Style/glyph sources: `src/engraving/dom/engravingstyle.h/.cpp`, `symnames.cpp`, and `fonts/bravura/Bravura.json`. Keep glyph metadata and font binaries separate from code; review each font's own license before redistributing it.

The MuseScore repository identifies its program code as **GPL-3.0-only**. Representative note/model/import files carry GPL-3.0-only file headers. The top-level license's font exception is limited to the stated font/document conditions and is not a general permission to copy source code or redistribute webfont assets. This repository has no root license file and the Notation Engine package is currently private; whether GPL-covered implementation can be included in a distributed product is therefore unresolved. This is a compatibility risk, not legal advice.

**Owner direction — 2026-11-14:** reuse the existing Notation Engine code and any external code/assets whose license is verified as compatible, so the team does not reimplement every feature unnecessarily. Adapt notation behavior into the project's own style and split custom note maps by instrument, including Piano and Drum. For code that cannot be reused under the project's confirmed licensing/distribution terms, implement an independent TypeScript version instead.

**Source intake status:** no MuseScore source snapshot has been copied into this repository. GPL-3.0-only source is not automatically prohibited, but it is not considered compatible by default while the engine's release/license policy remains undecided. For now, keep the audited C++ source as pinned links/reference only; first inventory each proposed file and asset's own license. Reuse an external resource only when its terms and required attribution are recorded and compatible with the project. Do not copy Bravura font binaries or GPL C++ note/engraving/import files at this stage. Where source is not approved, derive behavior from public notation formats and test cases, then write independent TypeScript against the existing score model and mapping modules. If a GPL-compatible distribution decision is made later, revisit a clearly separated, non-build reference snapshot with the complete upstream license, per-file notices, exact commit and source manifest. Do not clone/import the entire MuseScore repository.

Official references: [MuseScore repository at audited commit](https://github.com/musescore/MuseScore/tree/e32154cc04e12a05f52942cd9dc7b7e7f67685ce), [upstream license](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/LICENSE.txt), [note model](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/src/engraving/dom/note.h), [MusicXML note pitch import](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/src/importexport/musicxml/internal/import/importmusicxmlnotepitch.cpp), [note-input interface](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/src/notation/inotationnoteinput.h), [instrument catalogue](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/share/instruments/instruments.xml), and [Bravura font license](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/fonts/bravura/LICENSE.txt).
