# Video Export Speed Audit — 2026-11-18

တောင်းဆိုချက်: "Video ထုတ်တဲ့အခါ အရမ်းလေးနေတယ်။ မဆိုင်တဲ့ code တွေ ရှိနေလား၊ Video Engine က အလုပ်မလုပ်လို့လား" — ဤစာရွက်က စစ်ဆေးမှုရလဒ်သာ ဖြစ်သည်။ **ကုဒ် မပြင်ရသေးပါ။**

## အဓိကအဖြေ

**Video Engine က အလုပ်လုပ်နေပါသည်။** WebCodecs လမ်းကြောင်း (`path: "webcodecs"`) ကို သုံးနေပြီး 1080p30 ကို တစ်စက္ကန့် **141 frame** ဖြင့် encode နိုင်သည်။ နှေးရခြင်း၏ အကြောင်းရင်းမှာ ကုဒ်အမှားမဟုတ်ဘဲ **Thank You clip ကို frame တစ်ခုချင်း seek လုပ်ခြင်း** ဖြစ်သည်။

## တိုင်းတာမှုများ (Chromium headless, 1920×1080, 30 fps)

| အခြေအနေ | အချိန် | fps |
|---|---|---|
| ဗလာ frame 180 ခု (blank fill) | 1.28 s | 141 |
| စာသားပါ frame 180 ခု | 1.22 s | 147 |
| Guitar MusicXML တစ်ခုလုံး (60 frame) | 0.12 s | 487 |
| **Thank You clip 180 frame** | **77.0 s** | **2.3** |
| Thank You clip ထပ်မံ (cache ပါ) | 76.0 s | 2.4 |

Guitar export တစ်ခု (score 2 s + Thank You 6 s = 240 frame): **77.5 s**။
ထဲက Rendering အဆင့် = 76.5 s၊ Encoding the sound + Writing the file = 0.09 s။

## အကြောင်းရင်း: `seekThankYou` ၏ 250 ms fallback ကို အမြဲထိခြင်း

`video-engine.js` ရှိ `seekThankYou` က `requestVideoFrameCallback` (rVFC) ကို **`seeked` event ပြီးမှ** မှတ်ပုံတင်သည်။ paused element တွင် seek ပြီးချိန် frame ကို ထို moment တွင် ပေးပြီးသား ဖြစ်နိုင်သဖြင့် နောက်မှ မှတ်ပုံတင်သော callback က frame အသစ် မရတော့ဘဲ `setTimeout(finish, 250)` သာ အလုပ်လုပ်သည်။

တိုင်းတာချက် — 180 seek တွင်:

| နည်းလမ်း | စုစုပေါင်း | တစ် frame |
|---|---|---|
| လက်ရှိကုဒ် (rVFC ကို seeked ပြီးမှ) | 72.6–74.3 s | 403–413 ms |
| rVFC ကို seek မတိုင်မီ မှတ်ပုံတင် | 28.5–29.6 s | 143–164 ms |
| `seeked` ကိုသာ စောင့် | 29.6 s | 164 ms |

လက်ရှိကုဒ်တွင် fallback ကို **180 ကြိမ်အနက် 179 ကြိမ်** ထိသည်။ ဆိုလိုသည်မှာ 250 ms timeout သည် အမှန်တကယ် အလုပ်စားနေသည့် အပိုင်း ဖြစ်သည် (250 ms × 180 ≈ 45 s၊ ကျန် 30 s က decoder ကိုယ်တိုင်)။

**ပုံ အရည်အသွေး မကျပါ** — သုံးမျိုးလုံးမှ ထွက်လာသော frame များကို pixel နှိုင်းယှဉ်ကြည့်ရာ ကွာခြားချက် **0** ဖြစ်သည် (distinct frame 120/120 တူညီ)။ rVFC-before-seek သည် လက်ရှိကုဒ်၏ ရည်ရွယ်ချက်ကို မပျက်ဘဲ **2.5 ဆ မြန်သည်**။

## "မဆိုင်တဲ့ code" စစ်ဆေးချက်

Guitar စာမျက်နှာက script **14 ခု** (≈435 KB) ကို load လုပ်သည်။ အောက်ပါတို့သည် `data-guitar-*` ဒြပ်စင် မရှိသဖြင့် အလုပ်မလုပ်ဘဲ ချက်ချင်း return ပြန်သည်:

| ဖိုင် | အရွယ် | မှတ်ချက် |
|---|---|---|
| `assets/sticking-engine.js` | 80 KB | drum sticking |
| `assets/metronome-engine.js` | 61 KB | metronome |
| `assets/piano-hand-engine.js` | 53 KB | piano hand |
| `studio-video.js` | 47 KB | drum adapter (line 311 တွင် guitar အတွက် return) |
| `studio-piano.js` / `studio-bass.js` / `studio-metronome.js` / `studio-violin.js` / `studio-voice.js` | 17–20 KB / 9–17 KB | tool guard ဖြင့် ချက်ချင်း return |
| `drum-kit.js` / `script.js` | 14 KB / 9 KB | menu/theme အစရှိ |

**A/B တိုင်းတာချက်** — ထို script များကို network level တွင် ပိတ်ပြီး တူညီသော export ကို run:

| အခြေအနေ | အချိန် | fps |
|---|---|---|
| ပုံမှန် (script 14 ခုလုံး) | 76.3 s | 2.4 |
| မဆိုင်တဲ့ script ၁၀ ခု ပိတ် | 76.1 s | 2.4 |
| + `studio-video.js` ပါ ပိတ် | 76.2 s | 2.4 |

**ကွာခြားချက် မရှိပါ။** ထို script များသည် export အမြန်နှုန်းအပေါ် သက်ရောက်မှု မရှိပါ — load 435 KB ကို လျှော့ချခြင်းက စာမျက်နှာဖွင့်ချိန်ကိုသာ သက်သာစေမည်၊ export ကို မဟုတ်ပါ။

## အခြားတွေ့ရှိချက်

- `studio.html` က `studio-*.js` အားလုံးကို တစ်မျက်နှာတည်းတွင် load သည်။ tool guard ရှိသဖြင့် အလုပ်မလုပ်သော်လည်း bandwidth ကုန်သည်။ ဤအလုပ်သည် တောင်းဆိုချက်၏ ပြင်ပ ဖြစ်သဖြင့် မပြင်ပါ။
- Thank You clip ကို seek မလုပ်ဘဲ real-time ဖွင့်ယူခြင်း (playback capture) က 6.0 s (178 frame) ဖြစ်သည် — seek နည်းလမ်းထက် **~5 ဆ** မြန်သည်။ သို့သော် frame အရေအတွက် အတိအကျ မရခြင်း၊ headless/background tab တွင် throttle ဖြစ်ခြင်း အန္တရာယ် ရှိသည်။
- Score အပိုင်း (notation + neck + title) က frame တစ်ခုလျှင် 2–14 ms သာ ဖြစ်သည် — ပုံဆွဲခြင်းက ပုလဲဆို့မှု မဟုတ်ပါ။

## ဖြေရှင်းရန် လမ်းကြောင်း (မလုပ်ရသေးပါ)

1. `seekThankYou` တွင် rVFC ကို `seeked` မတိုင်မီ မှတ်ပုံတင်ခြင်း — ခန့်မှန်း 77 s → 30 s၊ pixel ကွာခြားချက် မရှိ။ **အသေးဆုံး၊ အကျိုးအမြတ်အမြင့်ဆုံး**။
2. Thank You clip ကို timeline တွင် ထပ်ခါထပ်ခါ seek မလုပ်ဘဲ တစ်ကြိမ်ဖွင့်ယူပြီး frame များကို buffer လုပ်ခြင်း — ခန့်မှန်း 6 s၊ သို့သော် memory နှင့် throttle အန္တရာယ် ရှိ။
3. WebCodecs `VideoDecoder` ဖြင့် clip ကို decode လုပ်ပြီး frame ကို တိုက်ရိုက်ယူခြင်း — အကောင်းဆုံး ဖြစ်နိုင်သော်လည်း ကုဒ် ပြောင်းလဲမှု အကြီးမားဆုံး။
4. စာမျက်နှာတိုင်းတွင် လိုအပ်သော script ကိုသာ load ခြင်း — export မဟုတ်ဘဲ page load ကို သက်သာစေသည်။

## စမ်းသပ်မှု အခြေအနေ

- ဤစစ်ဆေးမှုသည် တိုင်းတာမှုသာ ဖြစ်သည်; repository တွင် ကုဒ် မပြောင်းပါ။
- ရှိပြီးသား test များ (21/21 unit, guitar + bass browser test) ကို ထိန်းထားဆဲ ဖြစ်သည်။
