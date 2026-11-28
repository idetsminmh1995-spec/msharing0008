# MusicXML ထည့်ချိန် Video Preview တွင် Notation မပေါ်ခြင်း (2026-11-18)

## ရည်ရွယ်ချက်

MusicXML ဖိုင်ထည့်လိုက်ချိန် Video Preview တွင် Notation မပေါ်ဟု ညွှန်ပြခဲ့သော ပြဿနာကို ရောဂါအမှန် ရှာ၍ ဖြေရှင်းရန်။

## ရောဂါအမှန်

Notation သည် တကယ် ပေါ်နေပါသည်။ တိုင်းတာချက် — band အတွင်း မှင်ဧရိယာ ၀.၂၇% (default pattern) မှ ၁.၆၃% (MusicXML) သို့ တက်သည်။ သို့သော် Preview သည် အသံကို အရင်ပြီးအောင် စောင့်သဖြင့် ရှည်သော score တွင် စက္ကန့် ၁၆ ခန့် ကြာသည်။ ထိုအချိန်အတွင်း မျက်နှာပြင်တွင် ရှေးဟောင်း ပုံသာ ရှိနေသဖြင့် "Notation မပေါ်" ဟု ထင်ရခြင်း ဖြစ်သည်။

## ပြောင်းလဲခဲ့သည့် files

| File | ပြောင်းလဲမှု |
|---|---|
| `Website/Website/studio-video.js` | `buildTimeline` မှ အသံဖန်တီးမှုကို ခွဲထုတ်၍ `attachAudio` ဟူသော သီးခြား function ဖြစ်စေသည်။ Preview သည် ပုံကို အရင်ဆွဲပြီးမှ အသံကို တွဲသည်; Export သည် ယခင်အတိုင်း အသံပါ တွဲသည်။ |
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | `systemBands` တွင် နောက်ဆုံး စနစ်၏ အောက်ဘက် အကွာအဝေးကို `gapBelow` ဖြင့် တွက်သည်။ ယခင် တွက်နည်းသည် `systemYs[index - 1]` ကို ဖတ်သဖြင့် စနစ်တစ်ခုတည်း ရှိသော score တွင် `NaN` ဖြစ်ကာ `systemBands` လုံးဝ မရခဲ့ပါ။ |
| `Website/Website/assets/video-engine.js` | `tools/sync-video-engine.mjs` မှ copy။ |
| `Website/Notation/Notation Engine/scripts/sync-website-bundle.mjs` | `rekey` helper နှင့် reference patterns များကို script pass အပေါ်ရွှေ့၍ JS ဖိုင်ထဲက `notation-engine.js?v=` key ကိုပါ ပြင်စေသည်။ |
| `Website/Notation/Notation Engine/test/unit/website-bundle.test.js` | JS ဖိုင်များထဲက notation engine address သည် bundle hash နှင့် တူကြောင်း စစ်သော regression test။ |
| `Website/Website/studio.html` | Bundle hash အသစ်များ။ |

## Implementation detail

- **Preview နှင့် အသံ ခွဲခြင်း** — `buildTimeline` သည် ယခု ပုံသာ ပြင်ဆင်သည်။ `attachAudio` သည် `createDrumAudio` ကို ခေါ်၍ `segments[0].audio` ကို တွဲသည်။ Preview တွင် ပုံကို `drawPreviewFrame` ဖြင့် ဆွဲပြီး၊ ထို့နောက်မှ `attachAudio` ကို စောင့်သည်။ §၅ ("Play မကမ်းမီ အသံ အသင့်") ကို မချိုးဖောက်ပါ — Play ခလုတ်ကို အသံပြီးမှ ဖွင့်သည်။
- **`gapBelow`** — စနစ်တစ်ခုတည်း ရှိလျှင် အောက်ဘက် အကွာအဝေးကို `viewBox.height - systemYs[0]` မှ ယူသည်။ စနစ်များစွာ ရှိလျှင် ယခင်အတိုင်း နောက်ဆုံး နှစ်စနစ်၏ တစ်ဝက် အကွာအဝေး။
- **`timeline` variable ဖုံးလွှမ်းမှု** — ပြင်ဆင်စဉ် `const timeline = await buildTimeline(...)` ဟု ရေးမိသဖြင့် module-level DOM element `timeline` ကို ဖုံးလွှမ်းကာ `timeline.disabled = false` က အလုပ်မလုပ်တော့ပါ။ `built` ဟု အမည်ပြောင်းပြီး ဖြေရှင်းသည်။
- **Cache key** — Notation bundle `1cebb3aa609d`။ Sync tool သည် JS ဖိုင်ထဲက address ကိုပါ အလိုအလျောက် ပြင်သဖြင့် browser က engine အဟောင်းကို မသုံးတော့ပါ။

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `website-bundle.test.js` | PASS — ၄/၄ |
| Notation Engine unit suite (`test/unit/*.test.js`) | PASS — fail 0 |
| `test-video-engine.mjs` | PASS — ၁၅/၁၅ |
| `test-notation-view-browser.mjs` | PASS — Page 16:9၊ 1:1၊ 9:16 နှင့် Horizontal |
| `test-notation-clip-browser.mjs` | PASS — ratio ၃ မျိုးလုံး၊ view ၂ မျိုးလုံး |
| `test-drum-reference-browser.mjs` | PASS |
| `test-studio-dispatch-browser.mjs` | PASS |
| `test-video-engine-browser.mjs` | PASS |
| `test-studio-video-browser.mjs` | PASS |

Notation ပေါ်ချိန် တိုင်းတာချက် (headless Chromium၊ `musescore-drum-lesson.musicxml`):

| အခြေအနေ | ရလဒ် |
|---|---|
| ပြင်ဆင်မီ | အသံ render (~၁၆ စက္ကန့်) ပြီးမှ ပေါ် |
| ပြင်ဆင်ပြီး | **၈၂၉ ms** တွင် ပေါ် (ink ၁.၆၃%၊ အလျား ၃၃.၉%၊ အမြင့် ၄၆.၁%) |
