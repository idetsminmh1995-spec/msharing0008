# Notation Lab Page

**ရက်စွဲ:** 2026-11-13

## အလုပ်အကျဉ်း

`Website/Website/notation.html` တွင် hero banner နှင့် marketing copy မပါသော Notation Lab workspace ကို ထည့်သွင်းခဲ့သည်။ `.musicxml`, `.xml` နှင့် `.mxl` ဖိုင်များကို file picker သို့မဟုတ် drag-and-drop ဖြင့် ရွေးချယ်နိုင်ပြီး လက်ရှိ `NotationEngine` browser bundle ကို အသုံးပြုကာ notation ပြသသည်။ Page နှင့် Horizontal view ကို engine ၏ `layout.mode: 'page' | 'scroll'` ဖြင့်ပြောင်းနိုင်သည်။ `Download PDF` သည် engine ၏ `exportPdf()` ကိုခေါ်ပြီး ဖိုင်အမည်ကို input ဖိုင်အမည်မှ ရယူသည်။ Import area ကို ကြီးမားသော box အဖြစ်မထားဘဲ `Choose file` ခလုတ်ငယ်တစ်ခုသာ ထားကာ အောက်ခြေ fixed dock တွင် ထည့်ထားသည်။ ဖုန်းတွင် dock ကို mobile bottom navigation ၏ အပေါ်ဘက်၌ ပြထားသည်။

## Playback နှင့် Sound Engine ချိတ်ဆက်မှု

`src/soundfont/browser.ts` ရှိ `R2SoundFontEngine` သည် R2 manifest/cache မှ MuseScore General SF3 ကို user ၏ Play gesture အချိန်တွင် load လုပ်ပြီး SpessaSynth AudioWorklet သို့ ချိတ်သည်။ Notation playback event stream ထဲရှိ pitched `midiNotes` နှင့် `durationTicks` ကို အသုံးပြုပြီး note-on/note-off scheduling လုပ်သည်။ Notation Lab သည် SoundFont loading/error state, play, pause နှင့် volume ကို ချိတ်ထားသည်။

Default URL များသည် same-origin `soundfonts/manifest.json` နှင့် `soundfonts/` ဖြစ်သည်။ R2 custom domain သုံးမည်ဆိုပါက `window.MSHARING_SOUNDFONT_CONFIG = { manifestUrl: 'https://cdn.example.com/soundfonts/manifest.json', assetBaseUrl: 'https://cdn.example.com/soundfonts' }` ကို `notation.js` မတင်မီ သတ်မှတ်ပါ။

- `notationlab:ready` — `{ apiVersion: 1 }`
- `notationlab:score-loaded` — `{ playback, filename, volume }`
- `notationlab:play-request` — legacy host hook; built-in R2 bridge သည် Play gesture မှာ တိုက်ရိုက် initialize လုပ်သည်
- `notationlab:play` / `notationlab:pause` — `{ playback, volume }`
- `notationlab:volume` — `{ volume }` (0–1)
- `notationlab:sound-ready` — Sound Engine က `document` ပေါ် dispatch လုပ်ရန်
- `notationlab:playback-state` — `{ playing: boolean }`
- `notationlab:playback-ended` — playback ပြီးဆုံးကြောင်း

## ပြောင်းလဲခဲ့သည့် paths

- `Website/Website/notation.html` — Notation Lab route, import UI, notation controls, notation container.
- `Website/Website/notation.js` — MusicXML/MXL import, engine rendering, view switching, PDF download, playback event bridge.
- `Website/Website/styles.css` — compact responsive workspace/control styling.
- `Website/Website/assets/notation-engine.js` — website ကတင်သုံးနိုင်ရန် bundled engine copy.
- `Website/Website/assets/sound-engine.js` — R2SoundFontEngine browser bundle.
- `Website/Website/assets/spessasynth_processor.min.js` — SpessaSynth AudioWorklet processor.
- `Website/Website/index.html` — Notation Lab navigation link ကို page အသစ်သို့ ချိတ်ဆက်ခြင်း။
- `Website/Website/studio.html` — Studio မှ Notation Lab navigation ကို page အသစ်သို့ ချိတ်ဆက်ခြင်း။
- `Website/Doc/README.md` — ဤ document link.
- `Website/Plan/README.md` — page scope နှင့် Sound Engine dependency ဆိုင်ရာ ဆုံးဖြတ်ချက်.

## စစ်ဆေးမှု

- Notation Engine source မှ public renderer, `unzipMxl()`, `exportPdf()` နှင့် page/scroll configuration contract ကို စစ်ဆေးခဲ့သည်။
- `notation.js` ကို `node --check` ဖြင့် syntax စစ်ဆေးခဲ့ပြီး pass ဖြစ်သည်။
- Static HTML/CSS/JavaScript changes ဖြစ်ပြီး repository အတွက် active Webdev language-diagnostics project မရှိပါ။
- Chromium ဖြင့် desktop `1440×900`, phone `403×639` နှင့် ကျဉ်းသော phone `320×740` viewport များကို စစ်ဆေးခဲ့သည်။ Phone တွင် `Choose file`, Page/Horizontal dropdown နှင့် PDF icon သည် ပထမအတန်း၊ Play/zoom/volume သည် ဒုတိယအတန်းတွင် နေရာကျဉ်းစွာ ဝင်ဆံ့သည်။ Desktop တွင် dropdown နှင့် `Download PDF` စာသားကို ပြသသည်။ ယာယီ NotationEngine stub ဖြင့် dropdown နှင့် zoom interaction ကိုစမ်းသပ်ခဲ့ပြီး preview ဖိုင်များကို ဖယ်ရှားထားသည်။
- `npm run build`, typecheck, lint နှင့် format စစ်ဆေးမှု pass ဖြစ်သည်။ Actual R2 audio playback သည် user bucket တွင် manifest/SF3 URL တင်ပြီး browser user gesture ဖြင့်သာ end-to-end စစ်ဆေးနိုင်မည်။

## ကျန်ရှိသောအလုပ်

1. User R2 bucket URL/manifest ကို production environment တွင် ထည့်ပြီး browser audio playback ကို end-to-end စစ်ဆေးပါ။
2. Unpitched drum mapping နှင့် MusicXML instrument program/bank routing ထည့်ပါ။
3. Browser တွင် MusicXML/MXL import, Page/Horizontal layout, PDF download နှင့် responsive display ကို end-to-end စစ်ဆေးပါ။


## 2026-11-13 — Workspace space reduction

Workspace အတွင်း နေရာမယူစေရန် `Notation Lab` H1, ရွေးထားသော MusicXML ဖိုင်အမည်နှင့် အောင်မြင်ကြောင်းပြသသည့် `Notation loaded.` status ကို မျက်မြင်မှ ဖယ်ထားသည်။ H1 နှင့် status live region ကို screen reader အတွက် ဆက်လက်ထားပြီး အမှား သို့မဟုတ် Engine မရရှိသည့်အခါမှသာ status ကို မြင်သာစေသည်။


## 2026-11-13 — Full-width notation canvas and zoom

Notation canvas ကို card border နှင့် rounded frame မပါဘဲ workspace အကျယ်ပြည့် ပြင်ဆင်ထားပြီး lower fixed toolbar အတွင်း Play အနီး၌ zoom-out / zoom-in ခလုတ်နှင့် ရာခိုင်နှုန်းကို ထည့်ထားသည်။ Zoom သည် 50% မှ 200% အထိ 10% စီ ပြောင်းနိုင်ပြီး notation re-render လုပ်သည့်အခါ ရွေးထားသော အရွယ်အစားကို ထိန်းထားမည်။


## 2026-11-13 — Compact responsive toolbar

Page နှင့် Horizontal ရွေးချယ်မှုကို ခလုတ်နှစ်ခုအစား dropdown တစ်ခုအဖြစ်ပြောင်းထားသည်။ Phone တွင် `Choose file`, dropdown နှင့် PDF download icon ကို အတန်းတစ်တန်းတည်း၊ Play/zoom/volume ကို နောက်တစ်တန်းတည်း ပြသသည်။ PDF icon တွင် screen reader ဖတ်ရှုနိုင်သည့် `Download PDF` အမည်ကို ထည့်ထားသည်။
