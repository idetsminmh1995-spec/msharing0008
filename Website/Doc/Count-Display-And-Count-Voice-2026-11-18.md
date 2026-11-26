# Count ကို တစ်နေရာတည်း ပြခြင်း နှင့် Count Voice ဖိုင်စု ရွေးချယ်မှု (2026-11-18)

## ရည်ရွယ်ချက်

Main Plan **V12** (COUNT ကွက် beat တိုင်း ပြောင်း)၊ **V19** (Count Voice ကို R2 အသံဖိုင်ဖြင့်၊ COUNT ကွက်ထဲတွင်သာ ပြ) နှင့် §၁၅ ("Count Display သည် COUNT ကွက်လေးထဲတွင်သာ ပြမည်")။ User က video ထဲမှာ count နှစ်နေရာ ပေါ်နေတာ တွေ့သဖြင့် စစ်ဆေးပြင်ဆင်ခြင်း။

## တွေ့ရှိချက်

**၁။ Count နှစ်နေရာ ဆွဲနေခြင်း** — `drawInfoBand()` သည် TIME / BPM / COUNT ကွက် ၃ ခုကို ဆွဲပြီး၊ ၎င်း၏ အဆုံးတွင် `settings.countEnabled` ရှိလျှင် `drawCountRow()` ကို ခေါ်၍ ကွက်များ၏ အောက်တွင် `1 2 3 4` (သို့) `1& 2& 3& 4&` ကို အတန်းလိုက် ထပ်ဆွဲသည်။ Plan §၁၅ အရ count သည် **COUNT ကွက်ထဲတွင်သာ** ရှိရမည်။

**၂။ Browser က version အိုကို ဆွဲနေခြင်း** — `studio.html` တွင် ကြေညာထားသော `?v=` key များသည် ဖိုင်များ၏ တကယ့် bytes နှင့် မကိုက်ပါ။ ၈ ဖိုင် ကျော် ဤအခြေအနေတွင် ရှိခဲ့သည် (`studio-video.js`, `studio-{guitar,piano,bass,violin,voice}.js`, `styles.css`, `assets/video-engine.js`)။ ထို့ကြောင့် browser သည် cache ထဲက ကုဒ်အိုကို ဆက်လက် အသုံးပြုနေပြီး၊ local တွင် ပြင်ပြီးသား ကုဒ်ကို မမြင်ရခြင်း ဖြစ်သည်။

**၃။ Count Voice ဖိုင်စု နှစ်စု မတူညီခြင်း** — R2 တွင် `1.wav…7.wav` နှင့် `M1.wav…M7.wav` နှစ်စုလုံး ရှိသည် (၈ မရှိ)။ တိုင်းကြည့်ချိန် —

| ဖိုင် | အသံထွက်ချိန် | သဘော |
|---|---|---|
| `1.wav` | ~0.32 s | စကားသံ (formant ကျယ်) |
| `M1.wav` | ~0.016 s | metronome marker (အလွန်တို၊ 1200 Hz စူး) |

ယခင်ကုဒ်သည် folder အမည် (`Counts  vocal` / `Voices`) ကိုသာ ခွဲပြီး၊ Studio ၏ `numeric` ရွေးချယ်မှုသည် R2 တွင် **လုံးဝ မရှိ**သော `Counts  numeric` folder ကို ရှာသည်။ ထို့ကြောင့် select သည် အလုပ်မလုပ်ဘဲ၊ ဖိုင်စု ရွေးချယ်နိုင်ခြင်း မရှိခဲ့ပါ။

## ပြောင်းလဲခဲ့သည့် files

| File | ပြောင်းလဲမှု |
|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | `drawInfoBand()` မှ ထပ်နေသော `drawCountRow()` ခေါ်ဆိုမှုကို ဖယ်။ `drawCountRow()` ကို ဖျက်။ `COUNT_VOICE_STYLES` (folder အမည်) ကို `COUNT_VOICE_FOLDERS` + `COUNT_VOICE_SETS` (ဖိုင်အမည်) ဖြင့် အစားထိုး။ `countVoiceUrls()` / `loadCountVoice()` / `countVoiceSamples()` သည် ရွေးထားသော ဖိုင်စုကို အရင်တောင်း၊ ကျန်တစ်ခုကို အရန်။ |
| `Website/Website/assets/video-engine.js` | `tools/sync-video-engine.mjs` မှ copy (`--check` pass)။ |
| `Website/Website/studio.html` | Drum ၏ Count Voice select ကို `1,2,3,4 files` (`spoken`) နှင့် `M1,M2,M3,M4 files` (`marker`) ဖြင့် အစားထိုး။ |
| `Website/Website/studio-video.js` | `countVoice` default ကို `one-two` မှ `spoken` သို့။ |
| `Website/Website/*.html` | `sync-website-bundle.mjs` မှ app cache key ၁၁ ခု ပြန်ထုတ် (4 page)။ |
| `Website/Video/Video Engine/source/tools/test-studio-video-browser.mjs` | တောင်းခံသော count-recording address များကို မှတ်တမ်းတင်ပြီး၊ spoke/marker ရွေးချယ်မှု တကယ် ရောက်ကြောင်း စစ်သည်။ |

## Implementation detail

- **Count တစ်နေရာတည်း** — Count ကို ဆွဲသည့် လမ်းကြောင်း တစ်ခုတည်း ကျန်သည်: `drawInfoBoxes()` ထဲက COUNT ကွက်။ Count-in အတွင်းနှင့် score အတွင်း နှစ်ခုလုံးတွင် ထို ကွက်တည်းက ပြသည်။
- **ဖိုင်စု ရွေးချယ်မှု** — `COUNT_VOICE_SETS.spoken` = `{n}.wav`၊ `.marker` = `M{n}.wav`။ `countVoiceUrls()` သည် ရွေးထားသည့် အစုကို folder နှစ်ခုလုံးတွင် အရင်တောင်းပြီး၊ ကျန်အစုကို နောက်မှ တောင်းသည်။ ထို့ကြောင့် ရွေးထားသည့် ဖိုင်မရှိလျှင်လည်း အသံ မတိတ်ဘဲ၊ ကျန်အစုဖြင့် ဆက်ရေတွက်သည်။
- **Cache key** — cache key ကို `urls[0]` (ရွေးထားသော ဖိုင်စု၏ ပထမ address) ဖြင့် သတ်မှတ်သဖြင့် ဖိုင်စုနှစ်ခုကို တစ်ခုတည်း မှတ်မိမှား မဖြစ်ပါ။

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-drum-reference-browser.mjs` | PASS — count token တစ်ခါတည်း ဆွဲ၊ BPM နှင့် တူညီသော value line |
| `test-studio-video-browser.mjs` (Drum) | PASS — count-in centre ဗလာ (`offBackground: 0`)，COUNT ကွက် beat ကြား ပြောင်း၊ spoken/marker နှစ်ခုလုံး အသံထွက်၊ fallback folder အလုပ် |
| `test-metronome-studio-browser.mjs` | PASS |
| `test-video-engine.mjs` | PASS |
| `test-video-engine-browser.mjs` | PASS |
| `test-title-info-browser.mjs` | PASS |
| `test-studio-dispatch-browser.mjs` | PASS |
| `test-audio-contract-browser.mjs` | PASS |
| `test-mxl-score-browser.mjs` | PASS |
| `test-notation-view-browser.mjs` | PASS |
| `test-notation-clip-browser.mjs` | PASS |
| `test-guitar/piano/bass/violin/voice-studio-browser.mjs` | PASS (5/5) |
| `website/tests/*.test.mjs` | PASS (3/3) |
| `sync-video-engine.mjs --check` | in sync |
| App cache key ၁၆ ခုလုံး | ဖိုင် bytes နှင့် ကိုက် |

တိုင်းတာချက် (Drum, 120 BPM, 4/4): count-in အလယ် ဗလာ (`offBackground 0/518400`)၊ COUNT ကွက် checksum beat ၂ ခုကြား ကွဲ (`976506829` vs `458473156`)၊ အသံ RMS — click သာ `0.74`၊ voice ပါ `9491`၊ score စပြီးနောက် `2178`။

## ကျန်ရှိ / သတိပြုရန်

- Plan တွင် "၇ ထက်များသော meter (`9/8`, `12/8`) ကို ဘယ်လိုရေတွက်မည်" ကို မဖြေရှင်းရသေးပါ။ R2 တွင် ၈ မရှိသဖြင့် ထို meter များတွင် နောက်ဆုံး beat များ အသံတိတ်မည်။
- Metronome Studio ၏ Count Voice သည် "not yet connected" အခြေအနေတွင် ရှိဆဲဖြစ်ပြီး၊ ဤ pass တွင် မထိပါ။
- စမ်းသပ်မှုများသည် headless Chromium ပေါ်တွင်သာ။
