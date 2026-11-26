# Video ပုံစံ တစ်သားတည်း၊ Notation Band နှင့် Ratio ဖိုဒါ စစ်ဆေးမှု (2026-11-18)

## ရည်ရွယ်ချက်

Main Plan §၁၃.၃ (က) — Video တစ်ခုလုံး တစ်သားတည်း ပုံစံ (အပိုင်းကြား ဘောင်/အရောင်ကွဲ မရှိ)၊ §၁၃.၃ (ဂ) — ratio တစ်ခုချင်းစီအတွက် R2 ၏ ကိုယ်ပိုင် folder ကိုသာ သုံးရမည်၊ နှင့် §၁၃.၂/V21 — Notation ကို ဘောင်အတွင်း မပြတ်ဘဲ ပြရမည်။ ဤအလုပ်သည် Plan ၏ **V14၊ V17၊ V21** နှင့် **B19၊ B23** တို့၏ code အပိုင်းဖြစ်သည်။

## ပြောင်းလဲခဲ့သည့် files

| File | ပြောင်းလဲမှု |
|---|---|
| `Website/Video/Video Engine/source/website/assets/video-engine.js` | Theme ၏ `notationBackground` ကို frame နောက်ခံနှင့် တူညီအောင် ချိန်သည် (`#f7f9fc` / `#080d16`)။ `measureInk` သည် row profile (`rows`) ပြန်ပေးသည်။ `prepareNotation` သည် `systemBands`၊ `inkAbove`၊ `inkBelow` ကို တွက်သည်။ `systemWindow` ထည့်သည်။ `drawNotationPart` သည် ကိုယ်ပိုင် rect ထဲ clip လုပ်သည်။ `seekThankYou` သည် frame တကယ်ရေးပြီးမှ resolve လုပ်သည်။ |
| `Website/Website/assets/video-engine.js` | `tools/sync-video-engine.mjs` မှ copy (source နှင့် တူညီကြောင်း `--check` pass)။ |
| `Website/Video/Video Engine/source/tools/test-studio-video-browser.mjs` | `assertKitRequestsInRatio` (ratio ဖိုဒါ စစ်)၊ CDP `Network.setCacheDisabled`၊ sync တိုင်းတာမှုကို lag ရှာခြင်းဖြင့် အစားထိုး၊ join frame စစ်ကို pixel နှိုင်းယှဉ်ခြင်းဖြင့် အစားထိုး၊ `sync` folder ကို ကြိုဖန်တီး။ |
| `Website/Video/Video Engine/source/tools/test-notation-view-browser.mjs` | Reading line ကို cursor ၏ centroid အစား top/bottom edge ဖြင့် တိုင်းသည်။ |
| `AGENTS.md` | Permission မှတ်တမ်းနှင့် V21 တိုင်းတာမှု ရလဒ်။ |

## Implementation detail

- **§၁၃.၃ (ဂ) ratio ဖိုဒါ** — Test သည် browser က တကယ် တောင်းခံသော address များကို CDP `Network.requestWillBeSent` မှ ဖတ်သည်။ Export တစ်ခုချင်းစီ (16:9 / 1:1 / 9:16) အတွက် `…/drums/{Brand}/{Model}/{16x9|1x1|9x16}/…` သာ ပါဝင်ကြောင်း စစ်သည်။ Preview ၏ image cache က request ကို ဖျောက်ထားသဖြင့် `Network.setCacheDisabled({cacheDisabled: true})` ဖွင့်ထားသည်။
- **§၁၃.၃ (က) တစ်သားတည်း** — Notation သည် frame ၏ နောက်ခံနှင့် တူသော စာရွက်ကို ရေးသဖြင့် Notation band နှင့် ဘေးဘက် band များကြား အရောင်ကွဲ panel မရှိတော့ပါ။ Join စစ်သည် Count-in → Score → Thank You ဆက်မှုကို pixel နှိုင်းယှဉ်ဖြင့် တိုင်းသည်။
- **V21 (က) တစ်စနစ်သာ ရှိသော score** — `systemYs[1]` မရှိလျှင် ယခင် တွက်နည်းသည် `NaN` ဖြစ်၍ `inkAbove`/`inkBelow` သုညဖြစ်ကာ ဘောင်အမြင့် သုည ဖြစ်ပြီး notation လုံးဝ မပေါ်ခဲ့သည်။ ယခု `gapAbove` ကို တစ်စနစ်တည်းတွင် `systemYs[0]` ဟု သတ်မှတ်သည်။
- **V21 (ခ) အနည်းဆုံး ဘောင်အမြင့်** — တိုင်းလို့မရလျှင် sheet ၏ ink bbox မှ တွက်သည်; ထိုမှလည်း မရလျှင် staff space ၄ ခု (staff တစ်ခုနှင့် ၎င်း၏ mark များ လိုအပ်သည့် အနည်းဆုံး) ကို အောက်ခြေသတ်မှတ်သည်။
- **Thank You ၏ ပထမ frame များ အနက်ရောင်** — `seeked` သည် element ရွေ့ပြီးကြောင်းသာ ပြောသည်၊ decoder က frame ထုတ်ပြီးကြောင်း မပြောပါ။ ယခု `requestVideoFrameCallback` (မရလျှင် `requestAnimationFrame`) ဖြင့် frame တကယ်ရေးပြီးမှ ဆက်သည်။ ကာလကို ၂၅၀ ms ဖြင့် ကန့်သတ်ထားသဖြင့် frame မထုတ်သော clip က export ကို ရပ်မထားပါ။
- **Sync တိုင်းတာမှု** — ယခင် စစ်သည် ပထမ ၂ စက္ကန့်အတွင်း stroke နှစ်ချက် ရှိသည်ဟု ယူဆသည်; သို့သော် drum video သည် count-in ဖြင့် စသဖြင့် ထို window တွင် stroke မရှိပါ။ ယခု ဖိုင်တစ်ခုလုံးကို ဖတ်၍ ရုပ်ပုံ၏ ပြောင်းလဲ pixel အရေအတွက်နှင့် အသံ၏ frame တစ်ခုချင်း peak ကို နှိုင်းယှဉ်ကာ lag ကို −၂ မှ +၂ frame အတွင်း ရှာသည်။ ရလဒ် lag ၀ (≤ ၄၀ ms စံနှုန်းအတွင်း)။
- **Join စစ်** — ယခင် စစ်သည် mean brightness > 8 ကို ကြည့်သည်; Thank You clip သည် အနက်ရောင်ဖြစ်၍ mean ၂–၃ ဖြစ်ကာ "အနက်ရောင် frame" ဟု မှားစွပ်စွဲခဲ့သည်။ ယခု join frame တစ်ခုချင်းစီကို အပိုင်းနှစ်ခု၏ အတွင်းပိုင်း frame များနှင့် pixel ချင်း နှိုင်းယှဉ်သည်; မည်သည့်အပိုင်းနှင့်မှ မတူလျှင်သာ ကျရှုံးသည်။

## စမ်းသပ်မှု ရလဒ်

| Test | ရလဒ် |
|---|---|
| `test-studio-video-browser.mjs` (Drum) | PASS — notation ink ပေါ်၊ ratio ဖိုဒါ ၃ မျိုးလုံး မှန်၊ sync lag ၀၊ join ဆက် |
| `test-notation-view-browser.mjs` | PASS — Page at 16:9, 1:1, 9:16, and Horizontal |
| `test-video-engine-browser.mjs` | PASS |
| `test-notation-clip-browser.mjs` | PASS |
| `test-drum-reference-browser.mjs` | PASS |
| `test-video-engine.mjs` (muxer) | PASS (15/15) |
| `website/tests/*.test.mjs` | 21/21 PASS |
| `test-piano-studio-browser.mjs` | PASS |
| `test-guitar-studio-browser.mjs` | PASS |
| `test-bass-studio-browser.mjs` | PASS |
| `test-violin-studio-browser.mjs` | PASS |
| `test-voice-studio-browser.mjs` | PASS |
| `test-metronome-studio-browser.mjs` | PASS |
| `test-studio-dispatch-browser.mjs` | PASS |
| `test-audio-contract-browser.mjs` | PASS |
| `sync-video-engine.mjs --check` | in sync |

## ကျန်ရှိ / သတိပြုရန်

- Plan ၏ ကျန် WP များ (V15 manifest၊ V19 Count Voice အပြည့်အဝ၊ V20 Thank You အလုံးစုံ) ကို ဤ pass တွင် မထိပါ။
- Browser test များသည် headless Chromium ပေါ်တွင်သာ စစ်ထားသည်; ဖုန်းအစစ်၊ Safari/Firefox ကို မစစ်ရသေးပါ။
- ယခင် pass များတွင် push ငြင်းပယ်ခံခဲ့ရသည် (`403 denied to idetsminmh1995-spec`); ဤ pass ၏ commit သည်လည်း ထိုအခြေအနေကို ကြုံလျှင် local တွင်သာ ကျန်မည်။
