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

- **Dispatch regression:** drums သည် လက်ရှိအတိုင်းဆက်အလုပ်လုပ်ရမည်။ Piano/Guitar/Bass/Strings/Voice သည် ကိုယ့် adapter သာရွေးရမည်။ Unsupported route သည် drum controls သို့မဟုတ် false success မပြရ။
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

The current VideoEngine integration remains visual-only. MusicXML is accepted and identified in the UI but is not parsed into drum events yet. Sound Model and Count Voice are stored/rendered as configuration metadata; they do not yet produce audio or synthesized counting. Instrument adapters for Guitar, Piano, Bass, Strings, and Voice remain disabled until their event source, deterministic renderer, asset readiness, and audio policy are implemented.
