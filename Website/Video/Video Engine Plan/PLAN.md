# Video Engine Plan — Other Instrument Integrations

## 1. ရည်ရွယ်ချက်နှင့် လက်ရှိအခြေအနေ

ဤအစီအစဉ်သည် Drum Studio ၏ ပထမဆုံး visual-only Video Engine integration ပြီးနောက် Piano, Guitar, Bass, Strings နှင့် Voice တို့ကို အဆင့်လိုက်ချိတ်ဆက်ရန် ဖြစ်သည်။ လက်ရှိ engine သည် VideoEngine ကို အသုံးပြုပြီး canvas frame များကို MP4/WebM အဖြစ် encode/mux လုပ်ပေးသည်။ Instrument တစ်ခုချင်းစီအတွက် event input, visual renderer, optional audio နှင့် UI adapter ကို သီးခြားတည်ဆောက်ရမည်။

အခြေခံအဖြစ် စစ်ဆေးထားသည့် branch/commit: `main` / `0547011`။ လက်ရှိ Drum integration သည် Kick/Snare/Hi-hat pad event များမှ **640×360, 30 FPS, 12 sec အများဆုံး၊ အသံမပါသော visual preview** ကိုထုတ်ပေးသည်။ Studio client သည် လက်ရှိ `drums` သာ enable လုပ်ပြီး အခြား `tool` များကို မရောထွေးစေရန် disable လုပ်ထားသည်။ အောက်ပါအစီအစဉ်အရ adapter ပြီးစီးသည့်အခါမှသာ သက်ဆိုင်ရာ tool ကို enable လုပ်ရမည်။

## 2. Instrument များ၏ လက်ရှိ code အခြေအနေ

| Instrument | Repo ထဲရှိ လက်ရှိအထောက်အထား | Video integration မစတင်မီ လိုအပ်ချက် |
|---|---|---|
| **Guitar** | `Website/Guitar/Guitar Engine` တွင် TypeScript source, built `dist/guitar-engine.js`, tests ရှိသည်။ `positionsAt()`, `stageShapes()`, `renderGuitarStage()` နှင့် measured guitar photo configuration များ ပါရှိသည်။ Note သည် pitch တစ်ခုတည်းမဟုတ်ဘဲ string/fret/finger နှင့် time ဖြစ်သည်။ | Studio event source နှင့် `GuitarNote` mapping မရှိသေး။ Website-loaded bundle သည် `Website/Website/assets` ထဲတွင် မရှိ။ `StageShape` များကို canvas ပေါ်ရေးမည့် painter နှင့် measured photo asset loading ကို စစ်ဆေး/ထည့်ရန်လိုသည်။ README ရှိ lowercase `website/assets` target ကို လက်ရှိ `Website/Website` case-sensitive path နှင့် ညှိရမည်။ Audio မထုတ်ပေးပါ။ |
| **Piano** | `Website/Piano/Piano Hand Human Engine` တွင် keyboard geometry, key press depth/envelope, note-to-finger performance planning နှင့် synthetic finger IK source/tests ရှိသည်။ | Studio note/event input, Piano renderer နှင့် audio source မရှိသေး။ `Piano 3D Hand Engine` folder တွင် `.gitkeep` သာရှိသည်။ Human Engine README အရ wrist-motion planner မပြီးသေး၊ IK ကို site ၏ skinned GLB နှင့် calibrate မလုပ်ရသေး။ Package bundle output ရှိ `website` lowercase ကို `Website/Website` path နှင့် စစ်ရန်လိုသည်။ ပထမအဆင့်တွင် hand animation မပါဘဲ key-only visual render ကို ရည်မှန်းပါ။ |
| **Bass** | Landing page တွင် Bass card ရှိပြီး Notation Engine ထဲတွင် bass-clef/MIDI instrument metadata ရှိသည်။ Guitar Engine ထဲတွင် Jazz Bass ပုံ configuration ပါသော်လည်း ၎င်းတစ်ခုတည်းက Bass instrument workflow ရှိသည်ဟု မဆိုလိုပါ။ | Tracked Bass-specific playable UI, event/audio engine သို့မဟုတ် Video adapter မတွေ့ရသေး။ Product scope က fretted bass ဖြစ်/မဖြစ်နှင့် Guitar Engine ကို ပြန်သုံးနိုင်/မနိုင် အရင်ဆုံးဆုံးဖြတ်ရန်လိုသည်။ Event schema, controls, renderer, audio decision တည်ဆောက်ရန်လိုသည်။ |
| **Strings** | Landing page card နှင့် Notation Engine ထဲရှိ strings tuning/fretted-instrument metadata ရှိသည်။ | Playable Strings source, performance controls/event producer, renderer သို့မဟုတ် audio engine မရှိသေး။ “Strings” သည် orchestral string family လား၊ fretted-string tool လား သတ်မှတ်ပြီးမှ instrument behavior နှင့် event model ကို စတင်ရေးရမည်။ Notation/tuning data သည် playback/render adapter မဟုတ်ပါ။ |
| **Voice** | Landing page card နှင့် generic Studio route သာရှိသည်။ | Voice-specific controls, source recording/import, renderer သို့မဟုတ် audio decoding မရှိသေး။ Microphone capture လား၊ audio file import လား၊ permission/privacy/error handling ဘယ်လိုလုပ်မလဲ ဆုံးဖြတ်ရန်လိုသည်။ Genuine vocal video အတွက် finite duration ရှိပြီး segment နှင့်ကိုက်ညီသော `AudioBuffer` လိုအပ်သည်။ |

### Shared prerequisites

- `Website/Website/studio-video.js` သည် လက်ရှိ Drum-only ဖြစ်သည်။ Tool slug အလိုက် သက်ဆိုင်ရာ adapter ကိုရွေးချယ်သည့် dispatch ကို ထည့်သော်လည်း adapter မပြီးမချင်း unsupported tool ကို disabled/unavailable အဖြစ်ထားရမည်။
- `Website/Notation/Sound Egnine` folder သည် `.gitkeep` သာရှိပြီး Sound Engine implementation ကို မတွေ့ရသေး။ ထို့ကြောင့် audio synthesis ကို ရှိပြီးသား capability ဟု မယူဆရ။ ပထမ visual-only render များသည် audio မပါကြောင်း UI/Doc တွင် ရှင်းရှင်းလင်းလင်း ဖော်ပြရမည်။ အသံလိုအပ်ပါက Sound Engine သို့မဟုတ် import/capture လုပ်ထားသည့် အသံကို `AudioBuffer` အဖြစ်ပေးရန် သီးခြားအဆင့်ထည့်ရမည်။
- Guitar/Piano bundle များ၏ build destination နှင့် production `Website/Website/assets/` path ကို အတည်ပြုပြီး Engine source ↔ production copy sync/check လုပ်ရမည်။ Image/photo assets များကို render မစမီ preload လုပ်ပြီး required asset မရပါက export ကို ရပ်ရန်လိုသည်။

## 3. အားလုံးအတွက် တူညီသော Adapter Contract

Instrument တစ်ခုချင်းစီသည် Video Engine encoder ကို ပြန်မရေးဘဲ instrument-specific adapter သာ ပေးရမည်။ Adapter contract ကို code မရေးမီ အောက်ပါအတိုင်း သတ်မှတ်ပါ။

1. **Dispatch:** normalized tool slug (`guitar`, `piano`, `bass`, `strings`, `voice`) တစ်ခုစီအတွက် သီးခြား adapter ရှိရမည်။ Adapter မရှိသေးပါက existing Drum branch သို့ fall-through မဖြစ်ရ။
2. **Input/event log:** capture သို့မဟုတ် import လုပ်ထားသော event များကို immutable, stable ID ပါသည့် list အဖြစ်ထားပါ။ Time unit ကို milliseconds သို့မဟုတ် seconds တစ်မျိုးတည်း ရွေး၍ event start/end, duration, ordering, empty/invalid input စည်းမျဉ်းများ သတ်မှတ်ပါ။ Instrument data မရှိသည့်အခါ pitch/fingering ကို ခန့်မှန်းမထည့်ရ။
3. **Deterministic renderer:** adapter သည် `draw(ctx, atSeconds, frameIndex)` ကို arbitrary/repeated/non-monotonic time များအတွက် တူညီသော frame result ပေးရမည်။ Live DOM state သို့မဟုတ် wall-clock time ပေါ်မူတည်၍ export frame ကို ဆုံးဖြတ်ခြင်း မလုပ်ရ။
4. **Render request:** `{ width, height, fps, segments, onProgress, shouldStop }` ကို VideoEngine သို့ပေးပါ။ Segment တစ်ခုစီတွင် `seconds` နှင့် `draw` ပါရမည်။ Audio လိုပါက duration/sample rate/channel မှန်ကန်သည့် `AudioBuffer` ကို ထည့်ပါ။ မထည့်ပါက output ကို silent ဟု သတ်မှတ်ပါ။
5. **Assets:** adapter ကိုယ်တိုင် fonts/images/engine bundles ကို load လုပ်ပြီး readiness သေချာမှ export စပါ။ လိုအပ်သော asset မရပါက error ပြပြီး render မစရ။
6. **Shared lifecycle/UI:** status/progress, cancel, error, format/container, Blob URL revoke, preview, playback, seek, download တို့ကို လက်ရှိ Drum workflow နှင့် တူညီသော shared lifecycle မှ အသုံးပြုပါ။ Adapter က encoder/muxer ကို မပိုင်ဆိုင်ရ။

## 4. အကြံပြုထားသော အကောင်အထည်ဖော်မှု အစီအစဉ်

### Phase 0 — Shared foundation နှင့် routing

1. Tool slug → adapter mapping table တစ်ခု ထည့်ပြီး Drum behavior မပြောင်းကြောင်း regression test ထည့်ပါ။ Adapter registry သည် instrument-specific controls/capture, event normalization, `buildSegments()`, asset preparation, cleanup တို့ကို ပေးရမည်။
2. မပြည့်စုံသေးသော instrument အားလုံးကို unavailable state အဖြစ် ဆက်ထားပြီး drum pads မပြ/မသုံးစေရ။
3. Guitar/Piano bundle output path, script load order နှင့် case-sensitive website assets destination ကို အတည်ပြုပါ။ Bundle copy/check command ရှိပါက အသုံးပြုပြီး freshness test ထည့်ပါ။
4. Shared event time convention, output dimensions/FPS ceiling, maximum duration/memory budget, silent-vs-audio UX နှင့် common error messages ကို သတ်မှတ်ပါ။

### Phase 0.5 — Final video layout နှင့် စံ output (2026-11-22 ထပ်ထည့်)

အသေးစိတ်ကို Main Plan ၏ `Create Video — Final video layout` နှင့် `Video ထုတ်လုပ်ပုံ အသေးစိတ်` section များတွင် ကြည့်ပါ။ ဤ phase သည် instrument adapter များ (Phase 1–5) မတိုင်မီ Video Engine ဘက်မှ လိုအပ်သော shared အလုပ်များ ဖြစ်သည်။

1. **စံ output အရွယ်:** Video အားလုံး (Metronome အပါအဝင်) သည် **1920×1080 (16:9) / 1080×1080 (1:1) / 1080×1920 (9:16)** ဖြစ်ရမည်။ အရွယ်ကို Video Engine ၏ shared setting တစ်ခုတည်းမှ သတ်မှတ်ရမည်။ **ပြီးစီး (2026-11-18):** adapter ခုနစ်ခုလုံးသည် ဤဇယားကို ကိုယ်ပိုင် မထားတော့ဘဲ `engine.sizeFor(ratio)` ကို ခေါ်သည် (engine တွင် `DELIVERY_SIZES` + `ratioNames()`); Metronome ၏ ကိုယ်ပိုင် `DIMENSIONS` ကို ဖျက်ထားသည်။ **H.264 level ကို စစ်ပြီး (2026-11-18):** Drum နှင့် Metronome suite နှစ်ခုလုံးသည် output တစ်ခုချင်းစီ၏ `ffprobe` level ကို H.264 Table A-1 နှင့် တိုက်သည် (1920×1080@30 → 8160 MB / 244,800 MB/s၊ level 4.0 လိုသည်; 1080×1080 → 4624 / 138,720၊ level 3.2 လုံလောက်သည်)။ Chromium ၏ encoder က level 4.0၊ High profile ဖြင့် ရေးသည်ကို တိုင်းထားသည်။ **ကျန်ရှိ:** memory budget ကို ဖုန်းအစစ်တွင် မစမ်းရသေးပါ။
2. **၃ ပိုင်း layout template:** Title / Info၊ Notation၊ တူရိယာ အပိုင်း ၃ ခုကို data ဖြင့်ကြေညာ၍ တူရိယာအလိုက် နေရာပြောင်းနိုင်ရမည် (Drum/Piano — Title အပေါ်၊ တူရိယာအောက်။ Guitar — တူရိယာအပေါ်၊ Title အောက်။ Violin — ဘေးတစ်ဖက်၊ Title အောက်)။ Ratio ၃ မျိုးအလိုက် အချိုးကို Main Plan ၏ ဇယားအတိုင်း (default)။ Metronome tool ၏ video တွင် Title / Info အပိုင်း မပါ။
3. **Video အရှည်** = Count Voice (အစ၊ count-in) + MusicXML အရှည် + Thank You video။ `MAX_SECONDS = 12` (Drum) နှင့် Metronome ၏ ၁၂ စက္ကန့် ကန့်သတ်ချက်ကို ဖယ်ပြီး memory guard ကိုသာ safety အဖြစ်ထားရမည်။
4. **Thank You segment:** R2 ထဲရှိ Landscape / Portrait / Square သီးခြားဖိုင်ကို output ratio အလိုက်ရွေး၍ Video အဆုံးတွင် ဆက်ရမည်။ ဖိုင်အမည်၊ path နှင့် ဖိုင်မရလျှင် လုပ်ပုံသည် Video Engine ၏ တာဝန်ဖြစ်ပြီး §3 Adapter Contract (လိုအပ်သော asset မရလျှင် export မစရ) ကို လိုက်နာရမည်။
5. **Title / Info:** Logo (R2 default + အသုံးပြုသူ upload)၊ Title 1 / Title 2 (အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း)၊ `4/4` / `BPM` / `Key` (MusicXML မှ)၊ Metronome icon (beat တိုင်း တုန်ခါ၊ အသံမပါ)။
6. **ရေတွက်ပုံ ရွေးချယ်မှု** (`1,2,3,4` / `1&,…` / `1e&a,…`) သည် Video ပေါ်ရှိ စာသားကိုသာ ပြောင်းသည်။ Count Voice အသံနှင့် မဆက်စပ်။
7. **စစ်ဆေးရမည့် စံနှုန်း:** ratio ၃ မျိုး × တူရိယာအလိုက် layout တွင် `atSeconds` တူလျှင် frame တူခြင်း၊ စုစုပေါင်းအရှည် = Count Voice + MusicXML + Thank You ဖြစ်ခြင်း၊ 1080p memory/encode အောင်မြင်ခြင်း၊ Thank You ကို ratio မှန်ကန်စွာ ဆက်ခြင်း၊ Drum နှင့် Metronome regression အောင်မြင်ခြင်း။

**Phase 0.5 — လက်ရှိအခြေအနေ (2026-11-23 code စစ်ဆေးချက်):**

| # | အချက် | အခြေအနေ |
|---|---|---|
| 1 | စံ output အရွယ် | ✅ Drum, Metronome အပါအဝင် adapter ခုနစ်ခုလုံး `engine.sizeFor()` ကို သုံးသည် — Metronome portrait test တွင် 1080×1920 တိုင်းထားသည်။ H.264 level ကို ratio တစ်ခုချင်းစီတွင် ffprobe ဖြင့် စစ်ပြီး (2026-11-18)။ memory budget ကို ဖုန်းအစစ်တွင် မစမ်းရသေးပါ |
| 2 | ၃ ပိုင်း layout template | ✅ `layoutFor` / `composeFrame` / `requireAsset` + test၊ Doc ရေးပြီး |
| 3 | Video အရှည် = Count Voice + MusicXML + Thank You | ✅ Drum တွင် `MAX_SECONDS` မရှိတော့ — `countIn + notation seconds + Thank You`။ Browser test တွင် 16 s score၊ 6 s count-in ပါ video၊ 6 s Thank You ပါ video ကို တိုင်းထားသည် |
| 4 | Thank You segment | ✅ `engine.thankYouSegment()` ကို `buildTimeline()` က ခေါ်သည်။ `requireAsset` စာချုပ်အတိုင်း clip မရလျှင် (404) ထို segment ကို ချန်ပြီး export ဆက်သည် — test တွင် case နှစ်ခုလုံး စစ်ထားသည် |
| 5 | Title / Info | ✅ Drum Studio တွင် code ရှိပြီး browser တွင် စစ်ပြီး — Title ပြောင်းလျှင် preview တွင် ၃၂၄ ms အတွင်း ပေါ်သည်။ **2026-11-18:** `tools/test-title-info-browser.mjs` က ratio ၃ မျိုးတွင် logo ဘယ်၊ Title 1 ဘေး၊ Title 2 အောက်၊ `4/4`/`BPM`/`Key` အတန်းတူ ဖြစ်ကြောင်း စစ်သည်။ ရှည်လွန်းသော Title သည် 1:1/9:16 တွင် ဘောင်ကျော်နေသည်ကို တွေ့၍ `fitText()` ဖြင့် ဖြတ်ပြီး `…` ထည့်သည် (Title 1/2၊ stats row၊ footer၊ count row အားလုံး) |
| 6 | ရေတွက်ပုံ ရွေးချယ်မှု | ✅ `data-count-display` |
| 7 | စစ်ဆေးရမည့် စံနှုန်း | ✅ browser E2E ရှိ — `tools/test-studio-video-browser.mjs` |
| 8 | **Live Preview** (အသစ်) | ✅ — Main Plan §၁၂ စံနှုန်း ၆ ချက် pass (2026-11-18) |
| 9 | **Notation View ၄ မျိုး** (V6) | ✅ — `tools/test-notation-view-browser.mjs` က `drawImage` offset ကို တိုက်ရိုက်ဖမ်း၍ Page သုံးမျိုး (42/30/30 staff-space အနံ၊ အောက်မှအပေါ်) နှင့် Horizontal (ညာမှဘယ်၊ marker မရွေ့) ကို စစ်သည်။ Direction ကို ရည်ရွယ်၍ ဖျက်ကြည့်သော mutation ၂ မျိုးလုံး test က ဖမ်းမိသည် |

အသေးစိတ် အဆင့်များ (V1–V10) ကို Main Plan ၏ `Create Video — Video ထုတ်လုပ်ပုံ အသေးစိတ်` §၈ တွင် ကြည့်ပါ။

### Phase 1 — Guitar visual adapter (ပထမဦးစားပေး)

**အကြောင်းရင်း:** Guitar Engine တွင် reusable source, tests, built bundle နှင့် SVG stage API ရှိသော်လည်း Studio event source နှင့် Canvas painter မချိတ်ရသေးပါ။ လက်ရှိအထောက်အထားအရ စတင်ရန်အဆင်သင့်ဆုံးဖြစ်သော်လည်း integration ပြီးစီးပြီဟု မယူဆရ။

1. Guitar event များ၏ အရင်းအမြစ်ကို ရွေးပါ: အသုံးပြုသူ၏ strum/fret လုပ်ဆောင်ချက်, MIDI/tab note သို့မဟုတ် score data တို့အနက် ပထမ version အတွက် သင့်လျော်သည့်တစ်ခုကို သတ်မှတ်ပါ။ Event များကို `GuitarNote` ၏ string/fret/finger/start/end/slide/picking fields များနှင့် မှန်ကန်စွာ map လုပ်ပါ။ Pitch တစ်ခုတည်းမှ string/fret ကို ခန့်မှန်းမထည့်ပါနှင့်။
2. Guitar Engine bundle ကို website assets ထဲသို့ တင်ပြီး `GuitarEngine` ကို Studio မှ load လုပ်နိုင်ကြောင်း စစ်ဆေးပါ။
3. Render time တစ်ခုချင်းစီတွင် `positionsAt()`/`stageShapes()` ကို အသုံးပြုပါ။ `StageShape` ၏ rect/circle/path/text/gradient/opacity များကို Canvas သို့ဆွဲမည့် painter ထည့်ပါ။ Photo/image shape များ၊ `href`, measured fret/string coordinates, clipping, scale/color ကိုစစ်ပြီး လိုအပ်သည့်ပုံများကို ကြိုတင် load လုပ်ပါ။
4. ပထမ export ကို event visualization အဖြစ်လုပ်နိုင်သည်။ Guitar Engine က audio မထုတ်ပေးသဖြင့် audio source မရှိပါက silent output ဟု ဖော်ပြပါ။
5. **စစ်ဆေးရမည့် စံနှုန်း:** note များ string/fret ပေါ်တွင် မှန်ကန်စွာပေါ်ခြင်း၊ slide ၏ fractional fret လှုပ်ရှားမှု၊ လိုအပ်သည့် image asset မရှိပါက export ကိုပိတ်ခြင်း၊ `atSeconds` အချိန်တူလျှင် frame တူခြင်း၊ VideoEngine render/cancel/progress/preview/download နှင့် Drum regression အောင်မြင်ခြင်း။

### Phase 2 — Piano key visual adapter

1. Piano event source (live keyboard, MIDI သို့မဟုတ် score/notation) ကိုရွေးပြီး note ID, MIDI pitch, onset/duration, velocity နှင့် chord ordering ကိုသတ်မှတ်ပါ။ Studio တွင် event များထုတ်ပေးမည့် UI/producer ကိုထည့်ပါ။
2. Bundle output path ကိုအတည်ပြုပြီး `Piano Hand Human Engine` ၏ keyboard geometry နှင့် `solvePerformancePlan()` ကိုသုံးပါ။ Frame renderer သည် `keyPressDepthMm()`/contact envelope ကို `atSeconds` မှတွက်၍ ဖိထားသော key များကို deterministic canvas ဖြင့်ဆွဲပါ။
3. ပထမ version ကို key-only visual, silent export အဖြစ်လုပ်ပါ။ Synthetic IK ကို real human hand motion ဟု မဖော်ပြရ။ `Piano 3D Hand Engine` သည် လက်ရှိ empty ဖြစ်သဖြင့် မရှိသေးသော renderer ကို dependency အဖြစ် မသုံးရ။
4. **စစ်ဆေးရမည့် စံနှုန်း:** note mapping, range/out-of-range, chord, attack/hold/release, seek/repeated frame, no-note/cancel/error, render metadata/playback/download နှင့် Drum/Guitar regression အောင်မြင်ခြင်း။

### Phase 3 — Bass adapter သို့မဟုတ် Bass engine

1. Bass သည် fretted bass လား၊ bass synthesizer/keyboard လား ဆုံးဖြတ်ပါ။ Fretted bass ဖြစ်ပါက Guitar Engine ၏ string/fret/photo capability များကို ပြန်သုံးနိုင်မနိုင် prototype ဖြင့်အတည်ပြုပါ။ Jazz Bass ပုံရှိရုံဖြင့် instrument logic ပြီးစီးပြီဟု မယူဆရ။
2. Bass သီးသန့် input UI, timestamped event schema, tuning/visual model နှင့် deterministic renderer ကိုထည့်ပါ။ လက်ရှိ Bass card/notation metadata သည် playable Engine မဟုတ်ပါ။
3. **စစ်ဆေးရမည့် စံနှုန်း:** route/control ခွဲခြားမှု, note-on/off timing, pitch/position mapping, deterministic frame sampling, silent သို့မဟုတ် AudioBuffer output ဆုံးဖြတ်ချက်, export lifecycle နှင့် empty/invalid event tests အောင်မြင်ခြင်း။

### Phase 4 — Strings adapter သို့မဟုတ် Strings engine

1. “Strings” ဆိုသည်မှာ orchestral string family (violin/viola/cello စသည်) လား၊ fretted-string instrument လား သတ်မှတ်ပါ။ Tuning, notation data, event semantics, visual motion နှင့် sound source ကိုဆုံးဖြတ်ပါ။
2. Notation Engine ၏ tuning metadata ကို လိုအပ်ပါကသာ ပြန်သုံးပါ။ Notation သည် visualization, playback သို့မဟုတ် adapter အစားထိုးမဟုတ်ကြောင်း ခွဲခြားပါ။ Instrument input, event producer, renderer နှင့် assets ကို သီးခြားအကောင်အထည်ဖော်ပါ။
3. **စစ်ဆေးရမည့် စံနှုန်း:** Strings route တွင် Drum UI မပေါ်ခြင်း၊ event timing, instrument-specific motion, seek/repeated frames, audio/silent policy နှင့် export/cancel/error/download tests အောင်မြင်ခြင်း။

### Phase 5 — Voice adapter နှင့် အသံ input

1. Voice input သည် microphone recording လား၊ audio file import လား၊ နှစ်မျိုးလုံးလား ဆုံးဖြတ်ပါ။ Permission/privacy, recording start/stop, file validation, decode failure, maximum duration နှင့် waveform/visual style ကို သတ်မှတ်ပါ။
2. အသံဖိုင်/recording ကို decode လုပ်၍ segment duration နှင့်ကိုက်ညီသော finite `AudioBuffer` ထုတ်ပေးပါ။ VideoEngine သို့ audio မပေးပါက vocal export မဖြစ်ဘဲ silent output ဖြစ်သည့်အချက်ကို UI တွင်ရှင်းပြပါ။
3. **စစ်ဆေးရမည့် စံနှုန်း:** permission denial, input validation/decode error, finite duration, audio/video sync, known sample ဖြင့် audible render, cancellation, playback/download/cleanup အောင်မြင်ခြင်း။

### Phase 6 — Shared audio နှင့် အဆင့်မြင့် render (အခြား phase များနှင့် မရောထွေးစေရ)

1. Audio လိုအပ်သော instrument များအတွက် empty `Sound Egnine` folder ကို implementation ရှိသကဲ့သို့ မယူဆဘဲ sound provider သို့မဟုတ် uploaded/captured audio ရွေးချယ်ပါ။ AudioBuffer format, sample rate/channels, offset, segment boundary နှင့် codec fallback ကို သတ်မှတ်ပါ။
2. Piano human-hand visualization ကို သီးခြား project အဖြစ်သာ ဆက်လုပ်ပါ။ Wrist trajectory planner, renderer နှင့် site GLB bone/wrist/fingertip/joint-axis calibration, contact residual threshold များ မပြီးမချင်း “လက်ချောင်းက key ကိုမှန်ကန်စွာထိသည်” ဟု မဆိုရ။
3. MediaRecorder fallback ကို real browser/device တွင် သီးခြားစမ်းပါ။ `muxMp4ToStream()` အတွက် end-to-end incremental muxing လိုအပ်ကြောင်း သက်သေရှိမှ သီးခြား memory design/test လုပ်ပါ။

## 5. Cross-instrument စမ်းသပ်မှုအစီအစဉ်

- **Dispatch regression:** drums နှင့် metronome သည် ကိုယ့် adapter သာရွေးပြီး မှန်ကန်စွာအလုပ်လုပ်ရမည်။ Piano/Guitar/Bass/Strings/Voice ကို အကောင်အထည်ဖော်ပြီးမှ သက်ဆိုင်ရာ adapter သို့ route ချိတ်ရန်။ Unsupported route သည် drum controls သို့မဟုတ် false success မပြရ။
- **Event contract:** stable IDs, time unit, ordering, start/end boundary, duration derivation, chords/simultaneous events, empty/invalid/out-of-range data ကို per instrument စမ်းပါ။
- **Frame determinism:** event မတိုင်မီ၊ onset, attack, sustain, release, end, repeated timestamp, random/non-monotonic seek time တို့တွင် တူညီသော time အတွက် တူညီသော frame ရလဒ်ရရမည်။
- **Render lifecycle:** dimensions/FPS/frame count/duration/container/extension, progress, cancel, cleanup, Blob URL revoke, preview/play/seek/download, retry/error ကို စစ်ပါ။
- **Assets:** bundle/image/font load failure ကိုဖော်ပြပါ။ လိုအပ်သော asset မပြည့်စုံပါက export ကိုမစပါနှင့်။ Asset အားလုံး ready ဖြစ်မှ render လုပ်ပါ။
- **Audio policy:** audio မပါလျှင် output ကို silent ဟု မှန်ကန်စွာတင်ပြပါ။ ပါလျှင် `AudioBuffer` type, duration, sample rate/channels, timeline offset, audibility နှင့် video duration ကို ffprobe/browser ဖြင့်စစ်ပါ။
- **Renderer/fallback:** WebCodecs output ကို ffprobe/decoder ဖြင့်ဖွင့်စစ်ပြီး MediaRecorder fallback ကို support ရှိသည့် browser များတွင် သီးခြားစမ်းပါ။ Phone viewport စစ်ခြင်းသည် real-device compatibility proof မဟုတ်ကြောင်း မှတ်သားပါ။

## 6. ပြီးစီးမှု သတ်မှတ်ချက်

Instrument adapter တစ်ခုကိုပြီးစီးပြီဟု သတ်မှတ်ရန်: (1) instrument-specific input/event source ရှိရမည်; (2) renderer သည် arbitrary frame time များတွင် deterministic ဖြစ်ရမည်; (3) required bundles/assets readiness အတည်ပြုရမည်; (4) VideoEngine preview/export, progress/cancel/error/download lifecycle အလုပ်လုပ်ရမည်; (5) silent-vs-audio behavior ကိုမှန်ကန်စွာပြရမည်; (6) tests, phone/web layout review နှင့် shared Drum regression အောင်မြင်ရမည်; (7) သက်ဆိုင်ရာ Plan/Doc update လုပ်ပြီး အောင်မြင်သော commit ကို `main` သို့ push လုပ်ထားရမည်.


## 7. Studio settings UI foundation — completed in current work

The shared Studio left control panel now includes the first configuration surface for every instrument route:

- MusicXML file selection (`.musicxml`, `.xml`, `.mxl`) with selected filename state
- Logo image selection with preview-render asset loading
- Title 1 and Title 2 text fields
- Drum selection (`Full Kit`, `Kick`, `Snare`, `Hi-hat`) that limits active capture pads
- Notation View selection (`Drum Roll`, `Standard`, `Minimal`)
- Sound Model selection (`Visual Only`, `Studio Drums`, `R2 Sound Model`)
- Count Voice text field
- Video Color picker
- Video Ratio selection (`16:9`, `1:1`, `9:16`)
- Generate Video action using the captured event log and the shared VideoEngine lifecycle

The settings are implemented in `Website/Website/studio.html`, styled responsively in `Website/Website/styles.css`, and connected in `Website/Website/studio-video.js`. Ratio changes affect the render dimensions; title, subtitle, logo, notation mode, count label, and accent color affect the generated visual frame.

### Remaining implementation boundaries

Drum adapter သည် visual-only ဖြစ်သည်။ Metronome adapter ကို Studio route၊ SVG renderer နှင့် သီးခြား synthesized click-track `AudioBuffer` ဖြင့် ချိတ်ဆက်ပြီးဖြစ်သည်။ Drum MusicXML/audio/count limitations များကို Studio history အတိုင်း ဆက်လက်ဖြည့်ရန်ရှိသည်။ Guitar, Piano, Bass, Strings, Voice adapters များကို event source, deterministic renderer, asset readiness နှင့် audio policy သတ်မှတ်ပြီးမှ ချိတ်ဆက်ရန်။


## 8. Studio settings revision — current work

The Studio settings panel was revised to remove the Kick, Snare, and Hi-hat pad boxes. MusicXML is now the primary optional event source; when no supported MusicXML event list is available, Generate Video uses a deterministic default drum pattern so the action remains usable.

MusicXML and Logo inputs share one file row on desktop. If no custom logo is selected, the production asset `Website/Website/assets/logo/m-sharing-drum-logo.svg` is used. Title 1 and Title 2 now expose independent text color and font-size controls. Drum selection is split into a writable Brand field and a Model selector. Notation View now offers Page Landscape, Page Portrait, and Page Square.

Sound Model now has model choices and a volume control. Count Voice has an Off/On control, two voice/count styles, and a separate volume control. Video Color is now a Black/White background choice; Video Ratio remains 16:9, 1:1, or 9:16.

The current render remains silent/visual-only. Sound Model and Count Voice settings are rendered as metadata and retained for the future audio adapter; actual audio synthesis and spoken count generation remain pending.


## 9. Latest UI clarification — current work

The logo field no longer displays a redundant default-logo text label. The logo preview itself remains available, and the built-in M Sharing Drum Logo is used whenever no custom logo file is selected. Drum Brand is now a selector rather than free text. Sound Model and Sound Volume are grouped vertically in one control block, matching the Count Voice and Count Volume arrangement.

The standard video output is now `1920×1080` for the 16:9 option. Square and portrait options use `1080×1080` and `1080×1920`. The preview stage has an independent fixed 16:9 frame so its box remains stable when a video loads or when a portrait/square output is selected.


## Metronome adapter — completed 2026-11-14

Create Video ရှိ Metronome card ကို dedicated `studio-metronome.js` adapter နှင့် shared Video Engine သို့ ချိတ်ထားသည်။ `studio-video.js` သည် Metronome route တွင် Drum workflow ကို မစတင်စေပါ။ Metronome Engine IIFE bundle (`window.MetronomeDesigns`) ကို `Website/Website/assets/metronome-engine.js` တွင် serve လုပ်ပြီး `sync-metronome-engine.mjs` က `dist` source နှင့် sync ကိုစစ်သည်။

Adapter သည် Engine design 11 မျိုး၊ 16:9/9:16/1:1, quarter-note BPM, meter နှင့် bars ကို အသုံးပြုသည်။ Frame time မှ beat/bar/phase ကို deterministic တွက်ပြီး SVG ကို Video Engine canvas သို့ဆွဲသည်။ **(2026-11-18 တွင် ပြောင်းပြီး)** Output အရွယ်သည် Video Engine ၏ shared `sizeFor()` မှ 1920×1080 / 1080×1920 / 1080×1080 ဖြစ်ပြီး 12 sec ကန့်သတ်ချက်ကို ဖယ်ထားသည်။

Audio သည် Engine shared sound capability မဟုတ်ပါ။ Adapter က `OfflineAudioContext` မှ downbeat accent ပါသော click track `AudioBuffer` ဖန်တီး၍ shared Video Engine render ထဲထည့်သည်။ Preview, progress/cancel, play/seek/download ပါဝင်သည်။

**စမ်းသပ်မှု:** Engine 20/20, Video Engine muxer 15/15, cleanup/safety 5/5; Chromium Engine MP4 smoke, latest Drum Studio MP4 export/regression နှင့် Metronome homepage-card-to-export flow pass. Metronome output သည် 3/8, quarter-note 96 BPM, 1 bar တွင် 28 frames/0.933 sec, 1080×1920 VP8 နှင့် 48 kHz mono Opus ဖြစ်ကြောင်း `ffprobe` ဖြင့်စစ်ထားသည်။ Phone 375×812, desktop 1280×900 layout တွင် overflow မရှိ။

**လက်ကျန်:** ဖုန်းအစစ်/Safari/Firefox နှင့် MediaRecorder-only fallback; logo asset policy; Engine source input/XML escaping edge cases. **design 11 မျိုး browser visual snapshots — ပြီးပါပြီ (2026-11-18):** `test-metronome-studio-browser.mjs` က design တစ်ခုချင်းစီကို page ၏ preview လမ်းကြောင်းဖြင့် ဆွဲပြီး 240×240 canvas သို့ ချကာ လင်းနေသော sample အရေအတွက် (အလွတ် မဖြစ်ရ) နှင့် hash ကို စစ်သည်။ design နှစ်ခု တူညီသော frame ဆွဲလျှင် ကျရှုံးသည် — တစ်ခု အလုပ်မလုပ်နေခြင်းကို ဖမ်းရန်။ Guitar ကို နောက်ဦးစားပေးအဖြစ် ဆက်လုပ်ပြီး Piano, Bass, Strings, Voice ကို သီးခြား adapter ဖြင့်သာ ချိတ်ဆက်ရန်။

## Piano adapter — Phase 2 ပြီးစီး (2026-11-23)

Phase 2 ၏ ပန်းတိုင်ဖြစ်သော key-only visual adapter ကို ချိတ်ဆက်ပြီးပါပြီ။

1. **Event source (§2.1)** — MusicXML ကို ရွေးထားသည်။ Adapter သည် pitched note တစ်ခုချင်းစီကို MIDI pitch, onset, duration အဖြစ် ဖတ်ပြီး tie ၏ အပိုင်းနှစ်ခုကို အသံတစ်ခုတည်းအဖြစ် ပေါင်းသည်။ Chord တစ်ခုကို key များအဖြစ် တစ်ပြိုင်နက် ဖိနေသည့်အတိုင်း ဆွဲသည်။ Pitch မရှိသော note ကို ခန့်မှန်း မထည့်ပါ။
2. **Renderer (§2.2)** — `buildKeyboard()` ၏ geometry နှင့် `keyPressDepthMm()` ကို `atSeconds` မှ တွက်၍ ဆွဲသည်။ Wall-clock time နှင့် live DOM state ကို မဖတ်သဖြင့် မည်သည့် time ကို ပြန်ခေါ်လျှင်လည်း frame တူသည်။
3. **Key-only, audible (§2.3)** — `Piano 3D Hand Engine` သည် empty ဖြစ်သဖြင့် dependency အဖြစ် မသုံးပါ။ Synthetic IK ကို လူ့လက်ဟု မဖော်ပြပါ။ Score ၏ pitched note တစ်ခုချင်းစီကို `OfflineAudioContext` ဖြင့် partial ခြောက်ခုဖြင့် synthesize လုပ်သဖြင့် export တွင် အသံ ပါသည်။
4. **စံနှုန်း (§2.4)** — note mapping, range/out-of-range, chord, attack/hold/release, seek/repeated frame, no-note/cancel/error, render metadata/playback/download နှင့် Drum/Guitar/Metronome regression အားလုံး စစ်ပြီးဖြစ်သည်။

**အရှည် (§7 စည်းမျဉ်း):** Count Voice + MusicXML အရှည် + Thank You clip။ Adapter တွင် ကိုယ်ပိုင် `MAX_SECONDS` မထားပါ; Video Engine ၏ memory guard သာ safety ဖြစ်သည်။

**Bundle:** `Website/Piano/Piano Hand Human Engine/tools/sync-piano-engine.mjs` က `dist/piano-hand-engine.js` ကို `Website/Website/assets/piano-hand-engine.js` သို့ copy လုပ်ပြီး `--check` ဖြင့် stale copy ကို ဖမ်းသည်။ Guitar Engine ၏ ပုံစံအတိုင်း ဖြစ်သည်။

**ကျန်ရှိ:** Sound Engine သို့မဟုတ် uploaded audio ကို Piano အသံအဖြစ် အစားထိုးချိတ်ခြင်း နှင့် hand/wrist animation သည် သီးခြား project အဖြစ် ကျန်သည်။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။ Bass ကို နောက်ဦးစားပေးအဖြစ် ဆက်လုပ်ရန်။

## Drum kit visual (R2 hotlink) — 2026-11-18

Drum adapter ၏ instrument band သည် ယခု R2 ရှိ kit ဓာတ်ပုံများကို တိုက်ရိုက် hotlink လုပ်ပြီး ဆွဲသည်။ Lane chart ကို မဖျက်ပါ — kit မရလျှင် သို့မဟုတ် `DrumKit` module မတင်လျှင် ထို chart သို့ ပြန်ကျသည်။

1. **ပုံရင်းမြစ်** — `https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/drums/{Brand}/{Model}/{ratio}/`။ Bucket က `Access-Control-Allow-Origin: *` ပြန်ပေးသဖြင့် PNG များကို canvas ထဲ ဆွဲပြီး encode လုပ်နိုင်သည်။ Download မလုပ်ပါ၊ cache လုပ်သည်။
2. **ဖိုင် အမည်စည်းမျဉ်း** — `Drum Bg.png` သည် kit ကိုယ်ထည်; hit ပုံများသည် GM note ဖြစ်သည်။ လက်က `R38.png`/`L38.png` (sticking engine က ဘယ်/ညာ ဆုံးဖြတ်သည်); ခြေက `36.png` ကဲ့သို့ ဘေး မပါသော အမည်။ တူညီသော drum ကို ပြသည့် GM note များ (35/36 ကဲ့သို့) ကို engine ၏ GM map မှ ဖတ်၍ အရန် အမည်အဖြစ် သုံးသည်။
3. **Note ဖတ်ခြင်း** — `midi-unpitched` ကို တစ်ကြိမ် ဖတ်ပြီး 1-based မှ 0-based သို့ ချိန်သည် (Notation Engine နှင့် တူညီအောင်)။ GM note မပါသော score တွင် hit ပုံ မပေါ်နိုင်သဖြင့် kit ဓာတ်ပုံကို သာ ဆွဲသည်။
4. **အချိန် တူညီမှု** — Hit များသည် Notation Engine ၏ tempo map နှင့် repeat ဖြေရှင်းချက်ကို သုံးသည်။ `at` သည် segment အတွင်း စက္ကန့်ဖြစ်သဖြင့် မည်သည့် frame ကို ပြန်ခေါ်လျှင်လည်း ပုံတူသည်။ Hit ပုံသည် 0.11 sec သာ လင်းသည်။
5. **မအောင်မြင်လျှင်** — R2 မရခြင်း၊ ပုံ မရှိခြင်း၊ module မတင်ခြင်း အားလုံးတွင် export ကို မရပ်ပါ; lane chart သို့ ပြန်ကျပြီး status တွင် အကြောင်း ပြသည်။
6. **Brand/Model** — Select နှစ်ခုသည် bucket ၏ folder အမည်နှင့် ကိုက်ညီသည်။ Brand ပြောင်းလျှင် Model list ကို ထို brand ၏ kit များဖြင့် ပြန်ဖြည့်သည်။
7. **စမ်းသပ်မှု** — `test-studio-video-browser.mjs` တွင် kit ဓာတ်ပုံ ပေါ်ခြင်း (band colour count), limb → ဖိုင် အမည် တိုက်ဆိုင်ခြင်း, နှင့် `midi-unpitched` ပါသော score ဖြင့် hit overlay က band ကို ပြောင်းခြင်းတို့ကို စစ်သည်။ Drum Studio export regression အားလုံး ဆက်လက် အောင်မြင်သည်။

## Bass, Strings နှင့် Voice adapters — ပြီးစီး (2026-11-18)

Plan ၏ Phase 3, 4, 5 ကို adapter သုံးခုဖြင့် ချိတ်ပြီးဖြစ်သည်။ ဤအပိုင်းသည် အပေါ်ရှိ Phase စာသားများကို အစားထိုးခြင်းမဟုတ် — ဘာပြီးသွားပြီး ဘာကျန်သည်ကို မှတ်တမ်းတင်ခြင်းသာ ဖြစ်သည်။

### Bass — `studio-bass.js` (visual-only)

1. **Fretted bass အဖြစ် ဆုံးဖြတ်ပြီး** Guitar Engine ကို ပြန်သုံးသည်။ `JAZZ_BASS_DRAWN` နှင့် `PRECISION_BASS_DRAWN` တို့၏ measured ကို အသုံးပြုပြီး ကြိုး ၄ ကြိုး/ဖရက် ၂၀ ကို ဆွဲသည်။ ကြိုးလိုင်းများကို ပုံ၏ ကိုယ်ပိုင် တိုင်းထားချက်မှ ဖြန့်သဖြင့် နှစ်ခု မထပ်ပါ၊ ပုံ၏ လည်ပင်းအပြင် မရောက်ပါ။
2. **Note အရင်းအမြစ်** — `<string>`/`<fret>` အတွဲကို ရေးထားသည့်အတိုင်း သုံးသည်။ Tablature မပါသော note ကို pitch မှ အနိမ့်ဆုံး fret အဖြစ် တွက်သည် (Bass Engine တွင် `analyzeBass` မရှိသေးသဖြင့် ထို စည်းမျဉ်းသည် adapter ထဲတွင် ရှိသည်)။ E1 အောက် မရောက်သော score ကို ငြင်းသည် — လည်ပင်း အလွတ် မဆွဲပါ။
3. **အသံ မထုတ်ပါ** (silent)။
4. **စမ်းသပ်မှု** — `tools/test-bass-studio-browser.mjs` က Chromium တွင် တကယ့် page ကို မောင်းပြီး ffprobe ဖြင့် တိုင်းသည်: 1080×1920 portrait၊ score ၏ 4.00 s၊ audio stream မပါ၊ Thank You clip ၏ အရှည်နှင့် အသံ ပါ၊ ကြိုး ၄ ကြိုး/ဖရက် ၂၀၊ shape determinism၊ cancel လုပ်လျှင် ဖိုင် မကျန်၊ ဖုန်း/desktop တွင် overflow မရှိ။ **PASS**။

### Strings — `studio-violin.js` (drawing-only)

1. **Violin ပုံ တစ်ပုံသာ** ရှိသည် (`assets/violin/violin.svg`)။ ထို ပုံကို ဆွဲသည်။
2. **ဘာမှ အမှတ်အသား မထားပါ** — violin တွင် ဖရက် မရှိ၊ fingering engine မရှိသဖြင့် နေရာ ခန့်မှန်း မထည့်ပါ။ Summary တွင် ထို အချက်ကို ပြသည်။
3. **Layout** — `violin` template၊ 16:9/1:1 တွင် notation ဘယ်/violin ညာ၊ 9:16 တွင် အပေါ်အောက် ထပ်၍ အောက်ဆုံးတွင် Title/Info။
4. **စမ်းသပ်မှု** — `tools/test-violin-studio-browser.mjs`။ 9:16 က 1080×1920/4.00 s၊ 16:9 က 1920×1080၊ 2 s Thank You clip ဖြင့် 6.00 s နှင့် clip အသံ ပါ။ Violin ၏ band/column ကို pixel ဖြင့် ရေတွက်သဖြင့် အလွတ် မဖြတ်နိုင်ပါ။ **PASS**။

### Voice — `studio-voice.js` (audible)

1. **အသံ ပါရမည့် တစ်ခုတည်းသော export။** ဖိုင် import သို့မဟုတ် microphone recording ကို `AudioBuffer` အဖြစ် decode ပြီး segment ၏ `audio` အဖြစ် ပေးသည်။ Waveform ကို ထို buffer မှ ဆွဲသဖြင့် မြင်ရသည်နှင့် ကြားရသည် တစ်ခုတည်း။
2. **Layout** — `voice` template: Title band အောက် waveform။ Voice တွင် notation/instrument event မရှိပါ။
3. **ကန့်သတ်ချက်** — permission ငြင်းခြင်း၊ decode မရခြင်း၊ အလွတ် recording၊ 300 s နှင့် 64 MB ကန့်သတ်ချက်များကို render မစမီ ပြသည်။
4. **စမ်းသပ်မှု** — `tools/test-voice-studio-browser.mjs`။ တိတ်ဆိတ်ခြင်း → A440 WAV ထည့်ပြီး အသံ level၊ pitch (439.4 Hz)၊ mono 48 kHz၊ ကျယ်သော/တိတ်သော အပိုင်း waveform အထူ၊ microphone လမ်းကြောင်း၊ permission ငြင်းခြင်း၊ decode မရခြင်း၊ cancel တို့ကို တိုင်းသည်။ **PASS**။

### ကျန်ရှိ (ဤသုံးခုအတွက်)

- ဖုန်းအစစ်၊ Safari/Firefox၊ MediaRecorder-only fallback — မစစ်ရသေးပါ။
- Bass: ကြိုး ၅ ကြိုး model၊ နှင့် `analyzeBass` ကို Bass Engine ထဲ ရွှေ့ခြင်း။
- Strings: viola/cello ပုံနှင့် တိုင်းတာချက် သီးခြား လိုအပ်သည်; bowing/fingering engine မရှိသေးပါ။
- Voice: Sound Engine နှင့် ချိတ်ဆက်ခြင်း (လက်ရှိတွင် အသံကို decode လုပ်သည့် လမ်းကြောင်းသာ ရှိသည်)။

## `.mxl` score support — ပြီးစီး (2026-11-18)

Main Plan §၂ နှင့် §၃ တွင် `.musicxml`/`.xml`/`.mxl` သုံးမျိုးလုံးကို ဖတ်ရမည်ဟု သတ်မှတ်ထားသည်။ ယခင် code တွင် `.mxl` ကို နှစ်နေရာက ပယ်ထားသည်: `prepareNotation()` က notation ကို ချန်ပြီး `null` ပြန်သည်၊ Drum Studio ၏ `parseMusicXml()` ကလည်း `null` ပြန်သဖြင့် default drum pattern သို့ ကျသည်။ Piano/Guitar/Bass/Violin တို့တွင်မူ `file.text()` ကို တိုက်ရိုက် ခေါ်သဖြင့် ZIP bytes ကို XML အဖြစ် parse လုပ်ရန် ကြိုးစားသည်။

1. **တစ်နေရာတည်း ဖတ်ခြင်း** — Video Engine တွင် `readScoreText(file)` ထည့်သည်။ `.mxl` မဟုတ်လျှင် `file.text()`၊ `.mxl` ဖြစ်လျှင် `arrayBuffer()` → Notation Engine ၏ `unzipMxl()` (ကိုယ်ပိုင် ZIP reader မရေးပါ)။ `unzipMxl()` က `META-INF/container.xml` မှ တကယ့် score path ကို ရှာသဖြင့် entry အမည် ခန့်မှန်းရန် မလိုပါ။
2. **မအောင်မြင်လျှင် အသံထွက်စွာ ငြင်းခြင်း** — `xmlText` မရလျှင် `diagnostics` မှ အကြောင်းပြချက်ကို ယူ၍ `Error` ပစ်သည်။ အလွတ် sheet သို့မဟုတ် default pattern သို့ တိတ်တဆိတ် မကျပါ (Main Plan §၃ "လိုအပ်သော asset မရလျှင် export မစရ" စည်းမျဉ်းနှင့် တူညီသည်)။
3. **ခေါ်သူအားလုံး ချိတ်ခြင်း** — `prepareNotation()` နှင့် studio ငါးခု (Drum `parseMusicXml`, Piano, Guitar, Bass, Violin) က ဤ helper ကို သုံးသည်။ `studio.html` ရှိ input ခြောက်ခုလုံး၏ `accept` တွင် `.mxl` ပါသည်။
4. **စမ်းသပ်မှု** — `tools/test-mxl-score-browser.mjs`။ `simple-single-voice.mxl` ကို တကယ့် page ထဲ ထည့်ပြီး (က) ထွက်လာသော စာသားသည် archive ကိုယ်တိုင် `unzipMxl` ဖြင့် ဖတ်သည့် စာသားနှင့် တူခြင်း၊ (ခ) Notation က 4.00 s ရှိခြင်း၊ (ဂ) `page` mode ဖြစ်ခြင်း၊ (ဃ) pixel အနက် 69,503 ရှိသဖြင့် မှတ်စု တကယ် ဆွဲခြင်း၊ (င) ZIP မဟုတ်သော ဖိုင်ကို အကြောင်းပြချက်ဖြင့် ငြင်းခြင်း၊ (စ) input ခြောက်ခုလုံး `.mxl` ကမ်းလှမ်းခြင်း ကို စစ်သည်။ mutation (`.mxl` ကို `file.text()` ပြန်ဖြစ်စေ) ကို test က ဖမ်းမိသည်။
5. **ကျန်ရှိ** — Metronome Studio သည် MusicXML ကို video timing သို့ မချိတ်ရသေးသဖြင့် `.mxl` ဖိုင်ကို လက်ခံပြီး အမည်သာ ပြသည် (Main Plan §၈ တွင် သီးခြား အလုပ်)။

## Delivery size စစ်ဆေးမှု — ratio ၃ မျိုးလုံး (2026-11-18)

Main Plan B1 က Metronome Studio အပါအဝင် video အားလုံးကို 1920×1080 / 1080×1080 / 1080×1920 ဖြင့် ထုတ်ရန် သတ်မှတ်သည်။ Code တွင် adapter ခုနစ်ခုလုံး `engine.sizeFor(aspect)` ကို ခေါ်ပြီးသားဖြစ်သည်။

ပြဿနာမှာ **စမ်းသပ်မှု** ဘက်တွင် ဖြစ်ခဲ့သည် — Drum suite က 16:9 နှင့် 9:16 ကိုသာ၊ Metronome suite က 9:16 ကိုသာ တိုင်းခဲ့သည်။ 1:1 တွင် 720p ဖြင့် ထွက်နေလျှင် မည်သည့် test မှ မဖမ်းမိနိုင်ပါ။ ယခု suite နှစ်ခုလုံးက ratio ၃ မျိုးလုံးကို render လုပ်ပြီး `ffprobe` ဖြင့် တိုင်းသည်:

| Suite | 16:9 | 1:1 | 9:16 |
|---|---|---|---|
| Drum (`test-studio-video-browser.mjs`) | 1920×1080 | 1080×1080 | 1080×1920 |
| Metronome (`test-metronome-studio-browser.mjs`) | 1920×1080 | 1080×1080 | 1080×1920 |

ဖိုင်အမည်ကိုပါ စစ်သည် (`…-1x1-drum`၊ `metronome-<design>-1x1`)၊ ထို့ကြောင့် ratio တစ်ခုအမည်တပ်ပြီး အခြားတစ်ခု၏ pixel ပါနေလျှင်လည်း ဖမ်းမိမည်။ Metronome run သည် နောက်ဆုံးတွင် 9:16 သို့ ပြန်ချိန်သည် — နောက်လိုက်သည့် determinism စစ်ဆေးမှုက portrait ကို ပြန် render လုပ်သောကြောင့်။

**ပြင်ခဲ့သည့် Doc ကိန်းဂဏန်း:** piano/bass/voice/violin ၏ 9:16 output ကို "720×1280" ဟု ရေးထားခဲ့ရာ test များ၏ 1080×1920 နှင့် မကိုက်သဖြင့် ၄ ခုကို ပြင်သည်။ Metronome ၏ "720×720" ရွေးချယ်မှုလည်း မရှိတော့သဖြင့် ဖယ်သည်။

**ကျန်ရှိ:** 1080p encode ကို ဖုန်းအစစ်တွင် မစမ်းရသေးပါ — memory guard ကို Chromium desktop တွင်သာ စမ်းထားသည်။

## Metronome Studio ၏ input/edge-case စမ်းသပ်မှု (2026-11-18)

Metronome Engine Plan ၏ "နောက်ထပ်လုပ်ရန်" ပထမအချက်မှာ cancel၊ `OfflineAudioContext` မရခြင်း နှင့် မမှန်သော input တို့ကို စစ်ရန် ကျန်ခဲ့သည်။ ယခု `tools/test-metronome-studio-browser.mjs` တွင် ထည့်ပြီး:

1. **မမှန်သော input** — အလွတ် tempo၊ bars 99၊ နှင့် မသိသော design သုံးမျိုးလုံးတွင် render ခလုတ်ကို ပိတ်ထားပြီး status တွင် အကြောင်းပြချက် ပြသည်။
2. **Cancel** — 384 sec setting ကို render စပြီး အလယ်တွင် cancel လုပ်လျှင် "cancelled" ဟု ပြ၊ ခလုတ်သည် `Render metronome video` သို့ ပြန်၊ control များ ပြန်ပွင့်၊ download link နှင့် `<video>` မကျန်။
3. **`OfflineAudioContext` မရှိခြင်း** — constructor ကို ဖျောက်ထားလျှင် "cannot create the metronome click track" ဟု အကြောင်းပြချက်ဖြင့် ငြင်းပြီး ဗီဒီယို မထုတ်။ ပြန်ထည့်ပြီးနောက် preview နှင့် render ခလုတ် ပြန်အလုပ်လုပ်သည်။

**Code ပြောင်းလဲမှု တစ်ခုသာ:** `studio-metronome.js` ၏ `readSettings()` သည် မသိသော design ကို ယခု ငြင်းသည်။ Engine က မသိသော design ကို ပထမ design (`pendulum`) သို့ fallback လုပ်သဖြင့် ယခင် page သည် panel က မကမ်းလှမ်းခဲ့သော ဗီဒီယိုကို တိတ်တဆိတ် ထုတ်နိုင်ခဲ့သည်။

**ကျန်ရှိ:** 1080p encode ကို ဖုန်းအစစ်တွင် မစမ်းရသေးပါ — memory guard ကို Chromium desktop တွင်သာ စမ်းထားသည်။

## Drum kit ပုံမရှိသော note ကို အမည်ဖြင့် ပြခြင်း (2026-11-18)

§3 Adapter Contract ၏ "လိုအပ်သော asset မရလျှင် မည်သည့်အရာ လျော့နည်းသွားသည်ကို ဖော်ပြရမည်" စည်းမျဉ်းအတွက် Drum kit တွင် ကွာဟမှု တစ်ခု ရှိခဲ့သည်။ `DrumKit.loadHitImages()` သည် ပုံမရှိသော stroke ကို ချန်ထားခဲ့သည် (မှန်သည့် ဆုံးဖြတ်ချက် — မှားသော drum ကို ဆွဲခြင်းထက် မဆွဲခြင်းက ကောင်းသည်)၊ သို့သော် **တိတ်တဆိတ်** ချန်ထားသဖြင့် video ထဲတွင် အပေါက် ကျန်နေသည်ကို မည်သူမှ မသိရပါ။

1. **မှတ်သားခြင်း** — `loadHitImages()` သည် ပုံ မတွေ့သော stroke တွင် `missing = true` ကို ထည့်သည်။
2. **အမည်ဖြင့် ပြခြင်း** — `DrumKit.missingSummary(strokes)` က note နံပါတ်များကို စုစည်း၍ `no picture for note 81` ကဲ့သို့ စာတစ်ကြောင်း ပြန်သည်။
3. **Status သို့ ချိတ်ခြင်း** — `studio-video.js` ၏ `loadKit()` က `missing` ကို သယ်ပြီး render ပြီးဆုံးချိန် status တွင် `Rendered 60 frames · 16x9 · Studio drum sound · no picture for note 81` ဟု ဆက်ပြသည်။
4. **စမ်းသပ်မှု** — `test-studio-video-browser.mjs` တွင် Roland VAD716 သည် 35–59 သာ ရှိပြီး 81 မရှိသည်ကို အသုံးပြု၍ (က) ပုံရှိသော stroke က ဆက်လက် resolve ဖြစ်ခြင်း၊ (ခ) မရှိသော stroke က `missing` ဖြင့် ပြန်ခြင်း၊ (ဂ) summary က note နံပါတ်ကို အမည်တပ်ခြင်း ကို စစ်သည်။

**မပြောင်းလဲသည့် အပိုင်း:** kit လုံးဝ မရလျှင် (R2 ပြတ်/background 404) ယခင် အတိုင်း lane chart သို့ ပြန်ကျပြီး export ကို မရပ်ပါ — ထို အပြုအမူကို မထိပါ။
