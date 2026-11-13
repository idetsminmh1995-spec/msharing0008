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


## Current Studio settings UI update

The shared left-side Studio control panel now supports MusicXML selection, logo selection, Title 1/Title 2, Drum selection, Notation View, Sound Model, Count Voice text, Video Color, Video Ratio, and Generate Video. The same markup and responsive CSS are intended to be reused by all instrument studio routes.

Implemented behavior:

- `16:9`, `1:1`, and `9:16` selections change the VideoEngine output dimensions.
- Title fields, selected color, notation mode, count label, and an optional logo are drawn into generated frames.
- Drum selection limits which capture pad is active.
- Generate Video re-renders the captured drum event log using the current settings.
- Phone layout collapses the settings fields into a single-column form while preserving the same controls.

Known limitations: MusicXML is currently accepted as a selected file but is not parsed into events; Sound Model options do not yet synthesize audio; Count Voice is currently a visual metadata label; and the current production adapter remains Drum-only and visual-only. These items stay pending under the shared adapter/audio phases in the Video Engine Plan.

Verification for this update: Studio JavaScript syntax and control-marker checks passed; Video Engine source-to-production sync check passed; existing Video Engine automated tests passed (20/20); Wrangler nested deployment dry-run passed. The public Worker still serves the previous deployment until a commit is pushed and Cloudflare deploy is run.


## Revised Studio control panel

The Kick/Snare/Hi-hat capture boxes were removed from the left panel. The page now generates from an optional MusicXML source or a deterministic default drum pattern. MusicXML and Logo are presented in one desktop row. A custom logo replaces the default `Website/Website/assets/logo/m-sharing-drum-logo.svg`; without a custom file, the M Sharing Drum Logo remains selected automatically.

Title 1 and Title 2 each have independent color and font-size controls. Drum settings are split into Brand text and Model selection. Notation View offers Page Landscape, Page Portrait, and Page Square. Sound Model offers multiple model choices plus volume. Count Voice has Off/On, two count styles, and volume. Video Color is restricted to Black or White, while Video Ratio remains 16:9, 1:1, and 9:16.

The browser integration test was updated to click Generate Video without drum pads. MusicXML parsing currently covers plain XML/MusicXML drum notes; `.mxl` archives and actual sound/count audio remain pending. Existing VideoEngine output is still silent visual video.


## Latest control and preview clarification

The redundant default-logo text label was removed. The default logo is now communicated by the visible logo preview only. Drum Brand is a select control. Sound Model and Sound Volume are stacked in the same field, and Count Voice controls retain their On/Off, type, and volume arrangement.

The standard 16:9 export is now `1920×1080`; square and portrait exports are `1080×1080` and `1080×1920`. The video preview stage uses its own fixed 16:9 frame and does not resize based on the loaded video's intrinsic dimensions. Browser regression passed for the 1920×1080 landscape output and the portrait output.
