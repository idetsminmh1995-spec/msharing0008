# WebM အရောင် ပြင်ဆင်ခြင်းနှင့် Sync/Notation တိုင်းတာမှု ပြင်ဆင်ချက် (2026-11-18)

## ရည်ရွယ်ချက်

H.264/MP4 export ကို အသေးစိတ် စစ်ဆေးစဉ် တွေ့ရှိချက် နှစ်မျိုးကို ဖြေရှင်းသည်။

1. WebCodecs မရှိသော browser အတွက် ကျန်ခဲ့သည့် WebM လမ်းကြောင်းတွင် အရောင် ပျက်နေသည် — ဖိုင်၌ colour range မဖော်ပြသဖြင့် player က limited range ဟု ယူဆသည်။
2. `test-studio-video-browser.mjs` ၏ sync တိုင်းတာမှုသည် H.264 အတွက် မသင့်လျော်သော frame-level threshold ကို သုံးနေသည်။ Engine ချို့ယွင်းချက် မဟုတ်ပါ။

## ၁။ WebM တွင် colour range နှင့် matrix ဖော်ပြခြင်း

### ပြဿနာ

`muxWebM` သည် `Video` element ထဲတွင် `PixelWidth`/`PixelHeight` ကိုသာ ရေးခဲ့သည်။ VP8 encoder ကို full-range canvas ပေးထားသော်လည်း ဖိုင်က မဖော်ပြသဖြင့် decoder က limited range (16–235) အဖြစ် ဖြန့်သည်။

Grey ramp တိုင်းတာမှု (1280×160၊ `0,16,32,64,128,192,235,255` ရှစ်ကွက်၊ browser ထဲတွင် ဖွင့်ဖတ်):

| Source | မတိုင်မီ | ပြီးနောက် |
|---|---|---|
| 0 | 0 | 0 |
| 16 | **0** | 16 |
| 32 | **19** | 32 |
| 64 | **56** | 64 |
| 128 | 130 | 128 |
| 192 | **205** | 192 |
| 235 | **255** | 235 |
| 255 | 255 | 255 |

မတိုင်မီတွင် tone နှစ်ဖက်စွန်း ပျက်၍ ခြောက်သွေ့သည်။ နောက်ခံအမှောင် `(8,13,22)` သည် လုံးဝ အမည်း `(0,0,6)` ဖြစ်သွားသည်။ MP4 လမ်းကြောင်းတွင်မူ `colr`/`nclx` ရှိပြီးဖြစ်၍ မှန်နေသည်။

### ပြင်ဆင်မှု

`website/assets/video-engine.js`:

| နေရာ | ပြောင်းလဲမှု |
|---|---|
| `ID` ဇယား | `Colour` (`55B0`), `MatrixCoefficients` (`55B1`), `Range` (`55B9`), `TransferCharacteristics` (`55BA`), `Primaries` (`55BB`) ထည့်သည် |
| `muxWebM` ၏ ဗီဒီယို `TrackEntry` | `Video` element ထဲတွင် `Colour` ထည့် — matrix 1 (BT.709), range 2 (full), transfer 13 (sRGB), primaries 1 (BT.709) |

MP4 ၏ `nclx` နှင့် တူညီသော ကြေညာချက်ဖြစ်သည်။ ပြင်ပြီးနောက် `ffprobe` က `color_range=pc`, `color_space=bt709`, `color_transfer=iec61966-2-1`, `color_primaries=bt709` ဟု ဖတ်သည်။

## ၂။ Sync တိုင်းတာမှု ပြင်ဆင်ခြင်း

နမူနာ ၁၉၂၀×၁၀၈၀ export တွင် frame တစ်ခုချင်း pixel ရေတွက်မှု (`|Δ| > 20` ဖြတ်သော pixel အရေအတွက်) ကို သုံးခဲ့သည်။ H.264 က VP8 ထက် stroke အနားသတ်ကို ပိုချောမွေ့စွာ encode လုပ်သဖြင့် တူညီသော stroke ၏ peak နိမ့်သည်။ Threshold က "stroke မရှိ" ဟု မှားဖတ်ပြီး ကွာဟမှု 67 ms ဟု ထင်ရသည်။

| Metric | MP4 (H.264) | VP8 |
|---|---|---|
| Band ပြောင်းလဲမှု ပျမ်းမျှ | 0.598 | 0.318 |
| `abs(Δ) > 10` ဖြတ်သော pixel | 470 | **0** |

ယခု deviation ပမာဏ (`Σ abs(value − median) / pixel count`) ကို သုံးသည် — codec နှစ်ခုလုံးအတွက် တူညီစွာ အလုပ်လုပ်သည်။

Notation cursor ကိုလည်း အလားတူ ပြင်သည်။ Cursor သည် ရွေ့နေသော်လည်း အနီ pixel အရေအတွက် မပြောင်းလဲသဖြင့် (`922` နှင့် `922`) `assert.notEqual` က မမှန်ကန်စွာ ကျခဲ့သည်။ ယခု အနီ pixel အုပ်စု၏ **x centroid** ကို တိုင်းသည် — `713` နှင့် `981`။

## ပြောင်းလဲခဲ့သော ဖိုင်များ

| File | ပြောင်းလဲမှု |
|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | WebM `Colour` element (source-of-truth) |
| `Website/Website/assets/video-engine.js` | `sync-video-engine.mjs` ဖြင့် ကူးထားသော production copy |
| `Website/Video/Video Engine/source/tools/test-video-engine.mjs` | EBML reader နှင့် WebM colour unit test အသစ် |
| `Website/Video/Video Engine/source/tools/test-studio-video-browser.mjs` | Sync metric ကို deviation သို့၊ notation cursor ကို centroid သို့ |

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-video-engine.mjs` | pass ၁၆ (WebM colour test အသစ် အပါ) |
| `test-studio-video-browser.mjs` | pass — သုံးခါ ဆက်တိုက် |
| `test-video-engine-browser.mjs` | pass |
| `test-audio-contract-browser.mjs` | pass |
| `test-guitar-studio-browser.mjs` | pass — 1080×1920, H.264, 4.00s |
| `test-bass-studio-browser.mjs` | pass |
| `test-violin-studio-browser.mjs` | pass |
| `test-voice-studio-browser.mjs` | pass (ပထမအကြိမ် browser startup 404၊ ပြန် run တွင် pass) |
| `test-metronome-studio-browser.mjs` | pass |
| `test-studio-dispatch-browser.mjs` | pass |
| `test-notation-clip-browser.mjs` | pass — 16:9/1:1/9:16, Page နှင့် Horizontal |
| `test-notation-view-browser.mjs` | pass |
| `test-title-info-browser.mjs` | pass |
| `test-drum-reference-browser.mjs` | pass |
| `test-mxl-score-browser.mjs` | pass |
| `test-piano-studio-browser.mjs` | **fail** — မပြင်ရသေးသော base ကုဒ် (`ef4fdcc`) တွင်လည်း အတူတူ ကျသည်။ ဤပြောင်းလဲမှုနှင့် မဆိုင်ပါ |

### Sync နှင့် အရောင် တိုင်းတာချက် (MP4)

| အချက် | ရလဒ် |
|---|---|
| Best lag (120 frame အပေါ် correlation) | **0 frame** — sync error 0 ms |
| Grey ramp round trip | `0,16,32,64,128,192,235,255` အတိအကျ |
| Source → decoded (drum frame) | background `(15,22,38)`→`(14,22,36)`, orange `(246,168,0)`→`(242,167,0)`, red `(209,51,46)`→`(206,50,45)` |
| MP4 bitrate (4 s, 1080p) | 770 kbps၊ VP8 က 1.80 Mbps (တူညီသော အရည်အသွေးအတွက် ပိုသေး) |

### Negative check

`Colour` element ကို ဖြုတ်ထားသော ကုဒ်ကို ဖန်တီး၍ test အသစ်ကို run ကြည့်သည် — `the video track does not state its colour, so a player assumes limited range` ဖြင့် ကျသည်။ Test က fix ကို တကယ် ကာကွယ်ကြောင်း အတည်ပြုပြီး။

## မပြီးသေးသည့်အလုပ်

- `test-piano-studio-browser.mjs` ၏ `The piano frame is mostly empty` ကျချက်သည် ယခင်ကတည်းက ရှိနေသည်။ Base ကုဒ်တွင် အတူတူ ကျသဖြင့် ဤအလုပ်နှင့် မဆိုင်ပါ — သီးခြား စစ်ဆေးရန် လိုသည်။
- `test-voice-studio-browser.mjs` သည် browser startup တွင် တစ်ခါတစ်ရံ `/json` 404 ဖြင့် ကျသည်။ ပြန် run တွင် pass ဖြစ်သဖြင့် ပတ်ဝန်းကျင် ပြဿနာဟု ယူဆသည်။
