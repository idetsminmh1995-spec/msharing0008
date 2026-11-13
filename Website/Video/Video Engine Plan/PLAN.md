# Video Engine Plan

## 1. ရည်ရွယ်ချက်နှင့် လက်ရှိအတိုင်းအတာ

Video Engine သည် canvas ပေါ်တွင် frame များကို အစဉ်လိုက် render လုပ်ပြီး video file ထုတ်ပေးရန် ရည်ရွယ်ထားသော browser-side JavaScript engine ဖြစ်သည်။ Instrument page တစ်ခုချင်းစီက encoder/container logic ကို ကိုယ်တိုင်မရေးဘဲ `VideoEngine.render(options)` ကိုခေါ်သုံးနိုင်ရန် ရည်ရွယ်ထားသည်။ လက်ရှိ repository တွင် engine source နှင့် စမ်းသပ်ရေး harness များကို `Website/Video/Video Engine/source/` အောက်တွင် ထည့်ထားသော်လည်း production `Website/Website/` app မှ import/use လုပ်ထားသည့် သက်သေကို မတွေ့ရသေးပါ။

ဤ Plan သည် လက်ရှိ source များကို လေ့လာထားသည့်အခြေအနေအပေါ် အခြေခံထားသည်။ Code ရှိနေခြင်းကို production workflow ပြီးစီးခြင်းဟု မယူဆရ။

## 2. ရည်ရွယ်ထားသော API နှင့် render flow

Page က `{ width, height, fps, segments, onProgress, shouldStop }`-ပုံစံ options ဖြင့် `VideoEngine.render()` ကိုခေါ်မည်။ `segments` တစ်ခုစီတွင် duration, `draw(ctx, at, index)` callback, optional `AudioBuffer`, `onStart` နှင့် `onEnd` ပါနိုင်သည်။ Engine သည် options ကို validate လုပ်ပြီး required asset gate ကိုစစ်ကာ browser support ရှိပါက WebCodecs ဖြင့် offline/frame-addressed render ကို ဦးစားပေးမည်။ လိုအပ်သော encoder မရရှိပါက MediaRecorder real-time fallback ကို အသုံးပြုမည်။ Result တွင် Blob, container/extension, codec ဆိုင်ရာအချက်များ၊ frame count, duration, render path နှင့် cancellation/memory information များ ပြန်ပေးမည်။

## 3. လက်ရှိ code ဖြင့် အကောင်အထည်ဖော်ထားသည်

- **Container/muxing:** VP8/VP9 အတွက် WebM muxer နှင့် H.264/AAC အတွက် MP4 muxer ရှိသည်။ MP4 တွင် `ftyp`, `moov`, `mdat`, sample/timing/chunk tables, keyframe index, composition offsets, decoder configuration, edit list, chunk grouping/interleaving, fast-start ordering နှင့် 32/64-bit media offset များကို ကိုင်တွယ်သည့် code ရှိသည်။
- **Streaming sink API:** `muxMp4ToStream()` သည် `WritableStream` ထဲသို့ ရလဒ် bytes များကို အပိုင်းလိုက်ရေးပေးသည်။ သို့သော် လက်ရှိ implementation သည် ပထမဆုံး `muxMp4()` ဖြင့် Blob အပြည့်တည်ဆောက်ပြီးမှ Blob stream ကို sink သို့ပို့သည်။ ထို့ကြောင့် peak memory မတိုးစေသော end-to-end incremental muxing ကို မပြီးသေးဟု သတ်မှတ်ရမည်။
- **Codec selection/encoding:** Browser support စစ်ဆေးပြီး H.264/AAC MP4 ကို ဦးစားပေးရွေးချယ်ကာ မရရှိပါက VP8/VP9 + Opus WebM ကို စမ်းသည်။ WebCodecs render တွင် frame timestamp ကို သတ်မှတ်၍ encoder queue backpressure ကို ထိန်းသည်။ AudioBuffer များကို ပေါင်းစည်းပြီး AAC/Opus ဖြင့် encode လုပ်သည်။
- **Fallback:** WebCodecs မသုံးနိုင်ပါက `canvas.captureStream()` + `MediaRecorder` real-time capture သုံးသည်။ Result တွင် `path: 'mediarecorder'` ဖြင့် fallback ကို ခွဲခြားနိုင်သည်။
- **Resource/safety:** Device memory အလိုက် budget သတ်မှတ်ထားခြင်း၊ projected/actual encoded-memory checks, cancellation, encoder/canvas/stream/AudioContext cleanup, positive dimension/fps/segment validation နှင့် required asset readiness gate များရှိသည်။
- **Test artefacts:** Synthetic MP4 muxer tests, WebCodecs/MediaRecorder cleanup-and-safety tests, browser fixture နှင့် Chromium/ffprobe smoke-test runner ရှိသည်။ အသေးစိတ် coverage/result ကို [Video Engine Implementation Status](../Video%20Engine%20Doc/README.md) တွင် မှတ်တမ်းတင်ထားသည်။

## 4. အလုပ်လုပ်ရန် အကြံပြုထားသည့် အစီအစဉ်

### Phase A — Source of truth နှင့် build/test pipeline

1. `Website/Video/Video Engine/README.md` ထဲရှိ canonical path link များကို repository ၏ လက်ရှိ directory structure နှင့် ကိုက်ညီအောင် ပြင်ဆင်ပါ။
2. Engine ၏ source of truth ကို မည်သည့်နေရာတွင်ထားမည်၊ main website မှ မည်သို့ load/build လုပ်မည်ကို ဆုံးဖြတ်ပါ။ Production asset path ရွေးပြီးပါက mirror ရှိလျှင် sync rule ကို အလိုအလျောက်လုပ်ပါ၊ သို့မဟုတ် mirror ကို ဖယ်ရှားပါ။
3. Browser runner သည် directory name တွင် space ပါသောအခါ အလုပ်လုပ်စေရန် (`fileURLToPath(new URL(...))` ကဲ့သို့ URL path ကို decode လုပ်ရန်) နှင့် fixture load ပျက်သည့်အကြောင်းကို ရှင်းလင်းဖော်ပြရန် ပြင်ဆင်ပါ။
4. Node tests နှင့် browser smoke test ကို CI သို့မဟုတ် ထပ်ခါတလဲလဲလုပ်နိုင်သော local command တွင် ချိတ်ဆက်ပါ။

### Phase B — Website integration

1. `Website/Website/studio.html` နှင့် `studio` logic မှ Video Engine ကို အမှန်တကယ် load/import လုပ်ပါ။ လက်ရှိ repository တွင် video engine asset ကို production website မှ load လုပ်ထားသည့် code ကို မတွေ့ရသေးပါ။
2. Studio recorder/editor output ကို `segments` contract နှင့် ချိတ်ဆက်ပါ။ Instrument ၏ frame drawing/animation ကို `draw` callback ဖြင့် render လုပ်ပြီး audio ကို segment data အဖြစ် ပေးရမည်။
3. User က export လုပ်နိုင်မည့် UI/status/progress/cancel/download flow ကို engine result (extension/container/fallback/memory error) နှင့် ချိတ်ပါ။ UI ထုတ်ပါက phone နှင့် web/desktop နှစ်မျိုးလုံးတွင် responsive စစ်ဆေးပါ။
4. Real R2 asset loader/module ရှိလာပါက mandatory export assets ကို `requireAsset()` ဖြင့် register လုပ်၊ success/failure အတိုင်း `resolveRequired()`/`rejectRequired()` ခေါ်ပြီး တကယ့် fetch နှင့် authorization ကို test လုပ်ပါ။ လက်ရှိ tree မှာ engine gate contract နှင့် unit test သာတွေ့ရပြီး R2 client/signed-URL integration မတွေ့ရသေးပါ။

### Phase C — Instrument/audio workflows and export verification

1. Drum, Piano နှင့် အခြား tool တစ်ခုချင်းစီ၏ frame drawing, timeline, audio synchronization နှင့် segment transitions ကို သီးခြားသတ်မှတ်ပြီး engine API သို့ adapter ဖြင့် ချိတ်ပါ။
2. Real user input/audio နှင့် multi-segment, cancellation, zero/short duration, large output/device budget, browser format fallback များအတွက် integration tests ထည့်ပါ။
3. Chromium smoke test ကို run လုပ်ပြီး MP4 ကို ffprobe သို့မဟုတ် အခြား decoder ဖြင့်ဖွင့်စစ်ပါ။ MediaRecorder fallback ကို browser အမှန်တကယ်တွင် သီးခြားအတည်ပြုပါ။
4. Low-memory incremental MP4 muxer လိုအပ်ပါက `muxMp4ToStream()` ကို Blob အပြည့်မတည်ဆောက်သော implementation အဖြစ် ပြန်လည်ဒီဇိုင်းပြီး large-export memory profile ဖြင့် စမ်းသပ်ပါ။
5. Target browser/device compatibility, codec licensing/availability, max resolution/duration, memory ceiling, privacy/storage retention နှင့် R2 output upload lifecycle တို့ကို product requirement အတိုင်း ဆုံးဖြတ်ပြီး document လုပ်ပါ။

## 5. လက်ရှိသိရှိရသော ကန့်သတ်ချက်များ / ဆုံးဖြတ်ရန်ကျန်သောအချက်များ

- Production website မှ engine ကို load/call လုပ်မှု မတွေ့ရပါ; လက်ရှိ source သည် testable standalone mirror/project ဖြစ်နေသည်။
- `README.md` တွင် canonical paths အဖြစ် `../../website/assets/video-engine.js` နှင့် `../../docs/VIDEO-ENGINE.md` ကို ပြထားသော်လည်း checkout ထဲတွင် ထို target များ မရှိပါ။ Canonical file/technical doc ကို အတည်ပြုပြီး README ကို ပြင်ဆင်ရန်လိုသည်။
- Browser smoke-test runner သည် path ကို `new URL(...).pathname` မှ တိုက်ရိုက်ရယူပြီး၊ space ပါသော current path တွင် `python3` server spawn မှ `ENOENT` ဖြစ်သည်။ Space မပါသည့် temporary copy ဖြင့် စမ်းသပ်ရာတွင်တော့ browser test fixture ထဲက `runVideoEngineBrowserTest` function မတွေ့သည့် ReferenceError ဖြင့် မအောင်မြင်ပါ။ ထို့ကြောင့် actual WebCodecs end-to-end export ကို အောင်မြင်ကြောင်း မအတည်ပြုရသေးပါ။
- Audio, WebCodecs နှင့် R2 code contract အချို့ ရှိသော်လည်း main website integration, actual R2 request/upload, production export/download၊ instrument adapters နှင့် cross-device browser matrix ကို စမ်းသပ်ပြီးကြောင်း မသက်သေပြရသေးပါ။

## 6. Definition of done

- Website သည် သတ်မှတ်ထားသော canonical source တစ်ခုကိုသာ load လုပ်ပြီး redundant mirror များ sync/verify လုပ်နိုင်သည်။
- Production Studio page သည် engine ဖြင့် instrument video တစ်ခုကို render/export လုပ်နိုင်ပြီး MP4/WebM format, fallback, progress, cancellation နှင့် errors ကို user ထံမှန်ကန်စွာ ပြနိုင်သည်။
- Mandatory assets, audio/video timing, R2 access (လိုအပ်ပါက), cleanup နှင့် low-memory rejection ကို automated tests ဖြင့်ဖုံးလွှမ်းထားသည်။
- Node tests, real-browser smoke/integration tests နှင့် responsive UI checks (UI ပါလာပါက phone + desktop) အားလုံး pass ဖြစ်သည်။
- Implementation ပြီးတိုင်း Video Engine Doc နှင့် သက်ဆိုင်ရာ Plan ကို update လုပ်ပြီး စမ်းသပ်မှုအောင်မြင်သည့် commit ကို `main` သို့ push လုပ်ထားသည်။
