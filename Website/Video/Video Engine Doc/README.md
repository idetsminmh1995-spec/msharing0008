# Video Engine — Implementation Status and Instrument Readiness

Repo: `idetsminmh1995-spec/msharing0008`
Plan review baseline: `main` / `0547011`
Authoritative Video Engine source: `Website/Video/Video Engine/source/website/assets/video-engine.js`
Production copy: `Website/Website/assets/video-engine.js`

## လက်ရှိ Video Engine အခြေအနေ

Video Engine သည် canvas frame များကို WebCodecs ဖြင့် MP4/WebM အဖြစ် render/mux လုပ်ခြင်း၊ MediaRecorder fallback, optional `AudioBuffer`, progress/cancel, memory guard နှင့် cleanup code များကို ပံ့ပိုးသည်။ Drum Studio နှင့် ပထမ integration သည် Kick/Snare/Hi-hat event များကို visual-only clip အဖြစ် render လုပ်ပြီး preview/play/seek/download လုပ်နိုင်သည်။ လက်ရှိ output တွင် အသံမပါပါ။ Studio client သည် `drums` သာ enable လုပ်ပြီး အခြား instrument များကို adapter မရှိသေးသည့်အတွက် ပိတ်ထားသည်။

## အခြား instrument များ၏ code readiness

| Instrument | Repo ထဲတွင် တွေ့ရသော code | ချိတ်ဆက်ရန်အတွက် အဓိကလိုအပ်ချက် |
|---|---|---|
| **Guitar** | `Website/Guitar/Guitar Engine` တွင် TypeScript source, tests, built bundle, `positionsAt()`, `stageShapes()` နှင့် SVG renderer ရှိသည်။ Note data သည် string/fret/finger/time ကို သီးသန့်လိုအပ်သည်။ | Studio event producer မရှိ၊ built bundle ကို `Website/Website/assets` မှ load လုပ်ထားခြင်းမတွေ့၊ StageShape-to-Canvas painter နှင့် measured image asset preload/failure flow ကို ပြီးစီးစေရန်လိုသည်။ Guitar Engine သည် audio မထုတ်ပေးပါ။ |
| **Piano** | `Piano Hand Human Engine` တွင် keyboard geometry, key press/contact curve, performance/finger planning နှင့် synthetic IK source/tests ရှိသည်။ | Piano note event input, renderer, Studio adapter, audio source မရှိသေး။ `Piano 3D Hand Engine` folder သည် `.gitkeep` သာရှိသည်။ Wrist-motion planning မပြီးသေး၊ IK ကို website GLB နှင့် calibrate မလုပ်ရသေး။ ပထမ key-only visual adapter ကိုရည်မှန်းရန်။ |
| **Bass** | Landing page card နှင့် Notation Engine ထဲရှိ bass-clef/MIDI metadata ရှိသည်။ Guitar Engine ထဲတွင် Jazz Bass ပုံ configuration ရှိသည်။ | Bass-specific playable UI, event/audio producer သို့မဟုတ် Video adapter မတွေ့ရ။ Fretted Bass လား keyboard/synth Bass လား ဆုံးဖြတ်ပြီးမှ Guitar Engine ပြန်သုံးနိုင်မှု, input, renderer နှင့် audio policy ကို သတ်မှတ်ရန်။ |
| **Strings** | Landing page card နှင့် Notation Engine ထဲရှိ strings tuning/fretted-instrument metadata ရှိသည်။ | Playable Strings engine/UI/event source/renderer/audio မတွေ့ရ။ Orchestral string family လား fretted-string instrument လား သတ်မှတ်ရန်။ Notation metadata ကို playable renderer ဟု မယူဆရ။ |
| **Voice** | Landing page card နှင့် generic Studio route ရှိသည်။ | Voice-specific source/capture/import controls, renderer, audio decode workflow မတွေ့ရ။ Microphone/file input, permission/privacy/error handling, visual design နှင့် segment-aligned `AudioBuffer` ကို ဆုံးဖြတ်ရန်။ |

### Shared dependency မှတ်ချက်များ

- `Website/Notation/Sound Egnine` သည် `.gitkeep` သာရှိသည်။ Shared audio synthesis/provider ကို လက်ရှိ implementation အဖြစ် မယူဆရ။
- Guitar/Piano package bundle output path များတွင် lowercase `website/assets` ကို အသုံးပြုထားသည့်နေရာရှိသည်။ Repo ၏ production directory သည် case-sensitive `Website/Website/assets` ဖြစ်သောကြောင့် copy/load/check path ကို အရင်ရှင်းလင်းရမည်။
- `AudioBuffer` မပေးလျှင် VideoEngine က visual-only silent video ထုတ်နိုင်သည်။ အသံလိုအပ်သည့် instrument တစ်ခုချင်းစီသည် sound source နှင့် audio/video timing ကို သီးခြားပေးရမည်။

## အကြံပြုထားသော အစီအစဉ်

အသေးစိတ် milestone, shared adapter contract, acceptance criteria နှင့် test sequence ကို [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md) တွင် ထည့်ထားသည်။ အဓိကဦးစားပေးအစီအစဉ်မှာ:

1. Shared adapter dispatch/event-time contract သတ်မှတ်ပြီး unsupported tool များကို Drum branch သို့ fall-through မဖြစ်စေရန်။
2. Guitar ကို ပထမချိတ်ဆက်ရန် — ရှိပြီးသား visual engine ကိုသုံးသော်လည်း Studio event source, bundle path, Canvas painter နှင့် photo assets ကို အရင်ဖြည့်ရန်။
3. Piano ကို key-only silent visual adapter အဖြစ်စတင်ရန် — note source နှင့် bundle destination ကို အတည်ပြုပြီး human-hand animation ကို နောက်ပိုင်း သီးခြားလုပ်ရန်။
4. Bass နှင့် Strings အတွက် playable code မရှိသေးသဖြင့် product/instrument definition နှင့် event model ကို အရင်တည်ဆောက်ရန်။
5. Voice ကို source/capture/import နှင့် permission/privacy ဆုံးဖြတ်ချက်ပြီးမှ စတင်ရန်။
6. Audible export ကို အရေးကြီးသည့် requirement အဖြစ် အတည်ပြုပြီးမှ Sound Engine/audio provider, `AudioBuffer`, timing နှင့် codec fallback ကို အကောင်အထည်ဖော်ရန်။

## စမ်းသပ်မှုနှင့် အပြောင်းအလဲမှတ်တမ်း

- ယခင် code commit `d31337a` တွင် MP4 muxer tests 15 ခု၊ cleanup/safety tests 5 ခု၊ Chromium engine smoke test နှင့် Drum Studio browser integration/ffprobe test အောင်မြင်ထားသည်။ Production asset sync check နှင့် 375px/1280px viewport assertions လည်း pass ဖြစ်ထားသည်။
- ဤ Plan/Doc ပြန်လည်ရေးဆွဲမှုတွင် instrument source code မပြင်ထားသဖြင့် code tests ကို ထပ်မ run ထားပါ။ Guitar/Piano/Bass/Strings/Voice ကို Video Engine ဖြင့် render လုပ်ပြီးကြောင်း မဆိုပါ။
- နောက် code implementation တစ်ခုစီပြီးပါက သက်ဆိုင်ရာ engine tests, shared Drum regression, real browser export, silent/audio behavior နှင့် phone/web layout ကို ပြန်စစ်ပြီး Doc/Plan ကို update လုပ်ရမည်။
