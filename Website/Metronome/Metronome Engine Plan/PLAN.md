# Metronome Engine — အကောင်အထည်ဖော်မှု Plan

**နောက်ဆုံးစစ်ဆေး/ပြင်ဆင်သည့်နေ့:** 2026-11-14
**Engine source:** `Website/Metronome/Metronome Engine/`
**Studio adapter:** `Website/Website/studio-metronome.js`
**ဆက်စပ်မှတ်တမ်း:** [Metronome Engine Doc](../Metronome%20Engine%20Doc/DOC.md)
**ဆက်စပ် Video Engine roadmap:** [Video Engine Plan](../../Video/Video%20Engine%20Plan/PLAN.md)

## ရည်ရွယ်ချက်

Metronome Engine ၏ SVG design များကို Create Video မှ Studio သို့ အမှန်တကယ်ချိတ်ဆက်ပြီး၊ အသုံးပြုသူရွေးချယ်သည့် tempo၊ meter၊ အရှည်နှင့် aspect ratio အလိုက် Video Engine ဖြင့် အချိန်နှင့်တပြေးညီ animated video ထုတ်ပေးရန်။ Metronome Engine ကို frame ဆွဲပေးသည့် သီးခြား renderer အဖြစ်ထားပြီး clock၊ audio click နှင့် video encoding ကို Studio adapter/Video Engine တို့က တာဝန်ယူသည်။

## လက်ရှိအခြေအနေ — ပထမ Metronome integration ပြီးစီး

- Metronome source-of-truth က `dist/metronome-engine.js` IIFE ကို build လုပ်သည်။ `tools/sync-metronome-engine.mjs` သည် ၎င်းကို `Website/Website/assets/metronome-engine.js` သို့ ကူးပြီး `--check` ဖြင့် တူညီမှုစစ်သည်။ `npm run sync:website`, `npm run check:website` နှင့် `npm run verify` တွင် asset check ပါဝင်သည်။
- Create Video ထဲရှိ ရှိပြီးသား Metronome card သည် `studio.html?tool=metronome` သို့ သွားသည်။ Studio adapter သည် Drum branch နှင့် သီးခြားဖြစ်ပြီး Metronome route တွင် Drum pads မပေါ်စေပါ။
- Studio တွင် Engine ၏ 11 design၊ Landscape 16:9 / Portrait 9:16 / Square 1:1၊ quarter-note BPM၊ bar count၊ beats-per-bar နှင့် beat unit ကို ရွေးနိုင်သည်။ စုစုပေါင်းအရှည်ကို 12 စက္ကန့်အထိ ကန့်သတ်ထားသည်။
- Bar ထဲရှိ beat index နှင့် phase ကို frame အချိန်မှ deterministic တွက်ချက်ပြီး Engine မှ SVG frame ပြန်ထုတ်သည်။ Video Engine က frame များကို video အဖြစ် render လုပ်သည်။ `OfflineAudioContext` ဖြင့် downbeat ကို accent လုပ်ထားသည့် click track ကို `AudioBuffer` အဖြစ် ပြုလုပ်ပြီး video နှင့်အတူ ထည့်သည်။ ဤ click track သည် adapter အတွင်းရှိ သီးခြား sine tone ဖြစ်ပြီး repo ထဲတွင် မရှိသေးသော Shared Sound Engine ကို အစားထိုးတည်ဆောက်ထားခြင်း မဟုတ်ပါ။
- ထွက်လာသည့် video ကို Studio ထဲတွင် preview/play/seek လုပ်နိုင်ပြီး download၊ progress၊ cancel နှင့် error state များ ပါဝင်သည်။ Browser က ပံ့ပိုးသည့် codec ပေါ်မူတည်၍ MP4 သို့မဟုတ် WebM ထွက်နိုင်သည်။
- 375px phone နှင့် 1280px desktop viewport များတွင် layout overflow မရှိကြောင်း Chromium test ဖြင့် အတည်ပြုထားသည်။

## အတည်ပြုထားသော စမ်းသပ်မှုများ

- Metronome Engine `npm run verify`: typecheck, lint, formatting, bundle build နှင့် **20/20 test pass**; website asset sync check pass.
- Video Engine regression: MP4 muxer **15/15**, cleanup/safety **5/5**, browser MP4 smoke test နှင့် Drum Studio browser export pass.
- Metronome Studio browser integration: `sweep-dial`, Portrait 9:16, quarter-note 96 BPM, 3/8, 1 bar ကို export လုပ်ရာ **28 frames / 0.933 sec**, 720×1280 VP8 video နှင့် 48 kHz mono Opus click track ကို `ffprobe` က အတည်ပြုသည်။ Phone 375px နှင့် desktop 1280px viewport check လည်း pass.

## လုပ်ဆောင်ထားသည့် code files

| File | တာဝန်/အခြေအနေ |
|---|---|
| `Website/Metronome/Metronome Engine/src/` | Engine ၏ TypeScript source; 11 SVG design နှင့် aspect layouts — ရှိပြီးသား၊ ပြန်သုံးထားသည်။ |
| `Website/Metronome/Metronome Engine/dist/metronome-engine.js` | Browser IIFE bundle; build flow နှင့်ကိုက်ညီအောင် source map comment မပါသည့် bundle ပြန်တည်ဆောက်ထားသည်။ |
| `Website/Metronome/Metronome Engine/tools/sync-metronome-engine.mjs` | Production asset ကူး/စစ်သည့် dependency-free script — အသစ်ထည့်ထားသည်။ |
| `Website/Website/assets/metronome-engine.js` | Website မှ load လုပ်သည့် generated bundle — ထည့်ထားပြီး source နှင့် sync ဖြစ်သည်။ |
| `Website/Website/studio-metronome.js` | Design picker, tempo/meter/timing, click audio, SVG→canvas draw နှင့် export lifecycle — အသစ်ထည့်ထားသည်။ |
| `Website/Website/studio.html`, `studio-video.js`, `styles.css` | Controls, script loading, Drum route isolation နှင့် responsive UI — ပြင်ထားသည်။ |
| `Website/Video/Video Engine/source/tools/test-metronome-studio-browser.mjs` | Chromium end-to-end export, viewport နှင့် `ffprobe` စစ်ဆေးမှု — အသစ်ထည့်ထားသည်။ |

## နောက်ထပ်လုပ်ရန်

1. **Input/edge-case test:** Chromium test သည် Create Video card က Metronome Studio သို့သွားခြင်းနှင့် 12 စက္ကန့်ကျော် setting ကို ပိတ်ခြင်းကို စစ်ထားသည်။ လက်ကျန်အနေဖြင့် cancel behavior, `OfflineAudioContext` မရသည့် error state နှင့် runtime input တွင် `NaN`/`Infinity` သို့မဟုတ် phase/design မမှန်သည့်အခါကို ထပ်စစ်ပြီး လိုအပ်သော data မပြည့်လျှင် render မစကြောင်း အတည်ပြုရန်။
2. **Logo policy:** လက်ရှိ adapter သည် `logoUrl` မပေးသဖြင့် logo မပါသော output ထုတ်သည်။ တကယ့် brand/instrument logo ကို ထည့်လိုပါက production asset path, preload, failure fallback နှင့် design 11 ခုလုံး၏ safe area ကို သီးခြားသတ်မှတ်ရန်။
3. **Browser/device coverage:** Chromium တွင် export ကို စမ်းထားသည်။ Safari/Firefox နှင့် ဖုန်းအစစ်များတွင် WebCodecs/MediaRecorder codec fallback၊ audio output နှင့် performance ကို စစ်ဆေးရန်။ 375px/1280px viewport check သည် ဖုန်းအစစ် compatibility ကို အတည်မပြုပါ။
4. **Visual regression:** Engine tests က 11×3 design/aspect combinations ကို SVG အဖြစ်စစ်သည်။ သို့သော် browser ပေါ်က visual snapshot/clipping၊ font fallback နှင့် preview/export frame တူညီမှုကို ထပ်မံစစ်ရန်။
5. **အခြား instrument များ:** Guitar ကို နောက်ဦးစားပေးအဖြစ်ထားပြီး Studio event source နှင့် renderer ကို သီးခြားအကောင်အထည်ဖော်ရန်; Piano, Bass, Strings နှင့် Voice တို့သည် Metronome adapter နှင့် မချိတ်ဆက်ရသေးပါ။ အလုပ်အစီအစဉ်ကို [Video Engine Plan](../../Video/Video%20Engine%20Plan/PLAN.md) တွင် ဆက်လက်လိုက်နာပါ။

## ပြီးစီးမှုအဓိပ္ပာယ်

ဤ milestone သည် Metronome video export ကို website ထဲတွင် တကယ်ချိတ်ဆက်ပြီး browser တွင်စမ်းသပ်ပြီးကြောင်း ဆိုလိုသည်။ အခြား instrument များ၊ R2 media assets၊ Shared Sound Engine၊ actual phone device compatibility နှင့် production deployment တို့ ပြီးစီးပြီဟု မဆိုလိုပါ။


## Engine-level backlog carried forward from the 2026-11-13 review

ဤလုပ်ငန်းများသည် Studio/Video Engine ချိတ်ဆက်ပြီးကြောင်းနှင့် သီးခြားဖြစ်သည်။ Integration ပြီးသွားခြင်းကြောင့် Engine source validation၊ package delivery နှင့် design visual test များ ပြီးစီးသွားသည်ဟု မယူဆရ။

### P0 — Runtime frame input contract

`src/index.ts` ၏ `normalizeFrame()` သည် `phase` ကို finite မဟုတ်ပါက `0` သို့ထားပြီး `[0, 1]` အတွင်း clamp လုပ်သည်။ `beat`, `beatsPerBar`, `bar`, `bpm`, numerator, denominator တို့အတွက် `NaN`/`Infinity` ကို field တစ်ခုချင်း အတိအလင်း validation မလုပ်သေးပါ။ Engine unit test များတွင် zero, negative bar, `NaN phase` တို့ပါဝင်သော်လည်း numeric edge case အားလုံး မပါသေးပါ။

- Frame field တစ်ခုစီ၏ ခွင့်ပြုတန်ဖိုး၊ integer/decimal rule နှင့် invalid input အတွက် clamp, fallback သို့မဟုတ် reject မည်ကို API contract တွင် ဆုံးဖြတ်ရန်။
- `NaN`, `Infinity`, `-Infinity`, fractional, အလွန်မြင့်သည့် BPM/beat count နှင့် invalid nested time signature များအတွက် tests ထည့်ရန်။
- Output သည် finite SVG geometry အဖြစ် အမြဲထွက်ရမည်လား၊ invalid input တွင် error ပေးမည်လား ရွေးချယ်ပြီး docs/tests တစ်ပြေးညီလုပ်ရန်။

**ပြီးစီးမှု:** Invalid frame value တစ်ခုချင်း၏ behavior သတ်မှတ်ပြီး test ဖြင့်အတည်ပြုရန်; valid input output မပြောင်းရ။

### P1 — Package output နှင့် clean install

Website bundle-only IIFE အသုံးပြုမှုပုံစံကို README တွင် `window.MetronomeDesigns` အဖြစ် ပြင်ဆင်ထားပြီးဖြစ်သည်။ သို့သော် `package.json` သည် `private: true`, `main: dist/metronome-engine.js`, `types: dist/index.d.ts` ဟုဆိုထားသည်။ `npm run declarations` သည် declaration ထုတ်နိုင်သော်လည်း `build`/`verify` ထဲတွင် မပါသေးပါ။ Repository တွင် lockfile မရှိသဖြင့် `npm ci` ကို အတည်ပြု၍မရပါ။

- Engine ကို browser IIFE သီးသန့်ထားမည်လား၊ package/API အဖြစ်လည်း ထုတ်မည်လား ဆုံးဖြတ်ရန်။ Package အဖြစ်မထုတ်ပါက `main`/`types` metadata ကို ရည်ရွယ်ထားသည့်အသုံးပြုမှုပုံစံနှင့် ညှိရန်။
- Package ကို TypeScript import အဖြစ်ထောက်ပံ့မည်ဆိုလျှင် declaration generation ကို build/release flow ထဲထည့်ပြီး `types` target ရှိကြောင်း clean build ဖြင့်စစ်ရန်။
- Reproducible install လိုအပ်ပါက package manager lockfile နှင့် Node/npm version ကို သတ်မှတ်ပြီး clean environment တွင် install/verify လုပ်ရန်။ လက်ရှိစစ်ဆေးမှုသည် `npm install --no-package-lock --no-audit --no-fund` ဖြင့် ဖြစ်သည်။

### P1 — Logo asset mapping

Engine မှ `listDesigns()` ထဲတွင် `drum`, `piano`, `guitar`, `bass`, `violin`, `cello`, `vocal` သို့မဟုတ် `sharing` စသည့် logo name များ ပြန်ပေးနိုင်သည်။ Engine သည် အဆိုပါအမည်ကို image URL သို့ မပြောင်းပါ။ Metronome adapter သည် လက်ရှိ `logoUrl` မပေးသောကြောင့် export တွင် logo မပါပါ။

- Product က logo ထည့်လိုကြောင်း အတည်ပြုပြီးမှ production asset path mapping, preload, optional/missing logo fallback နှင့် design တစ်ခုချင်း safe area ကို သတ်မှတ်ရန်။

### P2 — SVG/XML escaping နှင့် output validity

`src/svg.ts` သည် text content ကို XML escape လုပ်သည်။ သို့သော် logo URL ကို SVG attribute ထဲသို့ ထည့်သည့် helper သည် quote escaping အပြည့်အဝ မလုပ်ကြောင်း ယခင် code review တွင် တွေ့ထားသည်။

- `logoUrl` အပါအဝင် attribute string အားလုံးကို သီးခြား safe escaping helper သို့မဟုတ် serializer ဖြင့် ထုတ်ရန်။
- `&`, `<`, `>`, single/double quote ပါသော title, subtitle, URL များအတွက် regression test ထည့်ပြီး SVG parser သို့မဟုတ် browser က valid အဖြစ်ဖတ်ကြောင်း အတည်ပြုရန်။

### P2 — Browser visual regression

Engine `npm run verify` သည် design 11 မျိုးနှင့် aspect 3 မျိုး (layout 33 မျိုး) ကို SVG output အဖြစ်စစ်သည်။ Chromium Studio test သည် `sweep-dial` portrait export ကို အတည်ပြုထားသော်လည်း design 11 မျိုးလုံး၏ browser raster output, text clipping, element overlap, font fallback နှင့် safe margin များကို အပြည့်အဝ မစစ်နိုင်သေးပါ။

- Layout 33 မျိုးအတွက် browser render သို့မဟုတ် snapshot test ပြုလုပ်ပြီး header/readout/stage/logo boundaries, text clipping နှင့် font fallback ကို စစ်ရန်။
- Beat transition, `phase=0`, အလယ်အဆင့် phase နှင့် `phase→1` boundary များတွင် design-specific regression ထည့်ရန်။
- Travel Line ၏ endpoint tick နှင့် square loop, Bounce Ball ၏ တစ် beat ပါသော bar, Stack Blocks ၏ per-frame reconstruction နှင့် “persistent accumulation” ဟူသောဖော်ပြချက်ကို code နှင့်ညီမညီ စစ်ရန်။

### P2 — Supported meter/range

Studio UI သည် BPM 30–240, bars 1–16, numerator 1–12, denominator 2/4/8/16, စုစုပေါင်း 12 sec အထိ ကန့်သတ်ထားသည်။ ဤသည် Studio adapter ၏ range ဖြစ်ပြီး Engine public API ၏ universal maximum beat count သို့မဟုတ် practical readability guarantee ကို အစားမထိုးပါ။

- Product လိုအပ်ချက်အရ Engine အဆင့် supported `beatsPerBar`, BPM နှင့် time-signature range ကို သတ်မှတ်ရန်။
- Range ၏ အောက်/အပေါ် boundary, 1-beat bar, irregular meter နှင့် အလွန်များသော beat count တွင် design တစ်ခုချင်း ဖတ်ရလွယ်ကူကြောင်းစစ်ရန်။
- Range ကျော်သည့် input ကို clamp/reject/diagnostic မည်သို့လုပ်မည်ကို P0 input contract နှင့် တစ်ပြေးညီထားရန်။

### ဆက်လုပ်မည့်အစီအစဉ်

1. P0 frame validation contract ကို သတ်မှတ်ပြီး tests ဖြည့်ရန်။
2. P1 package output/install behavior နှင့် optional logo policy ကို ဆုံးဖြတ်ရန်; Website bundle sync နှင့် Studio route smoke test ကို ပြီးစီးထားသည်။
3. P2 XML escaping, browser visual regression, design boundary နှင့် Engine numeric range များကို အဆင့်လိုက်ဖြည့်ရန်။
4. Source သို့မဟုတ် adapter ပြင်ဆင်ပြီးတိုင်း Metronome `npm run verify`, Video Engine regression, bundle sync နှင့် browser smoke test များကို ပြန်လည်လုပ်ဆောင်ပြီး ဤ Plan/Doc တွင် ရလဒ်တင်ရန်။
