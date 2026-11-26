# Guitar — Notation ပြန်မြင်ရအောင် ပြင်ဆင်ခြင်း (2026-11-18)

## တောင်းဆိုချက်

"video ထဲမှာ Notation က မမြင်ရတော့ဘူးဖြစ်နေတယ်" — Guitar video output တွင် notation band ကို ပြန်မြင်ရအောင် ပြင်ရန်။

## အမြစ်ရှာချက်

Guitar စာမျက်နှာသည် instrument band ကို ကိုယ်တိုင် pin လုပ်သည် (`studio-guitar.js`၊ `settings.shares = { instrument: ... }`)။ ထို share ကို `Math.min(1, contentHeight / free)` ဖြင့် တွက်သည် — ဆိုလိုသည်မှာ ဂစ်တာပုံ၏ ink အမြင့် frame ၏ လွတ်နေရာထက် ကြီးလျှင် share သည် **1** ဖြစ်သွားသည်။

`resolveShares` တွင် pin ကို အလုံးစုံ ယူသည်။ ထို့ကြောင့် share = 1 ဖြစ်သောအခါ notation နှင့် title band များအတွက် ကျန်နေရာ **0** ဖြစ်သည်။ `drawNotationPart` သည် အမြင့် 0 သော rect ကို ရသဖြင့် ဘာမှ မဆွဲတော့ပါ။

တိုင်းတာမှု (default ပုံ `acoustic-drawn`၊ 16:9 — စာမျက်နှာ၏ default နှစ်ခုလုံး) —

| ပုံ | Aspect | stageHeight | contentHeight | free | share | notation rect |
|---|---|---|---|---|---|---|
| acoustic-drawn | 16:9 | 1039 | 1039 | 1036 | 1 | y 1058, **height 0** |
| classical-drawn | 16:9 | 1052 | 1052 | 1036 | 1 | height 0 |
| strat-drawn | 16:9 | 836 | 836 | 1036 | 0.807 | height 200 |
| electric-drawn | 16:9 | 936 | 936 | 1036 | 0.903 | height 100 |

ပုံကျယ်သော (acoustic, classical) နှစ်ခုတွင် notation လုံးဝ မပေါ်ပါ။ ပုံကျဉ်းသော နှစ်ခုတွင်လည်း band သည် 100–200 px သာ ကျန်သည်။ 9:16/1:1 တွင်မူ share သည် 0.25–0.31 ဖြစ်သဖြင့် notation ပေါ်နေခဲ့သည် — ထို့ကြောင့် ပြဿနာသည် **16:9 တွင်သာ** ပေါ်ခဲ့သည်။

`stageHeightFor` သည် ပုံ၏ အချိုးအစားအလိုက် အမြင့်ကို ပြန်ပေးသည်; ပုံကျယ်လေ stage မြင့်လေ ဖြစ်သည်။ ထို stage အမြင့်ကို `settings.height` နှင့် တိုက်ရိုက် နှိုင်းယှဉ်သည် — band အားလုံး၏ စုစုပေါင်းနှင့် မဟုတ်ပါ။ ထို့ကြောင့် ပုံကျယ်သော ဂစ်တာသည် band တစ်ခုတည်းအတွက် frame တစ်ခုလုံး ယူသွားသည်။

## ပြင်ဆင်ချက်

`Website/Website/studio-guitar.js` — pin ကို layout က သတ်မှတ်ထားသော instrument share ထက် **မကျော်ရ** ကန့်သတ်သည်။ Pin သည် band ကို ကျဉ်းစေနိုင်သည်၊ ကျယ်စေနိုင်သည် မဟုတ်ပါ။

```js
const declaredInstrument = probe.rects.instrument.height / Math.max(1, free);
settings.shares = {
  instrument: Math.min(declaredInstrument, contentHeight / Math.max(1, free)),
};
```

ရလဒ် —

| ပုံ | Aspect | notation rect အမြင့် |
|---|---|---|
| acoustic/classical/electric/strat | 16:9 | 601 px |
| (ပုံအားလုံး) | 1:1 | 580 px |
| (ပုံအားလုံး) | 9:16 | 1295–1414 px |

16:9 တွင် ယခင် 100–200 px (သို့) 0 px ရှိခဲ့သည်မှ 601 px ဖြစ်လာသည်။ 1:1 ၏ တန်ဖိုးများ မပြောင်းပါ (ယခင် 455–574)။ 9:16 တွင်လည်း ပုံအလိုက် အနည်းငယ် ပြောင်းသည်; notation သည် ဆက်လက် ပေါ်နေသည်။

## စမ်းသပ်မှု

`Website/Video/Video Engine/source/tools/test-guitar-studio-browser.mjs` တွင် 16:9 regression check ထည့်သည် —

1. `prepareNotationFor` ကို wrap လုပ်၍ notation rect ကို ဖမ်းသည်။
2. default ပုံ (`acoustic-drawn`) + 16:9 ဖြင့် render လုပ်သည်။
3. rect အမြင့် > 200 px ဖြစ်ကြောင်း စစ်သည်။
4. ထို frame ကို ffmpeg ဖြင့် ဆွဲထုတ်ပြီး notation rect အတွင်း pixel > 500 ရှိကြောင်း စစ်သည်။

ပြင်ဆင်ချက် မပါဘဲ ဤစမ်းသပ်မှုသည် ကျရှုံးကြောင်း အတည်ပြုပြီး —

```
AssertionError: The landscape frame gave the notation band no room:
{"x":22,"y":1058,"width":1876,"height":0}
```

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-guitar-studio-browser.mjs` (ပြင်ဆင်ချက်ဖြင့်) | PASS |
| `test-guitar-studio-browser.mjs` (ပြင်ဆင်ချက် မပါဘဲ) | FAIL — အထက်ပါ band အမြင့် 0 |
| `test-bass-studio-browser.mjs` | PASS |
| `website/tests/*.test.mjs` (unit) | 21/21 PASS |
| Default render (acoustic-drawn, 16:9) လက်ဖြင့် စစ် | Notation ပေါ်၊ staff line နှင့် tab နံပါတ်များ မြင်ရ |

## ကျန်ရှိ / သတိပြုရန်

- Bass စာမျက်နှာတွင်လည်း တူညီသော pin ပုံစံ ရှိသည် (`studio-bass.js`)။ ယခု တိုင်းတာမှုတွင် bass ၏ share သည် 0.182–0.678 ဖြစ်သဖြင့် notation band သည် 334–1534 px ကျန်နေသည် — ပြဿနာ မပေါ်ပါ။ သို့သော် တူညီသော ကန့်သတ်ချက်ကို bass တွင် မထည့်ရသေးပါ (ဤတောင်းဆိုချင်း၏ ပြင်ပ)။
- 16:9 တွင် notation band 601 px ဖြစ်လာသဖြင့် ဂစ်တာ band သည် 435 px သာ ကျန်သည် — ပုံကျယ်သော ဂစ်တာများ အနည်းငယ် ချုံ့ခံရမည်။ Plan §၁၃ ၏ band အချိုးများကို မပြောင်းပါ။
- Workers Builds (msharing0008) deploy-side fail ကို ဤ pass တွင် မထိပါ။
- **Push** — `8659af1` ကို `feat/guitar-video-adapter` သို့ push ပြီး (`5968133..8659af1`)။ `main` (`5968133`) ကို မထိပါ။
