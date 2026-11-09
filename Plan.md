# msharing0008 လက်ရှိ Master Plan Index

## လက်ရှိ အတည်ပြုထားသော အလုပ်မှတ်တမ်း

Repository တစ်ခုလုံးအတွက် Notation Engine၊ Drum Video export stability၊ Guitar/Bass/Piano/Violin propagation၊ asset gate၊ render report၊ browser evidence၊ CI နှင့် Definition of Done အားလုံးကို စုစည်းထားသော authoritative delivery plan သည် [`Doc/CONSOLIDATED-PLAN-2026-11-10.md`](./Doc/CONSOLIDATED-PLAN-2026-11-10.md) ဖြစ်သည်။ Code ထဲတွင် ရှိသော်လည်း ယခင် plan များတွင် မပါသေးသော အလုပ်များကို အဲဒီစာတမ်း၏ Sections 2–8 တွင် မှတ်တမ်းတင်ထားသည်။

## Plan ခွဲခြားဖတ်ရန်

- **Repository delivery / export rollout:** [`Doc/CONSOLIDATED-PLAN-2026-11-10.md`](./Doc/CONSOLIDATED-PLAN-2026-11-10.md)
- **Drum နှင့် instrument video acceptance:** [`Doc/rollout/README.md`](./Doc/rollout/README.md)
- **Notation Engine architecture and roadmap:** [`notation-engine/PLAN.md`](./notation-engine/PLAN.md)
- **Notation Engine actual build status:** [`notation-engine/Doc/STATUS.md`](./notation-engine/Doc/STATUS.md)
- **Piano Hand / GLB contact work:** ဤဖိုင်၏ အောက်ပါ piano-specific plan

---

# Piano Video လက်ချောင်း–ခလုတ် တိကျမှု စီမံချက်

## ရည်မှန်းချက်

Piano Video ရဲ့ **Hands** mode မှာ Piano Hand Engine က သတ်မှတ်ပေးတဲ့ ဘယ်/ညာလက်နဲ့ လက်ချောင်း ၁ မှ ၅ တို့က သတ်မှတ်ထားတဲ့ MIDI ခလုတ်ကို တိတိကျကျထိ၊ မှန်ကန်တဲ့ note-on အချိန်မှာဖိပြီး note-off ပြီးနောက် သဘာဝကျကျလွှတ်နိုင်ရပါမယ်။ လက်မော်ဒယ်အဖြစ် 12.3 MB `website/assets/hand/hand_model.glb` ကို ဆက်သုံးပါမယ်။ Preview နဲ့ export နှစ်ခုလုံးမှာ အချိန်တစ်ခုချင်းစီအတွက် တူညီတဲ့ လက်နဲ့ခလုတ်အခြေအနေကို အသုံးပြုရပါမယ်။

## 2026-11-10 — မပြင်မီ အတည်ပြုထားသော update plan

အောက်ပါအချက်များကို အရင် plan ထဲတွင် မှတ်တမ်းတင်ပြီးမှ code ပြင်မည်။ ပထမအကြိမ်တွင် data contract၊ finger assignment ချိတ်ဆက်မှုနှင့် deterministic sampling အခြေခံကို အရင်တည်ဆောက်မည်။ GLB ၏ တကယ့် bone axis/landmark တိုင်းတာမှု မပြီးမချင်း မြင်ရသော fingertip contact ကို အတည်ပြုပြီးပြီဟု မမှတ်သားရ။

### ပြင်မည့်အချက်များ

1. `PerformanceNote → hand decision → finger assignment → key strike point` ကို တစ်ခုတည်းသော serialisable `PianoPerformancePlan` အဖြစ် ချိတ်ဆက်မည်။ Finger source ကို `override`, `stated`, `automatic` ဟူ၍ ခွဲပြီး confidence နှင့် diagnostics ထည့်မည်။
2. Hands renderer သည် MIDI pitch ဖြင့် finger ပြန်ရှာခြင်း မလုပ်ဘဲ stable note ID နှင့်သာ assignment ချိတ်မည်။ ထပ်တူ pitch note များတွင် finger မှားချိတ်နိုင်သော fallback ကို ဖယ်ရှားမည်။
3. Motion state အတွက် `REST → PREPARE → TRAVEL → ALIGN → PRESS → HOLD → RELEASE → SHIFT/CROSS` phases နှင့် timestamp-based sampling contract သတ်မှတ်မည်။ Preview နှင့် export က sampler တစ်ခုတည်းကို သုံးနိုင်အောင် ပြင်ဆင်မည်။
4. Chord ကို wrist target များ၏ ပျမ်းမျှတန်ဖိုးဖြင့် မဖြေရှင်းဘဲ assigned fingertip targets အားလုံး၊ wrist position/rotation နှင့် diagnostics ကို တစ်ပြိုင်နက်ဖြေရှင်းနိုင်သော coupled-IK interface ပြင်ဆင်မည်။
5. GLB calibration အတွက် wrist/palm anchor, bone length, fingertip landmark, joint axis, scale/rotation/translation နှင့် joint limits ပါသော versioned calibration manifest ပုံစံ သတ်မှတ်မည်။
6. Single note, chord, scale/thumb-under, repeated note, octave, crossing, left/right hand နှင့် preview/export parity အတွက် automated acceptance tests ထည့်မည်။
7. Velocity, articulation, pedal နှင့် dynamics ကို motion/render stage သို့ သယ်ဆောင်နိုင်ရန် data model ချဲ့မည်။ Contact time ကို note-on အတိုင်း မပြောင်းဘဲ preparation height, press speed နှင့် release behavior ကိုသာ ပြောင်းမည်။

### အဆင့်လိုက် အကောင်အထည်ဖော်မည့်အစီအစဉ်

- **A — Data contract:** solved performance plan, stable note-ID mapping, provenance, diagnostics.
- **B — Calibration:** GLB bind-pose measurement နှင့် Engine millimetre space transform.
- **C — Contact:** calibrated single-finger target နှင့် residual/collision report.
- **D — Coupled hand motion:** chord IK, wrist rotation, palm motion, hand-position trajectory.
- **E — Technique:** scales, thumb-under, crossings, arpeggios, repeated notes, octaves.
- **F — Humanisation:** coarticulation, velocity/dynamics, minimum-jerk motion, controlled anticipation.
- **G — Acceptance:** browser contact tests, seek/repeated frame tests, preview/export parity, golden clips.

### လက်ခံစံနှုန်း

- Note တစ်ခုချင်းစီတွင် stable ID, hand, finger, source, confidence နှင့် key target ပါရမည်။
- Finger assignment သည် repeated MIDI pitch ကြောင့် မမှားရ။
- တူညီသော `timestampMs` အတွက် preview နှင့် export က တူညီသော hand/key state ထုတ်ရမည်။
- Chord တစ်ခုတွင် assigned finger အားလုံးအတွက် residual နှင့် failure reason ကို ဖော်ပြရမည်။
- GLB calibration မပြီးမချင်း synthetic IK residual ကို visible GLB contact accuracy ဟု မဆိုရ။
- Reachable synthetic target များအတွက် residual ≤ 2 mm၊ joint limit မချိုးရ။

## 2026-11-10 — Phase A ပြင်ဆင်ပြီးမှု မှတ်တမ်း

### ပြင်ပြီးသောအချက်များ

- `piano-hand-engine/src/core/performancePlan.ts` ကို ထည့်ပြီး `PerformanceNote → hand split → fingering → key position` ကို `PianoPerformancePlan` တစ်ခုတည်းအဖြစ် ထုတ်ပေးနိုင်အောင် ပြင်ထားသည်။
- `SolvedPerformanceNote` data model တွင် `handReason`, `handConfidence`, `fingerSource`, `fingerConfidence`, `keyPosition` နှင့် `diagnostics` ထည့်ထားသည်။
- Piano page ၏ `getPianoHandPerformance()` သည် သီးခြား split/fingering result ကို ပြန်တည်ဆောက်မည့်အစား `solvePerformancePlan()` ကို အသုံးပြုကာ event များထဲသို့ finger provenance နှင့် diagnostics သယ်ပေးသည်။
- 3D renderer သည် repeated MIDI pitch များကို မှားယွင်းချိတ်နိုင်သည့် `fingerByMidi` fallback ကို ဖယ်ပြီး stable note ID ဖြင့်သာ finger assignment ချိတ်သည်။
- Phase A အတွက် `performancePlan.test.js` ထည့်ထားပြီး stated finger, manual override, automatic finger confidence နှင့် out-of-range diagnostic ကို စမ်းသပ်ထားသည်။

### စမ်းသပ်မှုရလဒ်

- `piano-hand-engine`: **77/77 tests passed**
- TypeScript typecheck: passed
- ESLint: passed
- Prettier format check: passed
- Browser bundle build: passed
- `website/assets/piano-hand-3d.js` syntax check: passed
- `git diff --check`: passed

### မပြီးသေးသောအချက်များ

- GLB bind-pose calibration manifest နှင့် actual bone-axis measurement မပြီးသေးပါ။
- Chord wrist target ကို average မယူဘဲ coupled wrist/finger IK ဖြင့် ဖြေရှင်းခြင်း မပြီးသေးပါ။
- Wrist rotation, palm trajectory, prepare/travel/align/press/hold/release sampler မပြီးသေးပါ။
- Collision/clearance validation၊ browser-level fingertip contact test နှင့် preview/export parity test မပြီးသေးပါ။
- Velocity/dynamics, coarticulation, thumb-under, crossings, arpeggios နှင့် octave-specific motion မပြီးသေးပါ။

Phase A သည် data contract နှင့် stable event identity ကိုသာ production path ထဲ ချိတ်ထားခြင်းဖြစ်ပြီး GLB fingertip contact တိကျမှုကို အတည်ပြုပြီးပြီဟု မဆိုလိုပါ။

## 2026-11-10 — Phase B မပြင်မီ အတည်ပြုထားသော motion-plan update

Phase A ရဲ့ note-level hand/finger mapping အပေါ်မှာ ဆက်လက်တည်ဆောက်ရန် အောက်ပါ motion contract ကို အရင်ထည့်ပြီးမှ code ပြင်မည်။ ဒီအဆင့်သည် GLB bone calibration သို့မဟုတ် coupled IK ကို ပြီးစီးပြီဟု မဆိုလိုဘဲ၊ နောက်အဆင့်များက အသုံးပြုမည့် deterministic time-based input/output ကိုသာ တည်ဆောက်မည်။

### ပြင်မည့်အချက်များ

1. Hand trajectory ကို `REST`, `PREPARE`, `TRAVEL`, `ALIGN`, `PRESS`, `HOLD`, `RELEASE`, `SHIFT`, `CROSS` phases နှင့် serialisable `PianoMotionPlan` အဖြစ် သတ်မှတ်မည်။
2. လက်တစ်ဖက်စီအတွက် wrist position, wrist rotation, anchor key, technique နှင့် start/end timestamp ကို သိမ်းမည်။
3. Note တစ်ခုချင်းစီအတွက် finger contact schedule တွင် `approachStartMs`, `contactMs`, `holdEndMs`, `releaseEndMs`, fingertip target နှင့် target key ကို သိမ်းမည်။
4. `sampleHandMotion(plan, timestampMs)` pure function ထည့်ပြီး preview/export/seek အားလုံးက timestamp တစ်ခုတည်းမှ တူညီတဲ့ hand state ပြန်ရမည်။ Frame delta သို့မဟုတ် `requestAnimationFrame` timing ကို state source အဖြစ် မသုံးရ။
5. Segment ကြား position/rotation ကို deterministic easing ဖြင့် interpolate လုပ်မည်။ Contact schedule ကို note-on boundary နှင့် release boundary များမှာ ပြတ်သားစွာ စစ်မည်။
6. Motion sampler အတွက် rest, travel, hold, release, seek-backward, repeated timestamp နှင့် left/right independence tests ထည့်မည်။

### Phase B လက်ခံစံနှုန်း

- တူညီသော `timestampMs` နှင့် တူညီသော plan ကို နှစ်ကြိမ် sample လုပ်လျှင် result တူရမည်။
- `contactMs` မတိုင်မီ contact မဖြစ်ရ၊ `releaseEndMs` ပြီးနောက် active contact မရှိရ။
- Segment အစ/အဆုံးတွင် wrist position/rotation မခုန်ရ။
- Left နှင့် right hand trajectory များသည် တစ်ဖက်ကြောင့် တစ်ဖက် state မပြောင်းရ။
- Motion sampler သည် GLB joint axis မတိုင်းညှိရသေးသည့်အတွက် world-space GLB pose ကို မဖန်တီးသေးဘဲ calibrated renderer အတွက် input contract သာ ပြန်ပေးရမည်။

## 2026-11-10 — Phase B ပြင်ဆင်ပြီးမှု မှတ်တမ်း

### ပြင်ပြီးသောအချက်များ

- `piano-hand-engine/src/core/motionPlan.ts` ကို ထည့်ပြီး `PianoMotionPlan`, `HandTrajectorySegment`, `FingerContactPlan`, `SampledHandMotion` data model များ တည်ဆောက်ထားသည်။
- `sampleHandMotion(plan, timestampMs)` pure sampler ထည့်ထားပြီး frame delta မသုံးဘဲ absolute timestamp မှ hand state ကို ပြန်ပေးသည်။
- Wrist position နှင့် rotation ကို segment အတွင်း deterministic smoothstep interpolation ဖြင့် sample လုပ်နိုင်သည်။
- Contact schedule တွင် `APPROACH`, `CONTACT`, `RELEASE` boundaries ကို ခွဲပြီး `releaseEndMs` ပြီးနောက် contact မပြန်ပေးတော့ပါ။
- Left/right hand trajectory ကို သီးခြား sample လုပ်ထားသဖြင့် တစ်ဖက်၏ state က တစ်ဖက်ကို မပြောင်းစေပါ။
- Phase B အတွက် rest state, travel interpolation, repeated timestamp/seek-backward, contact boundary နှင့် left/right independence tests ထည့်ထားသည်။

### စမ်းသပ်မှုရလဒ်

- `piano-hand-engine`: **81/81 tests passed**
- TypeScript typecheck: passed
- ESLint: passed
- Prettier format check: passed
- Browser bundle build: passed
- `website/assets/piano-hand-3d.js` syntax check: passed
- `git diff --check`: passed

### မပြီးသေးသောအချက်များ

- Phase B sampler ကို GLB renderer ရဲ့ live preview/export path ထဲ တစ်ခုတည်းသော source အဖြစ် မချိတ်ရသေးပါ။
- Sampler က wrist trajectory input ကို sample ပေးနိုင်သော်လည်း trajectory ကို score/fingering မှ အလိုအလျောက် generate လုပ်ပေးသော planner မပြီးသေးပါ။
- GLB calibration, fingertip world pose, coupled chord IK, collision/clearance နှင့် technique-specific trajectory မပြီးသေးပါ။

Phase B သည် deterministic motion-plan contract နှင့် sampler ကို ထည့်ထားခြင်းဖြစ်ပြီး GLB လက်ဖျားမှန်ကန်မှု သို့မဟုတ် လူတကယ်တီးသလို motion အားလုံး ပြီးစီးပြီဟု မဆိုလိုပါ။

## စစ်ဆေးတွေ့ရှိချက်

- GLB ထဲမှာ rig ပါတဲ့ hand mesh နဲ့ joint ၂၁ ခုရှိပြီး လက်ချောင်း bone အမည်တွေက renderer ရဲ့ mapping နဲ့ ကိုက်ညီပါတယ်။
- Piano Hand Engine မှာ keyboard geometry၊ note-to-key strike point၊ လက်ခွဲခြားမှု၊ fingering နဲ့ static forward kinematics ရှိပါတယ်။ ဒါပေမဲ့ Engine ရဲ့ `HandRig` နဲ့ GLB ထဲက တကယ့် bone အလျား၊ wrist anchor၊ fingertip landmark နဲ့ joint rotation axis တို့ကို တိုင်းညှိထားတာ မရှိသေးပါ။ ဒါကြောင့် GLB လက်ဖျားက ခလုတ်ကို တကယ်တိကျစွာထိနေပြီလို့ မအတည်ပြုနိုင်သေးပါ။
- Chord တစ်ခုအတွင်း လက်ချောင်းတစ်ချောင်းစီအတွက် တွက်ထားတဲ့ wrist target တွေကို renderer က ပျမ်းမျှယူနေပါတယ်။ Chord ရဲ့ fingertip target အားလုံးကို ပူးတွဲဖြေရှင်းပေးမယ့် IK မရှိသေးပါ။
- `keyPressDepthMm()` မှာ 28 ms attack နဲ့ 70 ms release ရှိပေမဲ့ note အဆုံးရောက်တာနဲ့ renderer က event ကို active list ထဲက ဖယ်လိုက်ပါတယ်။ အဲဒါကြောင့် release curve ကို အပြည့် render မလုပ်နိုင်ပါ။
- Preview မှာ frame အလိုက် wrist lerp လုပ်ပြီး export မှာ target ကို ချက်ချင်းသတ်မှတ်ပါတယ်။ ဒါကြောင့် နှစ်ခုရဲ့ ရွေ့လျားပုံ တူညီမယ်လို့ အာမမခံနိုင်သေးပါ။

## အကောင်အထည်ဖော်မှု

1. Piano Hand Engine ထဲမှာ joint limit မကျော်လွန်စေတဲ့ numerical finger IK ထည့်ပါမယ်။ Wrist pose တစ်ခုအတွက် fingertip target တစ်ခုချင်းစီကို ဖြေရှင်းပြီး အမှားအကွာအဝေးကို mm နဲ့ ပြန်ပေးပါမယ်။
2. Note-off ပြီးနောက် release 70 ms ပြည့်သည်အထိ contact event ကို renderer ထဲမှာ ထိန်းထားပါမယ်။ အဲဒီအချိန်အတွင်း key travel ကို `keyPressDepthMm()` နဲ့ ဆက်တွက်ပြီး အသံထွက်နေတဲ့ note ရဲ့ အရောင်နဲ့ key/finger လွှတ်ခြင်းကို သီးခြားစီထိန်းပါမယ်။
3. Wrist target သတ်မှတ်ပြီးနောက် assigned finger တစ်ချောင်းစီရဲ့ pose ကို Engine IK နဲ့ ဖြေရှင်းပါမယ်။ GLB ပေါ်မှာ လှုပ်ရှားမှုကို မတိုင်းညှိရသေးတဲ့ `spread` joint ကို လက်ရှိ IK မှာ အသုံးမပြုပါ။
4. Chord အတွင်း အမှားရှိလျှင် မဖုံးကွယ်ဘဲ Engine rig ရဲ့ residual နဲ့ အောင်မြင်/မအောင်မြင် အခြေအနေကို diagnostic အဖြစ် ဖော်ပြပါမယ်။
5. Engine browser bundle ကို source ကနေ ပြန်တည်ဆောက်ပြီး typecheck, lint, format check နဲ့ test အားလုံးကို လုပ်ပါမယ်။
6. ပြင်ဆင်ထားတဲ့ code၊ စမ်းသပ်မှုရလဒ်နဲ့ မပြီးသေးတဲ့အလုပ်တွေကို ဒီ `Plan.md` နဲ့ `piano-engine/BLENDER-3D-PLAN.md` နှစ်ခုလုံးမှာ မှတ်တမ်းတင်ပါမယ်။

## GLB ပေါ်က တိကျတဲ့ contact ကို အတည်ပြုဖို့ ကျန်ရှိသောအလုပ်

- GLB ရဲ့ bind pose နဲ့ animation clip တွေကို စစ်ပြီး wrist/palm anchor, bone length, fingertip surface point နဲ့ flexion axis ကို တိုင်းတာပါ။ အဲဒီတိုင်းတာချက်တွေကို Engine rig နဲ့ ကယ်လီဘရေးရှင်းလုပ်ပါ။
- GLB အတွက် rig ကယ်လီဘရေးရှင်းပြီးမှသာ Engine IK residual ကို GLB ပေါ်မှာ မြင်ရတဲ့ fingertip contact အမှားအဖြစ် သုံးပါ။
- Wrist ရဲ့ position/rotation ရွေ့လျားမှုကို `prepare → travel → align → press → hold → release` အဆင့်တွေအလိုက်၊ frame delta ကို မမှီခိုဘဲ အချိန်နဲ့တွက်ပါ။
- Chord တစ်ခုအတွက် wrist pose နဲ့ fingertip target အားလုံးကို တစ်ပြိုင်နက်ဖြေရှင်းပါ။ Joint limit, key/hand collision နဲ့ လက်လှမ်းမမီတဲ့ note တွေရဲ့အမှားကိုလည်း ဖော်ပြပါ။
- Browser ပေါ်မှာ GLB contact, preview/export တူညီမှု, seek/repeated frame, ဘယ်/ညာလက်ပြောင်းပြန်မှုနဲ့ desktop/mobile လုပ်ဆောင်မှုကို စမ်းသပ်ပါ။

## လက်ခံစံနှုန်းများ

- Synthetic Engine rig ပေါ်မှာ လက်လှမ်းမီတဲ့ fingertip target အတွက် အမှား 2 mm မကျော်ရ၊ joint limit မချိုးရ။
- Note-off ပြီးနောက် key depth သည် 70 ms အတွင်း ဆက်တိုက်လျော့ရမည်။ Note-on/off အချိန်တွင် ရုတ်တရက်ခုန်မသွားရ။
- Chord တစ်ခုစီမှာ assigned finger တစ်ချောင်းချင်းစီက target key ကိုထိနိုင်/မထိနိုင်တာနဲ့ အမှားအကွာအဝေးကို ဖော်ပြရမည်။
- GLB ကယ်လီဘရေးရှင်းပြီးနောက် မြင်ရတဲ့ fingertip contact အမှားကို သီးခြားတိုင်းတာပြီး အတည်ပြုရမည်။ ကယ်လီဘရေးရှင်း မပြီးမချင်း Engine residual ကို GLB ရဲ့ တကယ့် contact အမှားလို့ မသတ်မှတ်ရ။
- Timestamp တစ်ခုတည်းမှာ preview နဲ့ export က တူညီတဲ့ hand/key state ထုတ်ရမည်။

## အလုပ်မှတ်တမ်း

### 2026-11-09 — စစ်ဆေးမှုနဲ့ လက်ရှိပြင်ဆင်မှု

**စစ်ဆေးမှု။** GitHub `msharing0008` ထဲက Piano Video page, `piano-hand-3d.js`, `piano-hand-engine` source/test နဲ့ GLB metadata ကို စစ်ဆေးခဲ့ပါတယ်။ 12.3 MB GLB ရဲ့ joint ၂၁ ခုနဲ့ renderer ရဲ့ finger-bone mapping အမည်တွေ ကိုက်ညီတာကို အတည်ပြုခဲ့ပါတယ်။ GLB ရဲ့ wrist anchor, fingertip surface, bone length နဲ့ local rotation axis တွေကို Engine rig နဲ့တော့ မတိုင်းညှိရသေးပါ။

**Engine ပြင်ဆင်မှု။** `piano-hand-engine/src/kinematics/inverseKinematics.ts` ကို ထည့်ခဲ့ပါတယ်။ Joint limit မကျော်စေတဲ့ damped-least-squares နည်းလမ်းနဲ့ finger target တစ်ခု သို့မဟုတ် finger target အများအပြားကို wrist pose တစ်ခုအပေါ်မှာ ဖြေရှင်းပြီး mm residual နဲ့ converged အခြေအနေကို ပြန်ပေးပါတယ်။ `src/index.ts` ကနေ API ကို ဖော်ထုတ်ပြီး synthetic rig ပေါ်မှာ လက်လှမ်းမီ/မမီ target, chord လက်ချောင်းများ, တစ်လက်ချောင်းအတွက် ပဋိပက္ခဖြစ်တဲ့ target, spread joint ပိတ်ထားမှု, ဘယ်လက်ပြောင်းပြန်မှုနဲ့ joint limit အတွက် test ထည့်ခဲ့ပါတယ်။ `src/index.ts` ထဲက overview နဲ့ README ထဲက phase status ကို IK အသစ်နဲ့ GLB ကယ်လီဘရေးရှင်း မပြီးသေးကြောင်း ဖော်ပြနိုင်အောင် ပြင်ဆင်ခဲ့ပါတယ်။

**Key release ပြင်ဆင်မှု။** `piano-hand-engine/src/keyboard/keyPosition.ts` မှာ `isKeyContactActive()` ထည့်ခဲ့ပါတယ်။ Note event ကို note end ပြီးနောက် release 70 ms ပြည့်တဲ့အထိ renderer ထဲမှာ ဆက်ထားနိုင်ပါတယ်။ Note onset, note-off နဲ့ release အဆုံး boundary တွေအတွက် test တွေထည့်ခဲ့ပါတယ်။

**3D renderer ပြင်ဆင်မှု။** `website/assets/piano-hand-3d.js` က အသံထွက်နေတဲ့ note ရဲ့အရောင်နဲ့ release ဆက်ဖြစ်နေတဲ့ contact event ကို သီးခြားတွက်ပါတယ်။ Wrist target ကို Engine coordinate အဖြစ်ပြောင်းပြီး assigned finger တစ်ချောင်းစီအတွက် Engine IK လုပ်ပါတယ်။ GLB ရဲ့ spread axis ကို မကယ်လီဘရေးရှင်းရသေးလို့ solver မှာ spread ကို အသုံးမပြုပါ။ HTML `data-*` field တွေမှာ Engine rig ရဲ့ IK residual/converged အခြေအနေကိုသာ ရေးပြီး လက်အတွက် IK target မရှိတဲ့ frame တိုင်းမှာ ဖျက်ပေးပါတယ်။ အဲဒီတန်ဖိုးတွေကို GLB ပေါ်က မြင်ရတဲ့ contact တိုင်းတာချက်လို့ မယူဆရပါ။

**စမ်းသပ်မှုရလဒ်။** `piano-hand-engine` ထဲမှာ `npm run verify` အောင်မြင်ခဲ့ပါတယ်။ TypeScript typecheck, ESLint, Prettier format check, **73/73 unit test** နဲ့ `website/assets/piano-hand-engine.js` browser bundle build အားလုံး pass ဖြစ်ခဲ့ပါတယ်။ `website/assets/piano-hand-3d.js` ကိုလည်း JavaScript syntax check လုပ်ပြီးပါပြီ။

**မပြီးသေးသောအလုပ်။** လက်ရှိ IK က Engine ရဲ့ synthetic hand rig ပေါ်မှာသာ တွက်ချက်ပါတယ်။ GLB scale, bind-pose transform နဲ့ joint axis တွေကို ကယ်လီဘရေးရှင်းမလုပ်ရသေးလို့ 3D model ရဲ့ လက်ဖျားက ခလုတ်ကို တကယ်တိကျစွာထိနေတယ်လို့ မအတည်ပြုနိုင်သေးပါ။ Chord အတွက် wrist target ကို ပျမ်းမျှယူနေဆဲဖြစ်ပြီး wrist rotation/trajectory, collision/clearance, preview/export တူညီမှုနဲ့ browser-level contact test တွေ ဆက်လုပ်ရန်ကျန်ပါသေးတယ်။
