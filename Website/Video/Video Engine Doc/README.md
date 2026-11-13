# Video Engine — Implementation Status

စစ်ဆေးသည့် repo: `idetsminmh1995-spec/msharing0008`
အလုပ်စတင်ချိန် branch/commit: `main` / `2a72310`
Authoritative engine source: `Website/Video/Video Engine/source/website/assets/video-engine.js`
Production copy: `Website/Website/assets/video-engine.js`

## အနှစ်ချုပ်

Engine တွင် WebCodecs render, MP4/WebM muxing, MediaRecorder fallback code, audio support, memory budget, cancellation နှင့် resource cleanup ရှိသည်။ ယခု website asset ကို engine source မှ sync လုပ်ပြီး Drum Studio နှင့် ပထမဆုံး အမှန်တကယ် ချိတ်ဆက်ထားသည်။ User က recording ကိုစပြီး Drum pad များကိုနှိပ်ကာ visual event များဖမ်းယူနိုင်သည်။ ထို့နောက် VideoEngine ဖြင့် 640×360, 30 FPS, 12 sec အများဆုံး **silent visual preview** ကို render လုပ်၍ preview/play/seek/download လုပ်နိုင်သည်။ Audio, R2 workflow, သို့မဟုတ် အခြား instrument များ၏ video export ကို မပြီးသေးပါ။

## ရေးပြီး အလုပ်လုပ်ကြောင်း စစ်ထားသော code

| Path | Status / coverage |
|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | Authoritative source: render orchestration, WebCodecs H.264/AAC MP4 နှင့် VP8/VP9+Opus WebM path, muxers, MediaRecorder fallback, memory guards, progress/cancel, required-asset gate, cleanup. |
| `Website/Website/assets/video-engine.js` | Production website က load လုပ်သည့် copy. `sync-video-engine.mjs --check` ဖြင့် authoritative source နှင့် တူညီကြောင်း စစ်သည်။ |
| `Website/Video/Video Engine/source/tools/sync-video-engine.mjs` | Source ကို production asset သို့ copy လုပ်ခြင်းနှင့် stale copy check. |
| `Website/Website/studio.html` | Engine script, Drum pad data attributes, status, video preview/player controls, download link ကို ထည့်ထားသည်။ |
| `Website/Website/studio-video.js` | Drum pad event capture; maximum 12 sec, 640×360, 30 FPS visual render; progress, cancel, no-hit/error, Blob preview/download, URL cleanup. **Export သည် အသံမပါပါ။** |
| `Website/Website/script.js` | Custom play/pause, timeline seek, time display နှင့် fullscreen ကို generated video နှင့် ချိတ်ထားသည်။ |
| `Website/Website/styles.css` | Status, hit feedback, preview/download styling နှင့် phone/web-responsive layout. Browser test က 375px နှင့် 1280px viewport တွင် overflow မရှိကြောင်း စစ်သည်။ |
| `Website/Video/Video Engine/source/tools/test-video-engine-browser.mjs` | `fileURLToPath()` ဖြင့် space ပါသည့် repo path ကို decode လုပ်သည်။ Local server ready, free ports, fixture page/function readiness စောင့်ပြီး Chromium MP4 ကို ffprobe ဖြင့်စစ်သည်။ |
| `Website/Video/Video Engine/source/tools/test-studio-video-browser.mjs` | Chromium ထဲတွင် Drum capture → render → Blob preview/download flow ကိုစမ်းပြီး ffprobe ဖြင့် output စစ်သည်။ Phone/desktop layout assertions ပါသည်။ |
| `Website/Video/Video Engine/source/tools/test-video-engine.mjs` | MP4 boxes, timing, offsets, chunk grouping/interleaving, fractional FPS, silence, edit list နှင့် stream sink tests. |
| `Website/Video/Video Engine/source/website/tests/video-engine-cleanup.test.mjs` | WebCodecs/MediaRecorder cleanup, memory-budget preflight နှင့် required-asset gate tests. |

## စမ်းသပ်မှုရလဒ်

စမ်းသပ်မှုအားလုံးကို `Website/Video/Video Engine` folder ထဲမှ run လုပ်ထားသည်။

- `node source/tools/test-video-engine.mjs` — **pass: 15, fail: 0**.
- `node --test source/website/tests/video-engine-cleanup.test.mjs` — **pass: 5, fail: 0**.
- `node source/tools/test-video-engine-browser.mjs` — **pass**. Chromium WebCodecs H.264 MP4, 320×180, 30 frames, 1.0 sec; ffprobe က MP4/H.264 အဖြစ်အတည်ပြုသည်။ ယခင် `%20`/fixture readiness failure မရှိတော့ပါ။
- `node source/tools/test-studio-video-browser.mjs` — **pass**. Studio export က silent H.264 MP4, 640×360, 30 frames, 1.0 sec ထုတ်ပြီး ffprobe ဖြင့်အတည်ပြုသည်။ Chromium viewport စစ်ဆေးမှု: phone 375px မှ desktop 1280px အထိ layout မကျော်ထွက်ပါ။
- `node --check` ဖြင့် `studio-video.js`, `script.js`, browser runner နှင့် sync tool syntax စစ်ဆေးမှု — **pass**.
- `node source/tools/sync-video-engine.mjs --check` — **pass**, production copy သည် source နှင့်ကိုက်ညီသည်။

## မရေးရသေး / မအတည်ပြုရသေး

- Drum pad အသံ/sample, `AudioBuffer`, audio-video synchronization နှင့် audio ပါဝင်သော export.
- Piano/Guitar/Bass/Strings/Voice အပါအဝင် အခြား instrument များအတွက် frame/timeline/audio adapters.
- R2 signed URL, real asset fetch, upload/download, metadata, access-control နှင့် retry lifecycle. Engine asset gate သည် R2 client မဟုတ်ပါ။
- MediaRecorder fallback ကို browser အမှန်တကယ်တွင် သီးခြားစမ်းသပ်ခြင်း; လက်ရှိ Chromium smoke သည် WebCodecs H.264 path ကိုစမ်းသည်။
- Low-memory end-to-end incremental MP4 muxing. `muxMp4ToStream()` သည် လက်ရှိ Blob အပြည့်ကို အရင်တည်ဆောက်နေသည်။
- Physical phone/browser/device matrix နှင့် product အတွက် resolution/duration/memory/retention requirements.

## နောက်လုပ်ရန်

ဦးစားပေးအဆင့်များကို [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md) တွင် update ထားသည်။ နောက်တစ်ဆင့်တွင် Drum Pad မှ real/synth audio data ထုတ်ပြီး segment audio အဖြစ် Engine သို့ပေးခြင်းနှင့် audio-video sync ကိုစစ်ဆေးရန်ဖြစ်သည်။ ထို့နောက် fallback, real R2 lifecycle လိုအပ်ချက်, အခြား instruments နှင့် low-memory muxing ကို သီးခြားပြီးစီးစေရမည်။
