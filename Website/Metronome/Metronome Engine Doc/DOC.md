# Metronome Engine — Code နှင့် ချိတ်ဆက်မှုမှတ်တမ်း

**နောက်ဆုံးစစ်ဆေးသည့်နေ့:** 2026-11-14
**Repository:** `idetsminmh1995-spec/msharing0008`
**Plan:** [Metronome Engine Plan](../Metronome%20Engine%20Plan/PLAN.md)
**ဆက်စပ်မှတ်တမ်း:** [Video Engine Doc](../../Video/Video%20Engine%20Doc/README.md)

## အကျဉ်းချုပ်

Metronome Engine သည် ပေးထားသော beat/frame state တစ်ခုမှ SVG frame တစ်ခုကို ထုတ်ပေးသည့် TypeScript renderer ဖြစ်သည်။ Design 11 မျိုးနှင့် Landscape `16x9`, Portrait `9x16`, Square `1x1` layout များ ပါဝင်သည်။ Engine ကို Create Video ရှိ Metronome card မှ Studio သို့ ချိတ်ဆက်ထားပြီး Studio adapter က SVG frame များကို Video Engine ဖြင့် video အဖြစ် render လုပ်သည်။ ထွက်လာသော video တွင် beat click audio ပါသည်။

ဤ integration သည် Drum workflow ကို ပြောင်းလဲခြင်းမဟုတ်ပါ။ Metronome သည် သီးခြား `studio-metronome.js` adapter ကို သုံးပြီး Studio ထဲတွင် Drum pads မပေါ်ပါ။ Guitar, Piano, Bass, Strings နှင့် Voice တို့ကို Metronome adapter သို့ ချိတ်ဆက်ထားခြင်း မရှိပါ။

## File တည်နေရာနှင့် အခြေအနေ

| File/Folder | လုပ်ဆောင်ချက်နှင့် အခြေအနေ |
|---|---|
| `Website/Metronome/Metronome Engine/src/index.ts` | `renderMetronomeFrame()`, `listDesigns()` နှင့် public bundle exports. |
| `Website/Metronome/Metronome Engine/src/layout.ts` | 11 design များအတွက် aspect/layout, header, logo box, BPM နှင့် meter readout. |
| `Website/Metronome/Metronome Engine/src/theme.ts` | Design တစ်ခုချင်းစီ၏ palette. |
| `Website/Metronome/Metronome Engine/src/logos.ts` | Design ID အလိုက် logo အမည် metadata; အမှန်တကယ် image URL ကို caller က ပေးရသည်။ |
| `Website/Metronome/Metronome Engine/dist/metronome-engine.js` | `window.MetronomeDesigns` အဖြစ်သုံးသည့် generated IIFE. |
| `Website/Metronome/Metronome Engine/tools/sync-metronome-engine.mjs` | `dist` bundle ကို static website asset သို့ ကူးခြင်းနှင့် `--check` ဖြင့် နှိုင်းယှဉ်ခြင်း. |
| `Website/Website/assets/metronome-engine.js` | Production/static site မှ load လုပ်သည့် built copy; source bundle နှင့် တူညီသည်။ |
| `Website/Website/studio.html` | Metronome settings form၊ preview element နှင့် engine scripts အစီအစဉ်. |
| `Website/Website/studio-metronome.js` | Metronome controls, frame timing, click audio, Video Engine request, cancel/preview/download. |
| `Website/Website/studio-video.js` | Drum adapter; Metronome query အတွက် အစောပိုင်း return လုပ်ပြီး Drum behavior ကို ထိန်းထားသည်။ |
| `Website/Website/styles.css` | Metronome form နှင့် preview အတွက် responsive/dark-light styling. |
| `Website/Video/Video Engine/source/tools/test-metronome-studio-browser.mjs` | Chromium end-to-end test: Studio route, UI, export, audio နှင့် ffprobe. |

## အသုံးပြုသူ flow နှင့် script အစီအစဉ်

1. `Website/Website/index.html` ထဲရှိ ရှိပြီးသား Metronome card ကိုနှိပ်ပါက `script.js` က `studio.html?tool=metronome` သို့ သွားသည်။
2. Studio page က `assets/video-engine.js`, `assets/metronome-engine.js`, `script.js`, `studio-video.js`, `studio-metronome.js` ကို အစဉ်လိုက် load လုပ်သည်။ Engine bundle ၏ global သည် `window.MetronomeDesigns` ဖြစ်သည်။
3. Metronome adapter သည် Metronome mode တစ်ခုတည်းတွင် စတင်ပြီး shared Drum settings form ကို ဖျောက်ကာ Metronome settings ကို ပြသည်။
4. `listDesigns()` ဖြင့် design 11 မျိုးကို picker ထဲထည့်ပြီး ရွေးထားသော design/aspect အတွက် အဖွင့် beat SVG ကို preview ပြသည်။
5. Render ကိုစတင်သည့်အခါ beat state ကို video time မှ တိုက်ရိုက်တွက်ပြီး frame တစ်ခုချင်းစီတွင် `renderMetronomeFrame()` ကိုခေါ်သည်။ Wall-clock time သို့မဟုတ် ယခင် frame state ကို မသုံးပါ။
6. `VideoEngine.render()` က canvas frame များကို MP4/WebM အဖြစ် encode လုပ်သည်။ Browser/device က ပံ့ပိုးသည့် format သည် ကွာနိုင်သည်။ Export ပြီးလျှင် video preview, play/seek controls နှင့် download link ကို အသုံးပြုနိုင်သည်။

## Tempo, meter နှင့် ကြာချိန်

UI တွင် BPM ကို **quarter-note BPM** အဖြစ် သတ်မှတ်ထားသည်။ Beat unit ကို denominator `d` (2, 4, 8, 16) ဟုယူလျှင် beat တစ်ခုကြာချိန်မှာ:

`beatSeconds = 60 × 4 ÷ (BPM × d)`

စုစုပေါင်း beat အရေအတွက်မှာ `bars × beatsPerBar` ဖြစ်ပြီး စုစုပေါင်းအချိန်မှာ `beatSeconds × bars × beatsPerBar` ဖြစ်သည်။ Adapter သည် frame time မှ `beat`, `bar`, `phase` ကို တွက်၍ downbeat ကို bar တစ်ခုစီတွင် ပြန်စတင်သည်။ အရှည်ကို **12 sec အများဆုံး** သတ်မှတ်ထားပြီး ကျော်လွန်လျှင် render မလုပ်ဘဲ form status တွင် အကြောင်းပြသည်။

Video canvas အရွယ်အစားများမှာ Landscape `1280×720`, Portrait `720×1280`, Square `720×720`; frame rate `30 FPS` ဖြစ်သည်။ SVG Engine သည် မိမိ၏ aspect-specific viewBox ကို ထိန်းထားပြီး Video Engine canvas ထဲသို့ အချိုးမှန်ဆွဲသည်။

## Click audio

Metronome Engine ကိုယ်တိုင် audio သို့မဟုတ် clock မထုတ်ပေးပါ။ Studio adapter သည် `OfflineAudioContext` ဖြင့် mono `AudioBuffer` ထုတ်လုပ်သည်။ Bar တစ်ခုစီ၏ ပထမ beat သည် accent frequency/level ပိုမြင့်ပြီး ကျန် beats များသည် ပုံမှန် tick ဖြစ်သည်။ `AudioBuffer` ကို video segment နှင့်အတူ Video Engine သို့ ပေးသည်။

ဤသည် Metronome export အတွက်သာ local sine-tone click track ဖြစ်သည်။ `Website/Notation/Sound Egnine` folder ထဲတွင် Sound Engine source မရှိသေးသောကြောင့် ဤ code ကို shared Sound Engine သို့မဟုတ် တခြား instrument များ၏ audio provider ဟု မယူဆရ။ Browser တွင် `OfflineAudioContext` မရှိပါက adapter က error ပြပြီး silent video အောင်မြင်သကဲ့သို့ မပြပါ။

## Build နှင့် asset synchronization

Metronome Engine folder ထဲမှ:

- `npm run sync:website` — bundle ကို build လုပ်ပြီး `Website/Website/assets/metronome-engine.js` သို့ copy လုပ်သည်။
- `npm run check:website` — `dist` နှင့် website asset ကို အတိအကျနှိုင်းယှဉ်သည်။
- `npm run verify` — typecheck, lint, format check, build, Node tests နှင့် website bundle sync check ကို လုပ်သည်။

Package တွင် lockfile မရှိသေးသဖြင့် clean install အတွက် `npm ci` ကို အတည်မပြုရသေးပါ။ စမ်းသပ်ရာတွင် `npm install --no-package-lock --no-audit --no-fund` ကို အသုံးပြုသည်။

## အတည်ပြုထားသော စမ်းသပ်မှုများ

- Metronome Engine `npm run verify`: typecheck/lint/format/build အောင်မြင်; Node test **20/20 pass**; website bundle sync check pass.
- Video Engine muxer Node tests **15/15 pass**.
- Video Engine cleanup/safety Node tests **5/5 pass**.
- Chromium Video Engine smoke test: `ffprobe` က MP4/H.264, 320×180, 30 frames, 1.0 sec ကို ဖတ်နိုင်သည်။
- Drum Studio browser regression: default-pattern workflow က MP4/H.264 1920×1080 landscape export နှင့် 1080×1920 portrait export ထုတ်နိုင်ပြီး Drum export ၏ silent behavior မပြောင်းပါ။
- Metronome Studio browser integration: Create Video ရှိ Metronome card ကိုနှိပ်ပြီး Studio route သို့ရောက်ကြောင်း စစ်သည်။ 12 စက္ကန့်ကျော်သော setting ကို export မစမီ ပိတ်ကြောင်းလည်း အတည်ပြုထားသည်။ `sweep-dial`, 9:16, quarter-note 96 BPM, 3/8, 1 bar ကို render လုပ်ပြီး **28 frames, 0.933 sec**, 720×1280 VP8 video နှင့် 48 kHz mono Opus audio ထွက်သည်။ `ffprobe` က video/audio stream နှစ်ခုလုံးကို ဖတ်နိုင်သည်။
- Metronome controls နှင့် Studio layout: 375×812 phone viewport တွင် 1-column, 1280×900 desktop viewport တွင် 2-column ဖြစ်ပြီး horizontal overflow မရှိ။ Metronome route တွင် shared Drum settings form ကို ဖျောက်ထားကြောင်း စစ်ဆေးထားသည်။
- Video Engine source/production sync နှင့် Metronome Engine source/production sync နှစ်ခုစလုံး pass.

## လက်ကျန်ကန့်သတ်ချက်များ

- Engine runtime frame input တွင် `NaN`/`Infinity` edge-case validation နှင့် SVG `logoUrl` attribute escaping ကို ပိုမိုစမ်းသပ်/ပြင်ဆင်ရန် ကျန်သည်။
- Adapter သည် လက်ရှိ `logoUrl` မပေးသဖြင့် exported Metronome video တွင် brand/instrument logo မပါပါ။
- Browser test သည် Chromium/headless environment ပေါ်တွင်သာ အတည်ပြုထားသည်။ Safari/Firefox နှင့် ဖုန်းအစစ် compatibility မစစ်ရသေးပါ။ 375px/1280px viewport test သည် actual device test မဟုတ်ပါ။
- 11×3 design/aspect SVG outputs ကို engine unit tests ဖြင့်စစ်သော်လည်း browser visual snapshot/clipping test သည် design အားလုံးအတွက် မရှိသေးပါ။
- Default click tone ကို user က ပြောင်းနိုင်ခြင်း၊ volume/accent options နှင့် အခြား instrument adapter များကို မထည့်ရသေးပါ။
- Guitar, Piano, Bass, Strings, Voice တို့သည် Studio Video Engine နဲ့ မချိတ်ဆက်ရသေးပါ။ အသေးစိတ်ကို [Video Engine Doc](../../Video/Video%20Engine%20Doc/README.md) နှင့် [Plan](../../Video/Video%20Engine%20Plan/PLAN.md) တွင်ကြည့်ပါ။


## Engine source behavior, API နှင့် design catalog

`renderMetronomeFrame(input)` သည် **အချိန်တစ်ခဏအတွက် SVG string တစ်ခု** ကို ပြန်ပေးသည်။ Engine ကိုယ်တိုင် clock မစတင်၊ audio မထုတ်၊ DOM animation မလုပ်ပါ။ Video adapter က အချိန်တစ်ခုချင်းအတွက် `frame` state ကိုပေးပြီး Engine ကို ထပ်ခေါ်ရသည်။ Design တစ်ခုချင်းစီသည် `beat`/`phase` မှ frame geometry ကိုပြန်တွက်သဖြင့် prior frame များတွင် သိမ်းထားသည့် animation state ကို မလိုအပ်ပါ။

| Browser API | လုပ်ဆောင်ချက် |
|---|---|
| `window.MetronomeDesigns.renderMetronomeFrame(input)` | Background, optional title/header, design body နှင့် BPM/meter readout ပါသော complete SVG string တစ်ခု ထုတ်သည်။ |
| `window.MetronomeDesigns.listDesigns()` | Picker အတွက် id/name/look/palette/light-mode/logo-name metadata ကို အစဉ်လိုက်ပြန်ပေးသည်။ |
| `DESIGNS`, `DEFAULT_DESIGN_ID`, `designById()` | Registry အစီအစဉ်၊ `pendulum` default နှင့် design တစ်ခု lookup လုပ်ရန် helper များ။ |
| `canvasFor()`, `bands()`, `logoBox()`, `tempoStats()` | Aspect/canvas, header-stage partition, logo box နှင့် shared tempo/meter layout helpers။ |
| `AspectRatio`, `Canvas`, `Design`, `DesignContext`, `MetronomeFrame`, `MetronomeRenderInput` | Engine source ထဲရှိ TypeScript contracts။ Browser bundle သည် IIFE ဖြစ်ပြီး global name `MetronomeDesigns` ဖြစ်သည်။ |

Render input တွင် `design`, `aspect` (`16x9`, `9x16`, `1x1`), `frame.beat`, `frame.beatsPerBar`, `frame.phase`, `frame.bar`, `frame.bpm`, `frame.timeSignature` နှင့် optional `title`, `subtitle`, `logoUrl` ပါဝင်သည်။ `phase` သည် beat စသည့်အချိန်တွင် 0၊ နောက် beat မတိုင်မီ 1 ဖြစ်သည့် progress ဖြစ်သည်။ မသိသော design သည် ပထမ design `pendulum` သို့ fallback လုပ်ပြီး runtime တွင် မသိသော aspect သည် `16x9` သို့ fallback လုပ်သည်။ `phase` finite မဟုတ်ပါက 0 သို့ပြောင်းကာ၊ အခြားအချိန်တွင် 0–1 အတွင်းကန့်သတ်သည်။ အခြား numeric field များအတွက် `NaN`/`Infinity` validation မပြည့်စုံသေးကြောင်း Plan backlog တွင် မှတ်တမ်းတင်ထားသည်။

SVG ၏ native design artboard အရွယ်အစားမှာ `16x9` = 1920×1080, `9x16` = 1080×1920, `1x1` = 1080×1080 ဖြစ်သည်။ Website video adapter က 30 FPS ဖြင့် သက်ဆိုင်ရာ 1280×720, 720×1280, 720×720 canvas ထဲသို့ aspect ratio မပျက်စေဘဲ ဆွဲသည်။ SVG shared layout သည် header, stage band, logo region နှင့် BPM/meter readout ကို ခွဲထားပြီး design-specific body ကို stage အတွင်းတွင် ထည့်သည်။

| ID | Design | Look | Frame အတွင်း အဓိကပုံဖော်ချက် |
|---|---|---|---|
| `pendulum` | Pendulum | Black / neon red | Metronome case, scale, pendulum နှင့် beat number; ကိုယ်ပိုင် header layout. |
| `beat-dots` | Beat Dots | Black / red | Medallion count, beat တစ်ခုစီ၏ dot နှင့် beat ပြီးနောက် pulse ring. |
| `pulse-ring` | Pulse Ring | Night blue | Beat တစ်ခုစီတွင် ကျယ်လာပြီး ပျောက်သွားသည့် ring များ၊ အလယ်တွင် count. |
| `bar-meter` | Bar Meter | Paper / ink | Bar တစ်ခုအတွင်း past/current/future beat များကို block ဖြင့်ခွဲပြ; portrait တွင် အလျားလိုက်တန်း. |
| `sweep-dial` | Sweep Dial | Charcoal / amber | Bar တစ်ခုလုံးအတွင်း လှည့်သွားသည့် hand/progress arc နှင့် beat tick များ. |
| `big-number` | Big Number | White / red | လက်ရှိ beat ကို ကြီးမားသောနံပါတ်ဖြင့်ပြ; အခြား beat များကို rail ပေါ်ပြ. |
| `segment-ring` | Segment Ring | Deep green | Bar ကို beat wedge များခွဲပြီး current/played/future အရောင်ကွဲစေသည်။ |
| `travel-line` | Travel Line | Off-white / ink blue | Marker သည် beat များကြားရွေ့; aspect အလိုက် horizontal/vertical/rounded loop. |
| `flash-frame` | Flash Frame | Black / hot red | Beat တစ်ချက်စီတွင် frame glow; downbeat တွင် ပိုပြင်းသော wash. |
| `bounce-ball` | Bounce Ball | Cream / orange | Beat pad များကြားတွင် ball ကို ကွေးသည့်လမ်းကြောင်းဖြင့် ခုန်စေသည်။ |
| `stack-blocks` | Stack Blocks | Slate / violet | Beat position ကို block ဖြင့်ပြပြီး နောက် beat များကို outline လုပ်သည်။ |

`src/logos.ts` သည် design ID အလိုက် `drum`, `piano`, `guitar`, `bass`, `violin`, `cello`, `vocal` သို့မဟုတ် `sharing` ကဲ့သို့ logo-name metadata ပေးသည်; အမှန်တကယ် URL/path ကို host က map လုပ်ရသည်။ Adapter က လက်ရှိ `logoUrl` မပေးသဖြင့် Metronome export တွင် logo မပါ။ Engine text အတွက် `escapeText()` ရှိသော်လည်း SVG `logoUrl` attribute အတွက် escaping test မလုံလောက်သေးကြောင်း backlog တွင်ထားသည်။

## Package metadata နှင့် clean-install အခြေအနေ

`package.json` တွင် `private: true`, `main: dist/metronome-engine.js`, `types: dist/index.d.ts` ဖြစ်သည်။ Browser bundle သည် `npm run build` ဖြင့် IIFE ထုတ်လုပ်ပြီး `npm run declarations` သည် `.d.ts` ကို သီးခြားထုတ်သည်; `build`/`verify` သည် declaration step ကို အလိုအလျောက်မလုပ်ပါ။ Repo တွင် package lockfile မရှိသဖြင့် `npm ci` မစမ်းနိုင်ပါ။ ယခု verification ကို `npm install --no-package-lock --no-audit --no-fund` နောက်တွင် လုပ်ထားသည်။ Private browser bundle သာ ရည်ရွယ်ထားပါက `main`/`types` metadata နှင့် supported Node/npm version ကို နောက်ပိုင်း ဆုံးဖြတ်ရန်ရှိသည်။
