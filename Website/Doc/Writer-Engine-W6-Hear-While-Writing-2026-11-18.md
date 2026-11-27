# Writer Engine W6 — ရေးစဉ် အသံကြားခြင်း

**Date:** 2026-11-18
**File:** `Website/Website/notation-editor.js`
**Tests:** `Website/Notation/Notation Engine/test/unit/editor-integration.test.js`

## Goal

Note တစ်လုံး ရေးသည်နှင့် ချက်ချင်း အသံထွက်ရမည် (MuseScore ကဲ့သို့)၊ pitched နှင့်
drum နှစ်မျိုးလုံး။ ပြီးစီးမှု စံနှုန်းမှာ ပထမ note ပါ အသံ delay ~၁၀၀ ms အောက် ဖြစ်ရမည်။

## တွေ့ရှိခဲ့သော ပြဿနာ နှစ်ခု

1. **ပထမ note က အသံ delay ကြီးသည်။** SoundFont (~၄၀ MB) ကို ပထမ note ရေးချိန်မှ
   download စတင်သည်။ ထို note သည် ရေးပြီးသား ဖြစ်သွားပြီး အသံက စက္ကန့်များစွာ
   နောက်ကျသည် — အသုံးပြုသူအတွက် preview ပျက်နေသလို ထင်ရသည်။
2. **Font မပြည့်သေးချိန် preview တိတ်ဆိတ်သည်။** `R2SoundFontEngine.create()` က
   synth တည်ဆောက်ပြီးသည်နှင့် resolve ဖြစ်သည်၊ သို့သော် bank ကို ထည့်ပြီးမှ
   `ready` resolve ဖြစ်သည်။ ထို ကွက်လပ်တွင် ပို့သော note သည် အသံ မထွက်။

## ပြင်ဆင်ချက်များ

### ၁။ Score ဖွင့်သည်နှင့် font ကို ကြိုတင် load (`warmSound`)

`loadXml()` က `announce('Score ready.')` ပြီးသည်နှင့် `warmSound()` ကို ခေါ်သည်။
ထိုအချိန်သည် ရေးသူ ရှိနေပြီး မရေးရသေးသော အစောဆုံး အချိန် ဖြစ်သည် — download က
score ကို ကြည့်နေသည့် အချိန်နှင့် ထပ်နေသည်။

- `state.previewOn` မဖွင့်ထားလျှင် သို့မဟုတ် playback လုပ်နေလျှင် မလုပ်။
- `window.NotationSoundFont` မရှိလျှင် မလုပ် — ထို failure ကို `state.soundTried`
  အဖြစ် မှတ်လျှင် နောက် Play ကိုပါ ပိတ်ဆို့သွားမည်။
- load မအောင်မြင်လျှင် ရေးခြင်းကို မတားဆီး (non-blocking၊ error ကို မျိုသည်)။

### ၂။ `ensureSound` က တစ်ခုတည်းသော promise ကို မျှဝေ

မူလ ကုဒ်တွင် `async` function ဖြစ်သဖြင့် `state.soundLoading` ကို သတ်မှတ်သည့်
အချိန်သည် ပထမ `await` ပြီးမှ ဖြစ်သည်။ ထို ကွက်လပ်တွင် ခေါ်သူ နောက်တစ်ခုက
`state.soundTried` ကို မြင်ပြီး **"Playback is unavailable in this preview."** ဖြင့်
ပစ်ချသည်။ လက်တွေ့တွင် font မရောက်သေးစဉ် ဒုတိယ note ရေးတိုင်း ဤသို့ ဖြစ်သည်။

ယခု load တစ်ခုလုံးကို promise တစ်ခုအဖြစ် ပထမ `await` မတိုင်မီ သတ်မှတ်သည်။
ထို့ကြောင့် လမ်းတွင် ရောက်လာသူ တိုင်း ထို promise ကို ဆက်ခံသည်။

### ၃။ Audition က `ready` ကို စောင့်

`previewPitch` က `await sound.ready` ပြီးမှ `preview()` ကို ခေါ်သည်။ ထို့ကြောင့်
font မပြည့်သေးချိန် ရေးသော note သည် ပျောက်မသွား၊ bank ရောက်သည်နှင့် အသံထွက်သည်။

### ၄။ စောင့်နေသော audition များ စုပုံမနေစေရန်

`wantedPreview` ကာ တစ်ခုတည်း ရှိသည်။ Note ရေးတိုင်း နံပါတ် တစ်ခု တိုးသည်၊
`ready` ပြီးချိန် နောက်ဆုံး နံပါတ်နှင့် မကိုက်လျှင် မသံထွက်။ သို့မဟုတ်လျှင်
font မရောက်သေးစဉ် ရိုက်ထားသော note များ အားလုံး တစ်ချိန်တည်း chord အဖြစ်
ဆူညံသွားမည်။

### ၅။ Manifest ဖတ်ခြင်းကို ရှေ့ရွှေ့

`soundFontsLoading = loadSoundFonts()` ကို `restoreHandoff()` မတိုင်မီ စတင်သည်။
warm-up က ထို manifest ကို စောင့်သည်၊ ထို့ကြောင့် asset id နှင့် path များ
ရောက်ပြီးသား ဖြစ်သည်။

## မပြောင်းလဲသော အရာ

- Notation Engine ၏ `src/soundfont/browser.ts` — မထိပါ။ `ready` သည် interface ၏
  တစ်စိတ်တစ်ပိုင်း ဖြစ်ပြီးသား (`readonly ready: Promise<void>`)။
- `state.soundAssetId`၊ `state.soundAssetPaths`၊ `syncSoundTracks()`၊ `play()` ၏
  အပြုအမူ — အတူတူ။

## စမ်းသပ်ချက်

`editor-integration.test.js` တွင် နှစ်ခု ထည့်သည် —

1. **Score ဖွင့်သည်နှင့် font စသည်** — `create` ကို တစ်ခါသာ ခေါ်ကြောင်း၊ ပထမ note
   က ထို load ကို ပြန်သုံးကြောင်း၊ ထို note အသံထွက်ကြောင်း။
2. **Font မရောက်သေးချိန် ရေးသော note** — bank မရောက်သေးလျှင် အသံ မထွက်၊
   ရောက်သည်နှင့် **နောက်ဆုံး note တစ်ခုသာ** အသံထွက်၊ ထို့နောက် note များ ချက်ချင်း
   အသံထွက်။

Drum ၏ routing ကို ရှိပြီးသား «a fresh drum kit previews on the percussion channel»
test က ဆက်စစ်သည်။

## ရလဒ်

- `Website/Notation/Notation Engine`: **1560/1560 pass** (အသစ် ၂ ခု အပါ)။
- `npm run typecheck`၊ `npm run lint`၊ `npm run docs:check` — pass။
- `npm run build` က `notation-editor.js` ၏ `?v=` cache key ကို အသစ်ပြောင်းပြီး
  `website-bundle.test.js` pass။
