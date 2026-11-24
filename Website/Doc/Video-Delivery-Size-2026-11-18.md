# Video delivery size နှင့် အရှည်ကန့်သတ်ချက် ဖယ်ရှားခြင်း (2026-11-18)

## ရည်ရွယ်ချက်

Main Plan (§Create Video — Final video layout) နှင့် Video Engine Plan (Phase 0.5) အရ Video အားလုံးကို စံ output အရွယ်တစ်ခုတည်း ဖြစ်စေရန်နှင့် Video အရှည်ကို page က ဖြတ်တောက်ခြင်း မပြုရန်။ ဤအလုပ်သည် Plan ၏ **B1** (Metronome output size) နှင့် **B4** (12 sec ကန့်သတ်ချက် ဖယ်ခြင်း) တို့၏ code အပိုင်းဖြစ်သည်။

## ပြောင်းလဲခဲ့သည့် files

| File | ပြောင်းလဲမှု |
|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | `DELIVERY_SIZES` ဇယား၊ `sizeFor(ratio)` နှင့် `ratioNames()` ထည့်သည်။ `16x9`/`16:9` နှစ်မျိုးလုံး လက်ခံပြီး မသိသော ratio ကို `RangeError` ဖြင့် ငြင်းသည်။ |
| `Website/Website/assets/video-engine.js` | `tools/sync-video-engine.mjs` မှ copy (source နှင့် တူညီကြောင်း `--check` pass)။ |
| `Website/Website/studio-metronome.js` | ကိုယ်ပိုင် `DIMENSIONS` နှင့် `MAX_EXPORT_SECONDS = 12` ကို ဖျက်သည်။ `engine.sizeFor(aspect)` ကို သုံးသည်။ |
| `Website/Website/studio-guitar.js`, `studio-piano.js`, `studio-bass.js`, `studio-violin.js`, `studio-voice.js` | ကိုယ်ပိုင် `DIMENSIONS` ကို ဖျက်၍ `engine.sizeFor(aspect)` ကို သုံးသည်။ |
| `Website/Website/studio.html` | Engine နှင့် adapter ခုနစ်ခု၏ cache key ကို content hash အသစ်သို့ update။ |
| `Website/Video/Video Engine/source/website/tests/video-engine-layout.test.mjs` | `sizeFor`/`ratioNames` contract test (စုစုပေါင်း 10/10)။ |
| `Website/Video/Video Engine/source/tools/test-*-studio-browser.mjs` | 1080p အရွယ်အသစ်၊ Metronome အရှည် ကန့်သတ်ချက် ဖယ်ခြင်း၊ 1080p တွင် ကျရှုံးခဲ့သော pixel probe ၂ ခု တို့ကို ချိန်ညှိသည်။ |

## Implementation detail

- **အရွယ်** — `sizeFor(ratio)` သည် `{...size}` copy ပြန်ပေးသဖြင့် page တစ်ခုက engine ၏ ဇယားကို ပြင်လို့မရပါ။ Page ခုနစ်ခုလုံး ကိုယ်ပိုင် ဇယား မထားတော့သဖြင့် နှစ်နေရာ ကွဲပြားမှု မဖြစ်နိုင်တော့ပါ။ Metronome ၏ Engine `canvasFor(aspect)` သည် 1920×1080 / 1080×1920 / 1080×1080 ကို ပြီးသား ပြန်ပေးသဖြင့် SVG renderer ကို မပြင်ရပါ။
- **အရှည်** — Metronome တွင် `Number.isFinite(seconds) && seconds > 0` ကိုသာ စစ်သည်; Video Engine ၏ memory guard သည် safety ဖြစ်သည်။ Plan ၏ စည်းမျဉ်း (Count Voice + MusicXML + Thank You ပေါင်းလဒ်) နှင့် ကိုက်ညီသည်။
- **Piano test probe** — keyboard band ကို frame ၏ ပုံသေ အချိုးဖြင့် မခန့်မှန်းတော့ဘဲ pixel မှ ရှာသည်: အောက်မှ အပေါ်သို့ တက်၍ ဖြူ key များသော row ကို အရင်ရှာပြီး၊ ထို row အထက် မှ black key row ကို ရှာသည်။ 1080p တွင် band ၏ အမြင့် ပြောင်းသဖြင့် ပုံသေ row (`height - 20`) သည် notation ပေါ် ကျခဲ့သည်။
- **Voice test probe** — waveform အထူကို ပုံသေ pixel (8/4) အစား band အမြင့်၏ အချိုးဖြင့် တိုင်းသည် (`> 5%` ကျယ်၊ `< 2%` တိတ်)။ 1080p တွင် တိတ်ဆိတ်အပိုင်း 4.2 px ဖြစ်လာသဖြင့် ပုံသေ 4 px ကို ဖြတ်ခဲ့သည်။

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-metronome-studio-browser.mjs` | PASS — 1080×1920, VP8 + 48 kHz mono Opus, design 11 မျိုး မတူညီ |
| `test-studio-video-browser.mjs` (Drum) | PASS |
| `test-guitar-studio-browser.mjs` | PASS |
| `test-piano-studio-browser.mjs` | PASS — 1080×1920, 4.00 s, အသံပါ, key အကျယ်အချိုး မှန် |
| `test-bass-studio-browser.mjs` | PASS |
| `test-violin-studio-browser.mjs` | PASS — 1080×1920 နှင့် 1920×1080 |
| `test-voice-studio-browser.mjs` | PASS — 1080×1920, 3.00 s, 439.4 Hz, band-relative waveform |
| `test-studio-dispatch-browser.mjs` | PASS |
| `test-audio-contract-browser.mjs` | PASS |
| `test-video-engine-browser.mjs` | PASS |
| `tools/test-video-engine.mjs` (muxer) | 15/15 PASS |
| `website/tests/video-engine-layout.test.mjs` | 10/10 PASS |
| `website/tests/video-engine-cleanup.test.mjs` | 5/5 PASS |
| `Website/Notation/Notation Engine/test/unit/website-bundle.test.js` (cache keys) | 3/3 PASS |
| `sync-video-engine.mjs --check` | in sync |
| `sync-piano-engine.mjs --check` | in sync |

## ကျန်ရှိ / သတိပြုရန်

- 1080p အတွက် memory budget နှင့် H.264 level ကို သီးခြား တိုးချဲ့စစ်ဆေးရန် ကျန်သည်။ Browser test များသည် 1080×1920 နှင့် 1920×1080 ကို encode လုပ်နိုင်ကြောင်း ပြထားသည်။
- Plan ၏ ကျန် WP များ (B2 layout template, B3 Title/Info, B5 Notation ချိတ်ဆက်မှု, B8 Drum Animation Engine, B9 offline sound) မစရသေးပါ။
- ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။
