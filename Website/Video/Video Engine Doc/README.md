# Video Engine — Implementation Status

စစ်ဆေးသည့် branch: `main`
စစ်ဆေးသည့် commit: `a9f2c11` (`feat: import Video Engine source and add docs/plan folders`)
အခြေခံ source: `Website/Video/Video Engine/source/`

## အနှစ်ချုပ်

Video Engine core ကို သီးခြား JavaScript module အဖြစ် ရေးထားပြီး canvas frame များကို WebCodecs ဖြင့် encode/mux လုပ်ခြင်း၊ browser support မရှိပါက MediaRecorder fallback သုံးခြင်း၊ audio ပါဝင်နိုင်ခြင်း၊ memory budget နှင့် required-asset gates စစ်ခြင်းတို့ ပါဝင်သည်။ MP4 container muxer, stream sink wrapper, safety/cleanup logic နှင့် Node test များကို code ထဲတွင် တွေ့ရသည်။ `VideoEngine.render()` API ကိုသုံးသည့် **production Studio integration** သို့မဟုတ် တကယ့် R2 asset fetch/upload flow ကိုတော့ checkout ထဲတွင် မတွေ့ရပါ။ “Engine code ရှိပြီး” ဆိုခြင်းနှင့် “လက်ရှိ website တွင် video export အလုပ်လုပ်ပြီး” ဆိုခြင်းကို သီးခြားအခြေအနေအဖြစ် မှတ်ထားရမည်။

## ဖိုင်တစ်ခုချင်း အခြေအနေ

| ဖိုင် | အခြေအနေ | ရေးထားပြီးသောအရာ / ကန့်သတ်ချက် |
|---|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | ရှိပြီး | Core engine, option validation, segment render orchestration, WebCodecs encoder selection, H.264/AAC MP4 and VP8/VP9+Opus WebM muxing, WebM muxer, audio join/encode, MediaRecorder fallback, progress/cancellation hooks, memory guards, cleanup, required-asset readiness API. |
| `Website/Video/Video Engine/source/tools/test-video-engine.mjs` | ရှိပြီး | Synthetic encoded chunks ဖြင့် MP4 box structure, seek/timing, chunk offsets, interleaving, fractional FPS, reorder/ctts, decoder configs, silence, priming/edit lists, streaming sink ကို စစ်သည်။ |
| `Website/Video/Video Engine/source/website/tests/video-engine-cleanup.test.mjs` | ရှိပြီး | WebCodecs/MediaRecorder cleanup, canvas/track/AudioContext cleanup, memory-budget preflight နှင့် required asset gate ကို စစ်သည်။ |
| `Website/Video/Video Engine/source/tools/browser-video-engine-fixture.html` | ရှိပြီး | Browser တွင် 320×180, 30 FPS, 1-second frame sequence render လုပ်ရန် fixture. WebCodecs support ရှိခြင်းနှင့် MP4 output ဖြစ်ခြင်းကို မျှော်လင့်သည်။ |
| `Website/Video/Video Engine/source/tools/test-video-engine-browser.mjs` | ရှိပြီး; end-to-end result မအတည်ပြုရသေး | Chromium + CDP + ffprobe ဖြင့် fixture မှ MP4 ထုတ်ကာ စစ်ရန် runner ဖြစ်သည်။ Current directory path တွင် space ပါသောကြောင့် `new URL(...).pathname` ဖြင့် ရရှိသော `ROOT` ကြောင့် `python3` server spawn `ENOENT` ဖြစ်ခဲ့သည်။ No-space temporary copy တွင်လည်း browser က `runVideoEngineBrowserTest is not defined` ဟု fail ဖြစ်ခဲ့သည်။ Runner/fixture အမှန်တကယ် pass ဖြစ်ကြောင်း မအတည်ပြုရသေးပါ။ |
| `Website/Video/Video Engine/README.md` | ရှိပြီး; path အချက်အလက်ပြန်စစ်ရန်လို | Mirror, canonical runtime, canonical docs ကို ညွှန်ထားသော်လည်း `../../website/assets/video-engine.js` နှင့် `../../docs/VIDEO-ENGINE.md` target များကို လက်ရှိ checkout ထဲတွင် မတွေ့ပါ။ Canonical source of truth ကို အတည်ပြုရန်လိုသည်။ |
| `Website/Website/studio.html`, `Website/Website/script.js` | ရှိပြီး; integration မတွေ့ | `rg` ရှာဖွေမှုအရ production website files ထဲတွင် `VideoEngine` သို့မဟုတ် `video-engine.js` import/call မတွေ့ပါ။ လက်ရှိ studio controls/recording flow သည် engine နှင့် ပေါင်းစည်းပြီးကြောင်း သက်သေမရှိပါ။ |
| `Website/Video/Video Engine Plan/PLAN.md` | ဤ commit တွင် ထည့်သွင်း | အလုပ်လုပ်ပုံ၊ source-of-truth, integration/test milestones နှင့် definition of done. |

## စမ်းသပ်မှုရလဒ်

- `node 'source/tools/test-video-engine.mjs'` — **pass: 15, fail: 0**. MP4 muxer arithmetic/container coverage ကို စစ်သည်။
- `node --test 'source/website/tests/video-engine-cleanup.test.mjs'` — **pass: 5, fail: 0**. Resource cleanup, memory preflight နှင့် asset gate coverage ကို စစ်သည်။
- `node 'source/tools/test-video-engine-browser.mjs'` — **မပြီးမြောက်**. Repository path ၏ space ကို URL pathname decode မလုပ်သဖြင့် child process `python3` သည် `ENOENT` ဖြင့် မစနိုင်ခဲ့ပါ။ No-space temporary copy ဖြင့် စမ်းရာတွင် `runVideoEngineBrowserTest is not defined` ဖြင့် ဆက်မအောင်မြင်ပါ။ ထို့ကြောင့် Chromium/WebCodecs/ffprobe end-to-end export ကို pass ဟု မဆိုနိုင်ပါ။
- Source tree review — `Website/Website/` production app မှ Video Engine asset ကို load/call လုပ်ထားသည့် code မတွေ့ရပါ; `VideoEngine.render()`-to-Studio wiring, real R2 access, output upload/download flow ကို အတည်မပြုနိုင်ပါ။

## ရေးထားပြီးသော code — အကျဉ်းချုပ်

1. `render()` options/segments ကို စစ်ဆေးပြီး required asset များ ready မဖြစ်သေးပါက export ကို ပိတ်သည်။
2. Support ရှိလျှင် WebCodecs video/audio encoder သုံး၍ frame timestamp နှင့် FPS ကို render လုပ်သည်။ Encoder ရွေးချယ်မှုတွင် MP4 H.264/AAC ကို ဦးစားပေးပြီး မဖြစ်နိုင်ပါက WebM VP8/VP9+Opus ကို စမ်းသည်။
3. WebCodecs မရရှိလျှင် MediaRecorder real-time fallback သုံးရန် code ရှိသည်။ Fallback သည် wall-clock capture ဖြစ်ပြီး WebCodecs နှင့် တူညီသော frame-perfect guarantee မဟုတ်ပါ။
4. MP4/WebM container bytes, audio/video tracks, timestamps, keyframe information နှင့် metadata mux လုပ်သည်။ MP4 stream helper ရှိသော်လည်း လက်ရှိအကောင်အထည်ဖော်မှုသည် Blob အပြည့်ကို အရင်တည်ဆောက်ထားသည်။
5. Memory estimate/budget, encoder queue backpressure, cancellation hooks နှင့် error cleanup ကို ကိုင်တွယ်သည်။
6. Required assets များအတွက် `requireAsset`, `resolveRequired`, `rejectRequired`, `assertAssetsReady` API ရှိသည်။ ဤသည် readiness gate သာဖြစ်ပြီး R2 မှ fetch လုပ်သည့် code မဟုတ်ပါ။

## မရေးရသေး / မအတည်ပြုရသေး

- Production Studio/website သည် engine ကို import/load လုပ်ပြီး `VideoEngine.render()` ဖြင့် export လုပ်ခြင်း.
- Drum/Piano/အခြား instrument များအတွက် frame drawing, animation/timeline နှင့် audio-to-segment adapters.
- တကယ့် R2 upload/download/signed URL, asset metadata နှင့် failure/retry lifecycle.
- Browser smoke test runner ၏ path-space handling၊ fixture readiness/error diagnostics နှင့် Chromium end-to-end export pass.
- Real MediaRecorder fallback browser integration tests နှင့် target browsers/mobile device compatibility matrix.
- Download/progress/cancel/error UI, real-world large render performance နှင့် low-memory UX.
- MP4 stream helper ကို end-to-end low-memory incremental muxing အဖြစ် မပြီးသေးပါ။ `muxMp4ToStream()` သည် `muxMp4()` ၏ Blob အပြည့်ကို အရင်တည်ဆောက်သည်။
- README ထဲတွင် ဖော်ပြထားသော canonical production source/doc file များကို checkout ထဲတွင် မတွေ့ရသဖြင့် source-of-truth နှင့် mirror synchronization မူဝါဒကို ရှင်းလင်းသတ်မှတ်ရန်လိုသည်။

## နောက်လုပ်ရန်

အသေးစိတ် အဆင့်စီမံကိန်းကို [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md) တွင်ကြည့်ပါ။ ပထမဦးစွာ canonical source/path ကို ပြင်ဆင်ပြီး browser smoke test runner/fixture ကို reliable ဖြစ်အောင်လုပ်ပါ။ ထို့နောက် production Studio integration, instrument/audio segments, R2 lifecycle နှင့် real browser export coverage ကို အစီအစဉ်အတိုင်း ဆက်လုပ်ပါ။ Website feature code မပြင်ခဲ့ပါ; ဤအလုပ်တွင် Plan နှင့် documentation inventory ကိုသာ update လုပ်ထားသည်။
