# Notation Lab Page

**ရက်စွဲ:** 2026-11-13

## အလုပ်အကျဉ်း

`Website/Website/notation.html` တွင် hero banner နှင့် marketing copy မပါသော Notation Lab workspace ကို ထည့်သွင်းခဲ့သည်။ `.musicxml`, `.xml` နှင့် `.mxl` ဖိုင်များကို file picker သို့မဟုတ် drag-and-drop ဖြင့် ရွေးချယ်နိုင်ပြီး လက်ရှိ `NotationEngine` browser bundle ကို အသုံးပြုကာ notation ပြသသည်။ Page နှင့် Horizontal view ကို engine ၏ `layout.mode: 'page' | 'scroll'` ဖြင့်ပြောင်းနိုင်သည်။ `Download PDF` သည် engine ၏ `exportPdf()` ကိုခေါ်ပြီး ဖိုင်အမည်ကို input ဖိုင်အမည်မှ ရယူသည်။ Import area ကို ကြီးမားသော box အဖြစ်မထားဘဲ `Choose file` ခလုတ်ငယ်တစ်ခုသာ ထားကာ အောက်ခြေ fixed dock တွင် ထည့်ထားသည်။ ဖုန်းတွင် dock ကို mobile bottom navigation ၏ အပေါ်ဘက်၌ ပြထားသည်။

## Playback နှင့် Sound Engine ချိတ်ဆက်မှု

လက်ရှိ repository တွင် `Website/Notation/Sound Egnine/` သည် `.gitkeep` သာရှိပြီး sound playback implementation မရှိသေးပါ။ အသံထွက်နေသကဲ့သို့ မပြရန် Notation Lab သည် `notationlab:*` CustomEvent bridge ဖြင့် Sound Engine နှင့် ချိတ်ဆက်ရန် အခြေခံထားသည်။ `notationlab:sound-ready` ကို Sound Engine က dispatch လုပ်ပြီးနောက် Play ကိုဖွင့်နိုင်သည်။ Score load, play request, play, pause နှင့် volume ပြောင်းလဲမှုများကို event detail ထဲတွင် ပို့သည်။ Engine က playback-state နှင့် playback-ended event များကို ပြန်ပို့နိုင်သည်။

- `notationlab:ready` — `{ apiVersion: 1 }`
- `notationlab:score-loaded` — `{ playback, filename, volume }`
- `notationlab:play-request` — `{ playback, volume }` (Sound Engine မချိတ်ဆက်ရသေးလျှင်)
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
- `Website/Website/index.html` — Notation Lab navigation link ကို page အသစ်သို့ ချိတ်ဆက်ခြင်း။
- `Website/Website/studio.html` — Studio မှ Notation Lab navigation ကို page အသစ်သို့ ချိတ်ဆက်ခြင်း။
- `Website/Doc/README.md` — ဤ document link.
- `Website/Plan/README.md` — page scope နှင့် Sound Engine dependency ဆိုင်ရာ ဆုံးဖြတ်ချက်.

## စစ်ဆေးမှု

- Notation Engine source မှ public renderer, `unzipMxl()`, `exportPdf()` နှင့် page/scroll configuration contract ကို စစ်ဆေးခဲ့သည်။
- `notation.js` ကို `node --check` ဖြင့် syntax စစ်ဆေးခဲ့ပြီး pass ဖြစ်သည်။
- Static HTML/CSS/JavaScript changes ဖြစ်ပြီး repository အတွက် active Webdev language-diagnostics project မရှိပါ။
- Chromium ဖြင့် desktop `1440×900`, phone `403×639` နှင့် ကျဉ်းသော phone `320×740` viewport များကို စစ်ဆေးခဲ့သည်။ Phone တွင် `Choose file`, Page/Horizontal dropdown နှင့် PDF icon သည် ပထမအတန်း၊ Play/zoom/volume သည် ဒုတိယအတန်းတွင် နေရာကျဉ်းစွာ ဝင်ဆံ့သည်။ Desktop တွင် dropdown နှင့် `Download PDF` စာသားကို ပြသသည်။ ယာယီ NotationEngine stub ဖြင့် dropdown နှင့် zoom interaction ကိုစမ်းသပ်ခဲ့ပြီး preview ဖိုင်များကို ဖယ်ရှားထားသည်။
- `Sound Engine` implementation မရှိသေးသဖြင့် audio playback integration end-to-end မစစ်ဆေးနိုင်သေးပါ။

## ကျန်ရှိသောအလုပ်

1. Sound Engine ရရှိသောအခါ `notationlab:*` event bridge ကို engine ၏ playback API နှင့် ချိတ်ဆက်ပါ။
2. Browser တွင် MusicXML/MXL import, Page/Horizontal layout, PDF download နှင့် responsive display ကို end-to-end စစ်ဆေးပါ။


## 2026-11-13 — Workspace space reduction

Workspace အတွင်း နေရာမယူစေရန် `Notation Lab` H1, ရွေးထားသော MusicXML ဖိုင်အမည်နှင့် အောင်မြင်ကြောင်းပြသသည့် `Notation loaded.` status ကို မျက်မြင်မှ ဖယ်ထားသည်။ H1 နှင့် status live region ကို screen reader အတွက် ဆက်လက်ထားပြီး အမှား သို့မဟုတ် Engine မရရှိသည့်အခါမှသာ status ကို မြင်သာစေသည်။


## 2026-11-13 — Full-width notation canvas and zoom

Notation canvas ကို card border နှင့် rounded frame မပါဘဲ workspace အကျယ်ပြည့် ပြင်ဆင်ထားပြီး lower fixed toolbar အတွင်း Play အနီး၌ zoom-out / zoom-in ခလုတ်နှင့် ရာခိုင်နှုန်းကို ထည့်ထားသည်။ Zoom သည် 50% မှ 200% အထိ 10% စီ ပြောင်းနိုင်ပြီး notation re-render လုပ်သည့်အခါ ရွေးထားသော အရွယ်အစားကို ထိန်းထားမည်။


## 2026-11-13 — Compact responsive toolbar

Page နှင့် Horizontal ရွေးချယ်မှုကို ခလုတ်နှစ်ခုအစား dropdown တစ်ခုအဖြစ်ပြောင်းထားသည်။ Phone တွင် `Choose file`, dropdown နှင့် PDF download icon ကို အတန်းတစ်တန်းတည်း၊ Play/zoom/volume ကို နောက်တစ်တန်းတည်း ပြသသည်။ PDF icon တွင် screen reader ဖတ်ရှုနိုင်သည့် `Download PDF` အမည်ကို ထည့်ထားသည်။
