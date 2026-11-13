# Video Engine Plan

## 1. ရည်ရွယ်ချက်နှင့် လက်ရှိအတိုင်းအတာ

Video Engine သည် canvas frame များကို render လုပ်ပြီး video file ထုတ်ပေးသည့် browser-side JavaScript engine ဖြစ်သည်။ Instrument page များက encoder/container logic ကို ထပ်ရေးစရာမလိုဘဲ `VideoEngine.render(options)` ကိုခေါ်သုံးနိုင်ရန် ရည်ရွယ်ထားသည်။ Authoritative source သည် `Website/Video/Video Engine/source/website/assets/video-engine.js` ဖြစ်ပြီး static website က `Website/Website/assets/video-engine.js` ထဲရှိ synchronized copy ကို load လုပ်သည်။ `source/tools/sync-video-engine.mjs` သည် copy လုပ်ခြင်းနှင့် freshness စစ်ခြင်းကို ကိုင်တွယ်သည်။

ပထမ integration အဖြစ် Drum Studio သည် user နှိပ်သည့် drum pad event များကို မှတ်တမ်းတင်ပြီး **အသံမပါသော visual-only MP4/WebM preview** ကို ထုတ်နိုင်သည်။ ၎င်းသည် audio recording, R2 workflow သို့မဟုတ် Drum/Piano အားလုံးအတွက် production video pipeline ပြီးစီးပြီဟု မဆိုလိုပါ။

## 2. API နှင့် render flow

Page က `{ width, height, fps, segments, onProgress, shouldStop }`-ပုံစံ options ဖြင့် `VideoEngine.render()` ကိုခေါ်သည်။ `segments` တစ်ခုစီတွင် duration, `draw(ctx, at, index)` callback, optional `AudioBuffer`, `onStart`, `onEnd` ပါနိုင်သည်။ Engine သည် options နှင့် required-asset readiness ကိုစစ်ပြီး browser support ရှိပါက WebCodecs ဖြင့် offline/frame-addressed render ကို ဦးစားပေးသည်။ Encoder မရရှိပါက MediaRecorder real-time fallback သုံးနိုင်သည်။ Result တွင် Blob, extension/container, frame count, duration, render path, cancellation နှင့် memory status များ ပါသည်။

## 3. အကောင်အထည်ဖော်ထားသော engine capability

- **Container/muxing:** VP8/VP9 အတွက် WebM muxer နှင့် H.264/AAC အတွက် MP4 muxer ရှိသည်။ MP4 တွင် sample/timing/chunk tables, keyframe index, composition offsets, edit list, chunk grouping/interleaving, fast-start ordering နှင့် 32/64-bit media offsets ကို ကိုင်တွယ်သည်။
- **Codec/render:** Browser support စစ်ဆေး၍ H.264/AAC MP4 ကို ဦးစားပေးပြီး လိုအပ်လျှင် VP8/VP9 + Opus WebM ကိုရွေးသည်။ WebCodecs သည် frame timestamp, encoder queue backpressure, audio join/encode နှင့် render progress/cancel ကို ကိုင်တွယ်သည်။
- **Fallback:** WebCodecs မရပါက `canvas.captureStream()` + MediaRecorder real-time capture code ရှိသည်။ Fallback သည် wall-clock capture ဖြစ်ပြီး frame-perfect guarantee မတူပါ။
- **Safety:** Device memory အလိုက် budget, preflight/actual-memory checks, validation, required-asset gate, cancellation နှင့် encoder/canvas/stream/AudioContext cleanup များရှိသည်။
- **MP4 stream sink:** `muxMp4ToStream()` သည် `WritableStream` သို့ bytes များကို အပိုင်းလိုက်ပို့သော်လည်း `muxMp4()` ၏ Blob အပြည့်ကို အရင်ဖန်တီးနေဆဲဖြစ်သည်။ End-to-end low-memory incremental muxing မပြီးသေးပါ။

## 4. လုပ်ပြီးသော အဆင့်များ

### Phase A — Source of truth နှင့် browser tests

- Engine README ကို repository ၏ တကယ့် path များအတိုင်း ပြင်ဆင်ထားသည်။ Source သည် `source/website/assets/video-engine.js`; production copy သည် `Website/Website/assets/video-engine.js` ဖြစ်သည်။
- `sync-video-engine.mjs` ဖြင့် source ကို website asset သို့ copy လုပ်ခြင်းနှင့် `--check` ဖြင့် ကွာခြားမှုစစ်ခြင်းကို ထည့်ထားသည်။
- Chromium runner တွင် URL pathname ကို `fileURLToPath()` ဖြင့် decode လုပ်သည်။ HTTP fixture အသင့်ဖြစ်ကြောင်း စောင့်ခြင်း၊ free local ports ရွေးခြင်း၊ fixture page URL/function readiness စစ်ခြင်းနှင့် process cleanup ထည့်ထားသည်။
- Chromium + ffprobe engine smoke test သည် 320×180, H.264 MP4, 30 frames, 1.0 sec ဖြင့် pass ဖြစ်သည်။ Studio integration browser test အသစ်လည်း ထည့်ထားသည်။

### Phase B — ပထမ Studio integration (Drum visual-only)

- `studio.html` သည် production asset `assets/video-engine.js` ကို load လုပ်ပြီး `studio-video.js` သည် Studio workflow ကို ချိတ်ဆက်သည်။
- Recording ကိုစ/ရပ်နိုင်ပြီး capture အတွင်း Kick/Snare/Hi-hat pad နှိပ်သည့် time/event များကို သိမ်းဆည်းသည်။ 12 sec အများဆုံး၊ 640×360, 30 FPS ဖြင့် visual segment ကို render လုပ်သည်။
- Progress, cancel, no-hit/error status, real `<video>` preview, play/pause, seek, download နှင့် Blob URL revoke ကို ထည့်ထားသည်။ 375px phone နှင့် 1280px desktop တွင် overflow မရှိ၊ layout သည် phone တွင် column တစ်ခု၊ desktop တွင် column နှစ်ခုဖြစ်ကြောင်း browser test ဖြင့် စစ်ထားသည်။
- လက်ရှိ first integration သည် pad event များကိုသာ visual timeline အဖြစ်ပြပြီး audio track မထည့်ပါ။ UI status တွင် `silent visual preview` ကို ဖော်ပြသည်။

## 5. ဆက်လုပ်ရန်

### Phase B — Drum audio နှင့် export lifecycle

1. Drum pad input/tempo ကို sound sample သို့မဟုတ် Sound Engine မှလာသော audio data နှင့် ချိတ်ပြီး segment `AudioBuffer` ထုတ်ပေးပါ။ Audio/video synchronization နှင့် codec fallback ကို real browser တွင်စမ်းပါ။
2. Progress, cancel, failure, Blob cleanup တို့ကို short/long render နှင့် retry တွင်စမ်းပြီး memory limit UX ကို ပိုမိုရှင်းလင်းစေပါ။
3. R2 asset များ တကယ်လိုအပ်လာပါက signed URL, access control, upload/download, metadata နှင့် retry lifecycle ကို သီးခြား service/adapter ဖြင့် အကောင်အထည်ဖော်ပါ။ Engine ၏ `requireAsset()/resolveRequired()/rejectRequired()` သည် readiness gate သာဖြစ်ပြီး R2 client မဟုတ်ပါ။

### Phase C — Instrument support, production confidence, and memory work

1. Piano, Guitar, Bass, Strings, Voice စသည့် tool များအတွက် instrument-specific event model, frame drawing, timeline နှင့် audio adapter တစ်ခုချင်းစီတည်ဆောက်ပါ။ ပထမ Drum UI/workflow ကို အခြား instrument များအတွက် အလိုအလျောက်ပြီးစီးသည်ဟု မယူဆရ။
2. MediaRecorder fallback, browser/device codec variation, real multi-segment audio/video sync နှင့် cancellation ကို target browser/device matrix ဖြင့် စမ်းပါ။ လက်ရှိ smoke test သည် ဤ environment ၏ Chromium WebCodecs H.264 path ကိုသာ အတည်ပြုထားသည်။
3. `muxMp4ToStream()` ကို အမှန်တကယ် incremental ဖြစ်စေရန် Blob အပြည့်တည်ဆောက်မှုကို ဖယ်ရှားရန် လို/မလို သတ်မှတ်ပြီး လိုအပ်လျှင် memory-profile ပါသော design/test ထည့်ပါ။
4. Resolution/duration ceiling, mobile performance, storage/retention နှင့် codec/format requirement များကို product requirement အတိုင်း ဆုံးဖြတ်ပါ။

## 6. စစ်ဆေးမှုနှင့် Definition of done

- `node source/tools/test-video-engine.mjs` — MP4 muxer tests pass.
- `node --test source/website/tests/video-engine-cleanup.test.mjs` — cleanup/safety tests pass.
- `node source/tools/test-video-engine-browser.mjs` — Chromium WebCodecs engine smoke test + ffprobe pass.
- `node source/tools/test-studio-video-browser.mjs` — Studio capture → render → preview/download Blob → ffprobe pass; phone/desktop layout check pass.
- `node source/tools/sync-video-engine.mjs --check` — production asset သည် authoritative source နှင့်တူညီရမည်။
- Full completion အတွက် Drum audio/R2 requirement (အသုံးပြုပါက), instrument adapters, browser/device fallback coverage နှင့် low-memory requirements များကို ပိတ်သိမ်းပြီး Plan/Doc update လုပ်ရမည်။ Website UI ပြောင်းသည့်အခါ phone နှင့် web/desktop နှစ်မျိုးလုံးတွင် စစ်ဆေးပြီး အောင်မြင်သည့် commit ကို `main` သို့ push လုပ်ရမည်။
