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

အကြံပြုထားသောအစဉ်မှာ **P0 → P1 → P2 → P3 → P4 → P5** ဖြစ်သည်။ P0 ဖြေရှင်းပြီး clean baseline တစ်ခုမရမချင်း feature work မှရသော regression များကို ယုံကြည်စိတ်ချစွာ ခွဲခြားရန်ခက်နိုင်သည်။
