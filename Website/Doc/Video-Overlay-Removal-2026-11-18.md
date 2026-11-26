# Video မှ အ​ရောက်/overlay များ ဖြုတ်ခြင်း (2026-11-18)

## ရည်ရွယ်ချက်

Main Plan §၁၃.၃ (က) — Video တစ်ခုလုံး တစ်သားတည်း ပုံစံ။ နောက်ခံတွင် ထပ်ထားသော အလင်းနှင့် စာရွက်အဖြူ plate များကို ဖြုတ်သည်။ ရည်ညွှန်း: `Website/Doc/Images/drum-video-reference.png`။

## ဖြုတ်ခဲ့သော overlay သုံးမျိုး

| # | နေရာ | ဖြုတ်ခဲ့သည့်အရာ |
|---|---|---|
| ၁ | `Website/Website/studio-video.js` `drawPerformance` | နောက်ခံအပေါ် ထပ်ဆွဲထားသော အနီ radial glow (`createRadialGradient`, `#f20d3d` 0.24/0.10, အမြင့် 55% အထိ)။ သုံးမှုမကျန်တော့သော `hexToRgba` helper ကိုပါ ဖြုတ်သည်။ |
| ၂ | `studio-guitar.js`၊ `studio-bass.js`၊ `studio-piano.js`၊ `studio-violin.js` | `prepareNotationFor` နှင့် `drawNotationPart` သို့ `palette` မပေးခဲ့သဖြင့် engine က `#ffffff` စာရွက်ကို ဆွဲနေသည်။ ယခု palette ပေး၍ စာရွက် = ဖရိမ်နောက်ခံ ဖြစ်သည်။ |
| ၃ | `Website/Website/styles.css` | `.video-stage` ၏ `radial-gradient(rgba(242,13,61,.12),…)` (light theme တွင် `.1`) နှင့် `.is-playing` ၏ `inset 0 0 45px rgba(242,13,61,.08)`။ |

`drums`/`voice` စာမျက်နှာများသည် palette ကို ယခင်ကတည်းက ပေးထားသဖြင့် မပြောင်းလဲပါ။

## တိုင်းတာမှု

| ဖရိမ် | မတိုင်မီ | ပြီးနောက် |
|---|---|---|
| Drum 1920×1080၊ glow ရှိရာ x=0.72w | `(55,13,30)` → `(63,13,31)` | နေရာတိုင်း `(8,13,22)` |
| Guitar 1280×720၊ အလယ် pixel | `(255,255,255)`၊ အဖြူနမူနာ 212,105 | `(8,13,22)`၊ အဖြူနမူနာ 0 |
| Guitar 1080×1920 (test frame)၊ အဖြူနမူနာ | — | 20 (စာသားအနားသတ် antialias သာ၊ နယ်ပယ်၏ 0.01% အောက်) |

## Test ပြင်ဆင်ချက်

| File | ပြောင်းလဲမှု |
|---|---|
| `test-guitar-studio-browser.mjs` | `otherPixels > backgroundPixels` (အဖြူ plate ကြောင့်သာ အောင်ခဲ့သည်) ကို (က) အနည်းဆုံး ink ရှိကြောင်း၊ (ခ) အဖြူနမူနာ နယ်ပယ်၏ 1% အောက်၊ (ဂ) လည်ပင်း band တွင် pixel 20,000 အထက် ဆိုသည့် စစ်သုံးခုဖြင့် အစားထိုးသည်။ |
| `test-bass-studio-browser.mjs` | အထက်ပါအတိုင်း (bass အတွက် စကားလုံးဖြင့်)။ |

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-drum-reference-browser.mjs` | pass — band၊ info box နှင့် Video Color နှစ်မျိုး |
| `test-title-info-browser.mjs` | pass — 16:9, 1:1, 9:16 |
| `test-guitar-studio-browser.mjs` | pass — 1080×1920, 4.00s (+ Thank You 6.00s) |
| `test-bass-studio-browser.mjs` | pass |
| `test-piano-studio-browser.mjs` | pass |
| `test-violin-studio-browser.mjs` | pass |
| `test-studio-video-browser.mjs` | pass |
| `test-notation-view-browser.mjs` | pass — Page 16:9/1:1/9:16 နှင့် Horizontal |
| `test-studio-dispatch-browser.mjs` | pass |
| `test-metronome-studio-browser.mjs` | pass |
| `tests/*.test.mjs` (3 ဖိုင်) | pass |

## မပါဝင်သေးသည်

- `drum-video-reference.png` နှင့် pixel ချင်း တိုက်စစ်သည် ဤအလုပ်တွင် မလုပ်ခဲ့ပါ။
- `thankYouSegment` နှင့် `voice` waveform ၏ နောက်ခံကို မထိပါ။
