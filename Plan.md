# msharing0008 လက်ရှိ Master Plan Index

## လက်ရှိ အတည်ပြုထားသော အလုပ်မှတ်တမ်း

Repository တစ်ခုလုံးအတွက် Notation Engine၊ Drum Video export stability၊ Guitar/Bass/Piano/Violin propagation၊ asset gate၊ render report၊ browser evidence၊ CI နှင့် Definition of Done အားလုံးကို စုစည်းထားသော authoritative delivery plan သည် [`Doc/CONSOLIDATED-PLAN-2026-11-10.md`](./Doc/CONSOLIDATED-PLAN-2026-11-10.md) ဖြစ်သည်။ Code ထဲတွင် ရှိသော်လည်း ယခင် plan များတွင် မပါသေးသော အလုပ်များကို အဲဒီစာတမ်း၏ Sections 2–8 တွင် မှတ်တမ်းတင်ထားသည်။

## Plan ခွဲခြားဖတ်ရန်

- **Repository delivery / export rollout:** [`Doc/CONSOLIDATED-PLAN-2026-11-10.md`](./Doc/CONSOLIDATED-PLAN-2026-11-10.md)
- **Drum နှင့် instrument video acceptance:** [`Doc/rollout/README.md`](./Doc/rollout/README.md)
- **Notation Engine architecture and roadmap:** [`Engine/notation-engine/PLAN.md`](./Engine/notation-engine/PLAN.md)
- **Notation Engine actual build status:** [`Engine/notation-engine/Doc/STATUS.md`](./Engine/notation-engine/Doc/STATUS.md)
- **Piano Hand / GLB contact work:** ဤဖိုင်၏ အောက်ပါ piano-specific plan

---

# Piano Video လက်ချောင်း–ခလုတ် တိကျမှု စီမံချက်

## ရည်မှန်းချက်

Piano Video ရဲ့ **Hands** mode မှာ Piano Hand Engine က သတ်မှတ်ပေးတဲ့ ဘယ်/ညာလက်နဲ့ လက်ချောင်း ၁ မှ ၅ တို့က သတ်မှတ်ထားတဲ့ MIDI ခလုတ်ကို တိတိကျကျထိ၊ မှန်ကန်တဲ့ note-on အချိန်မှာဖိပြီး note-off ပြီးနောက် သဘာဝကျကျလွှတ်နိုင်ရပါမယ်။ လက်ရှိ production model သည် `website/assets/hand/hands_pair.glb` ဖြစ်ပြီး တစ်ဖက်စီ သီးခြား rig၊ wrist root နှင့် measured fingertip anchors ကို သုံးသည်။ လက်ဖဝါးကို ခလုတ်ဘက်မှောက်၊ လက်ဖမိုးကို အပေါ်စီးကမြင်ရတဲ့ပုံစံ ဖြစ်ရပါမယ်။ ယခင် `hand_model.glb` ကို demo အတွက် သီးခြားထိန်းထားသည်။ Preview နဲ့ export နှစ်ခုလုံးမှာ အချိန်တစ်ခုချင်းစီအတွက် တူညီတဲ့ လက်နဲ့ခလုတ်အခြေအနေကို အသုံးပြုရပါမယ်။

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

- `Engine/piano-hand-engine/src/core/performancePlan.ts` ကို ထည့်ပြီး `PerformanceNote → hand split → fingering → key position` ကို `PianoPerformancePlan` တစ်ခုတည်းအဖြစ် ထုတ်ပေးနိုင်အောင် ပြင်ထားသည်။
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

- `Engine/piano-hand-engine/src/core/motionPlan.ts` ကို ထည့်ပြီး `PianoMotionPlan`, `HandTrajectorySegment`, `FingerContactPlan`, `SampledHandMotion` data model များ တည်ဆောက်ထားသည်။
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

## 2026-11-10 — Phase C မပြင်မီ အတည်ပြုထားသော GLB/contact update

Phase C တွင် numeric calibration တန်ဖိုးများကို မခန့်မှန်းဘဲ GLB asset ကို စစ်ဆေးနိုင်သော manifest နှင့် transform contract ကို အရင်တည်ဆောက်မည်။ GLB ၏ actual bone axis, fingertip surface landmark နှင့် Engine-to-GLB scale/rotation/translation တို့ကို တိုင်းတာအတည်ပြုမပြီးမချင်း manifest ကို `calibrated: false` အဖြစ်သာ သတ်မှတ်မည်။

### ပြင်မည့်အချက်များ

1. GLB skeleton audit result အတွက် model path, joint count, bone chains, animation clip names နှင့် source/license metadata ပါသော versioned calibration manifest ထည့်မည်။
2. Calibration transform ကို Engine millimetre space ↔ GLB local/world space အဖြစ် သီးခြား API ဖြင့် သတ်မှတ်မည်။ Transform မပြည့်စုံလျှင် fail-closed ဖြစ်ပြီး visible contact accuracy ဟု မကြေညာရ။
3. Single-finger contact solver ထည့်မည်။ Note တစ်ခု၏ assigned hand/finger/strike target နှင့် fixed wrist pose ကို အသုံးပြုပြီး calibrated transform ဖြင့် fingertip target ကို solve လုပ်မည်။
4. Solver result တွင် `converged`, `residualMm`, `targetKeyMidi`, `finger`, `hand`, `calibrationVersion` နှင့် failure reason ကို ပြန်ပေးမည်။
5. Reachable synthetic target, unreachable target, left/right mirror, calibration missing နှင့် note-on contact boundary tests ထည့်မည်။
6. GLB manifest ကို renderer က load/validate လုပ်နိုင်ရန် browser asset path ကို သတ်မှတ်မည်။ Manifest validated မဖြစ်လျှင် renderer သည် diagnostic ပြပြီး calibrated contact အဖြစ် မဆက်လုပ်ရ။

### Phase C လက်ခံစံနှုန်း

- Manifest သည် GLB ၏ 21-bone skeleton နှင့် finger bone chain mapping ကို အတည်ပြုနိုင်ရမည်။
- Calibration မရှိသေးချိန်တွင် solver သည် result ကို `calibration-required` အဖြစ် ပြန်ပေးရမည်။
- Calibrated transform ဖြင့် reachable single-finger target သည် သတ်မှတ် tolerance အတွင်း residual ပြန်ပေးရမည်။
- Unreachable target ကို converged ဟု မပြောရ၊ failure reason နှင့် residual ကို ဖော်ပြရမည်။
- Left/right mirror transform သည် တူညီသော Engine target convention ကို ထိန်းရမည်။
- Note-on timestamp သည် contact schedule ထဲတွင် မပြောင်းရ။

## 2026-11-10 — Phase C ပြင်ဆင်ပြီးမှု မှတ်တမ်း

### ပြင်ပြီးသောအချက်များ

- `Engine/piano-hand-engine/src/calibration/glbCalibration.ts` ကို ထည့်ပြီး GLB calibration manifest, expected 21-bone finger-chain mapping, manifest validation နှင့် Engine↔GLB point transform API တည်ဆောက်ထားသည်။
- `website/assets/hand/hand-calibration.json` ကို actual `hand_model.glb` skeleton audit အပေါ်အခြေခံ၍ ထည့်ထားသည်။ Manifest တွင် `radius_ulna`, thumb/index/middle/ring/pinky chains နှင့် `Pose_OK`/`RigAction` clips ပါဝင်သည်။
- Manifest ကို လက်ရှိ `calibrated: false` ထားထားပြီး bone length, fingertip landmark, joint axis နှင့် Engine-to-GLB transform မတိုင်းညှိရသေးကြောင်း asset ထဲတွင် ရှင်းလင်းမှတ်သားထားသည်။
- `Engine/piano-hand-engine/src/calibration/singleFingerContact.ts` ကို ထည့်ပြီး hand, finger, wrist pose, key strike target နှင့် calibration manifest ကို အသုံးပြုသော single-finger contact solver ထည့်ထားသည်။
- Calibration မပြည့်စုံလျှင် solver သည် `calibration-required`/validation failure ဖြင့် fail-closed လုပ်ပြီး synthetic residual ကို visible GLB contact ဟု မကြေညာပါ။
- Calibrated transform ရှိသောအခါ reachable target ကို residual နှင့် GLB tip position ပြန်ပေးပြီး unreachable target ကို `unreachable` reason ဖြင့် ပြန်ပေးသည်။
- Phase C အတွက် calibration-required, reachable identity-transform contact, unreachable target, left-hand convention နှင့် changed bone-chain validation tests ထည့်ထားသည်။

### စမ်းသပ်မှုရလဒ်

- `piano-hand-engine`: **86/86 tests passed**
- TypeScript typecheck: passed
- ESLint: passed
- Prettier format check: passed
- Browser bundle build: passed
- `website/assets/piano-hand-3d.js` syntax check: passed
- `hand-calibration.json` JSON validation: passed
- `git diff --check`: passed

### မပြီးသေးသောအချက်များ

- GLB ၏ actual bone lengths, fingertip surface landmarks, local joint axes နှင့် Engine-to-GLB numeric transform ကို မတိုင်းညှိရသေးပါ။
- `hand-calibration.json` ကို renderer က runtime load/validate လုပ်ပြီး 3D GLB pose သို့ တိုက်ရိုက်သုံးခြင်း မပြီးသေးပါ။
- Single-finger solver ကို live preview/export path ထဲ မချိတ်ရသေးပါ။
- Key/hand collision, black-key clearance, wrist rotation trajectory နှင့် coupled chord IK မပြီးသေးပါ။

Phase C သည် skeleton audit, calibration contract နှင့် fail-closed single-finger solver ကို ပြီးစီးစေသည်။ Actual GLB fingertip contact accuracy ကို calibrated numeric manifest မထည့်မချင်း အတည်ပြုပြီးပြီဟု မဆိုရ။

## 2026-11-10 — Phase C.1 ဆက်လက်လုပ်ဆောင်မည့် GLB audit plan

လက်ရှိ manifest သည် skeleton names နှင့် clip names ကို မှန်ကန်စွာ မှတ်တမ်းတင်ထားသော်လည်း numeric bind-pose measurements မပါသေးပါ။ ထို့ကြောင့် နောက်တစ်ဆင့်တွင် GLB binary ကို တိုက်ရိုက်ဖတ်ပြီး reproducible audit report/manifest ထုတ်မည်။ Numeric measurements ရရှိသော်လည်း fingertip surface offset နှင့် Engine-to-GLB transform ကို visual calibration မလုပ်မချင်း `calibrated: false` ကို ဆက်ထားမည်။

### ပြင်မည့်အချက်များ

1. `tools/audit-glb-calibration.mjs` ဖြင့် GLB JSON chunk ကိုဖတ်ကာ joint names, parent-child chain, local translation, bind-pose bone length နှင့် animation clips ကို deterministic ထုတ်မည်။
2. Audit tool ထုတ်ပေးသော measurement data ကို `website/assets/hand/hand-calibration.json` ထဲ embed လုပ်မည်။ Source GLB ပြောင်းလဲလျှင် audit result ပြန်ထုတ်နိုင်ရမည်။
3. Browser 3D renderer တွင် calibration manifest ကို load/validate လုပ်ပြီး skeleton mismatch သို့မဟုတ် uncalibrated state ကို diagnostic အဖြစ် ထုတ်မည်။
4. Single-finger contact result ကို manifest version နှင့် audit measurements များနှင့် ချိတ်ထားမည်။ မတိုင်းရသေးသော surface landmark/transform များကို contact success ဟု မပြောရ။
5. Audit output consistency, parent-chain mismatch, manifest loading နှင့် uncalibrated renderer behavior ကို test လုပ်မည်။

### Phase C.1 လက်ခံစံနှုန်း

- Audit tool သည် source GLB မှ joint count, chain names, parent relationships, local translations နှင့် bone lengths ကို ထပ်ခါထပ်ခါ run လုပ်လျှင် တူညီစွာ ထုတ်ပေးရမည်။
- Manifest ထဲက measured skeleton data သည် source GLB နဲ့ မကိုက်လျှင် validation fail ရမည်။
- Renderer သည် `calibrated: false` အချိန်တွင် GLB ကို render လုပ်နိုင်သော်လည်း visible fingertip contact ကို calibrated success ဟု မပြရ။
- Surface landmark နှင့် Engine↔GLB transform မတိုင်းရသေးသည့်အချက်ကို report ထဲတွင် အတိအကျ ဖော်ပြရမည်။

## 2026-11-11 — Phase C.1 ပြင်ဆင်ပြီးမှု မှတ်တမ်း

### ပြင်ပြီးသောအချက်များ

- `tools/audit-glb-calibration.mjs` ကို ထည့်ပြီး source `hand_model.glb` ကို တိုက်ရိုက်ဖတ်ကာ joint names, parent relationships, local translations, bind-pose local bone lengths နှင့် animation clips ကို deterministic JSON အဖြစ် ထုတ်နိုင်အောင် ပြင်ထားသည်။
- `website/assets/hand/hand-calibration.json` ကို audit output ဖြင့် ပြန်ထုတ်ထားပြီး actual source GLB မှ **21 joints**, **5 finger chains**, **2 animation clips** (`Pose_OK`, `RigAction`) နှင့် bone-length measurements ပါဝင်သည်။
- Finger-tip surface landmark, local joint axis နှင့် Engine↔GLB transform မတိုင်းညှိရသေးသောကြောင့် manifest ၏ `calibrated` ကို `false` အဖြစ် မပြောင်းထားပါ။
- `website/assets/piano-hand-3d.js` သည် GLB load အချိန် calibration manifest ကို fetch/validate လုပ်ပြီး `data-glb-calibration`, status/error နှင့် missing-bone diagnostics ထုတ်ပေးသည်။ Manifest မရလျှင် GLB preview မပျက်ဘဲ calibration status ကို `unknown` အဖြစ် ပြသည်။
- `tools/test-glb-calibration.mjs` ကို ထည့်ပြီး audit output deterministic ဖြစ်မှု၊ joint/chain count၊ parent data နှင့် positive bone lengths ကို regression test လုပ်ထားသည်။

### စမ်းသပ်မှုရလဒ်

- GLB audit regression: passed
- `piano-hand-engine`: **86/86 tests passed**
- TypeScript typecheck: passed
- ESLint: passed
- Prettier format check: passed
- Browser bundle build: passed
- `website/assets/piano-hand-3d.js` syntax check: passed
- `hand-calibration.json` JSON validation: passed
- `git diff --check`: passed

### မပြီးသေးသောအချက်များ

- Audit လုပ်ထားသော local bone lengths များကို mesh surface fingertip landmarks အဖြစ် မသတ်မှတ်ရသေးပါ။
- Joint local rotation axes နှင့် Engine↔GLB numeric transform ကို Blender/Three.js visual calibration ဖြင့် မအတည်ပြုရသေးပါ။
- Renderer သည် manifest ကို validate လုပ်နေသော်လည်း calibrated transform ဖြင့် GLB bones ကို actual key strike point သို့ မချိတ်ရသေးပါ။
- Single-finger solver ကို live GLB pose path ထဲ မချိတ်ရသေးပါ။

Phase C.1 သည် reproducible GLB audit နှင့် runtime manifest validation ကို ပြီးစီးစေသည်။ Visible fingertip contact accuracy ကို surface landmark နှင့် transform calibration ပြီးမှသာ အတည်ပြုမည်။

## 2026-11-11 — Phase C.2 Visual Calibration ပြီးစီးမှု

- Production `hands_pair.glb` နှင့် `hands_pair_fingertips.json` ကို browser runtime တွင် load လုပ်ပြီး left/right wrist roots နှင့် finger ၁–၅ anchor များ အားလုံးကို validate လုပ်ခဲ့သည်။
- C-major scale မှ representative contact frames ၅ ခုကို စမ်းခဲ့သည် — right finger 1, left finger 5, 4, 2, 1 — နှင့် note-on/held state နှစ်မျိုးလုံး ပါဝင်သည်။
- Piano key press depth (0–10 mm) ကို ထည့်တွက်ပြီး actual Engine strike point နှင့် GLB fingertip world position ကို တိုင်းရာ **maximum residual = 0.000 mm** ရရှိသည်။ Acceptance tolerance ကို 1 mm ထားထားသောကြောင့် visual contact calibration pass ဖြစ်သည်။
- `hand-calibration.json` တွင် `calibrated: true`၊ bidirectional local engine↔GLB unit transform (`150 mm/source unit`, keyboard-facing Z reflection) နှင့် visual evidence (`5 samples`, `0 mm max residual`) ကို ထည့်ထားသည်။
- Runtime renderer သည် calibration state ကို `data-glb-calibration="anchor-calibrated"` အဖြစ် ပြသပြီး missing anchor/root ဖြစ်လျှင် invalid diagnostic ထုတ်မည်။

### Phase C.2 မပြီးသေးသော အပိုင်းများ

- Multi-finger chord တစ်ခုတည်းအတွင်း fingertip residual အားလုံးကို တစ်ပြိုင်နက် 1 mm အောက်ထားနိုင်မှု မစမ်းရသေးပါ။
- Wrist trajectory, palm collision/clearance နှင့် rapid crossing motion ကို visual stress test ထပ်လုပ်ရန် လိုသေးသည်။
- `hand-calibration.json` ၏ legacy `hand_model.glb` skeleton audit နှင့် production `hands_pair.glb` fingertip-anchor calibration ကို နောက်ပိုင်း schema တစ်ခုတည်းအဖြစ် သီးခြား model entries ဖြင့် ခွဲသိမ်းရန် လိုသေးသည်။

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
6. ပြင်ဆင်ထားတဲ့ code၊ စမ်းသပ်မှုရလဒ်နဲ့ မပြီးသေးတဲ့အလုပ်တွေကို ဒီ `Plan.md` နဲ့ `Engine/piano-engine/BLENDER-3D-PLAN.md` နှစ်ခုလုံးမှာ မှတ်တမ်းတင်ပါမယ်။

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

**Engine ပြင်ဆင်မှု။** `Engine/piano-hand-engine/src/kinematics/inverseKinematics.ts` ကို ထည့်ခဲ့ပါတယ်။ Joint limit မကျော်စေတဲ့ damped-least-squares နည်းလမ်းနဲ့ finger target တစ်ခု သို့မဟုတ် finger target အများအပြားကို wrist pose တစ်ခုအပေါ်မှာ ဖြေရှင်းပြီး mm residual နဲ့ converged အခြေအနေကို ပြန်ပေးပါတယ်။ `src/index.ts` ကနေ API ကို ဖော်ထုတ်ပြီး synthetic rig ပေါ်မှာ လက်လှမ်းမီ/မမီ target, chord လက်ချောင်းများ, တစ်လက်ချောင်းအတွက် ပဋိပက္ခဖြစ်တဲ့ target, spread joint ပိတ်ထားမှု, ဘယ်လက်ပြောင်းပြန်မှုနဲ့ joint limit အတွက် test ထည့်ခဲ့ပါတယ်။ `src/index.ts` ထဲက overview နဲ့ README ထဲက phase status ကို IK အသစ်နဲ့ GLB ကယ်လီဘရေးရှင်း မပြီးသေးကြောင်း ဖော်ပြနိုင်အောင် ပြင်ဆင်ခဲ့ပါတယ်။

**Key release ပြင်ဆင်မှု။** `Engine/piano-hand-engine/src/keyboard/keyPosition.ts` မှာ `isKeyContactActive()` ထည့်ခဲ့ပါတယ်။ Note event ကို note end ပြီးနောက် release 70 ms ပြည့်တဲ့အထိ renderer ထဲမှာ ဆက်ထားနိုင်ပါတယ်။ Note onset, note-off နဲ့ release အဆုံး boundary တွေအတွက် test တွေထည့်ခဲ့ပါတယ်။

**3D renderer ပြင်ဆင်မှု။** `website/assets/piano-hand-3d.js` က အသံထွက်နေတဲ့ note ရဲ့အရောင်နဲ့ release ဆက်ဖြစ်နေတဲ့ contact event ကို သီးခြားတွက်ပါတယ်။ Wrist target ကို Engine coordinate အဖြစ်ပြောင်းပြီး assigned finger တစ်ချောင်းစီအတွက် Engine IK လုပ်ပါတယ်။ GLB ရဲ့ spread axis ကို မကယ်လီဘရေးရှင်းရသေးလို့ solver မှာ spread ကို အသုံးမပြုပါ။ HTML `data-*` field တွေမှာ Engine rig ရဲ့ IK residual/converged အခြေအနေကိုသာ ရေးပြီး လက်အတွက် IK target မရှိတဲ့ frame တိုင်းမှာ ဖျက်ပေးပါတယ်။ အဲဒီတန်ဖိုးတွေကို GLB ပေါ်က မြင်ရတဲ့ contact တိုင်းတာချက်လို့ မယူဆရပါ။

**စမ်းသပ်မှုရလဒ်။** `piano-hand-engine` ထဲမှာ `npm run verify` အောင်မြင်ခဲ့ပါတယ်။ TypeScript typecheck, ESLint, Prettier format check, **73/73 unit test** နဲ့ `website/assets/piano-hand-engine.js` browser bundle build အားလုံး pass ဖြစ်ခဲ့ပါတယ်။ `website/assets/piano-hand-3d.js` ကိုလည်း JavaScript syntax check လုပ်ပြီးပါပြီ။

**မပြီးသေးသောအလုပ်။** လက်ရှိ IK က Engine ရဲ့ synthetic hand rig ပေါ်မှာသာ တွက်ချက်ပါတယ်။ GLB scale, bind-pose transform နဲ့ joint axis တွေကို ကယ်လီဘရေးရှင်းမလုပ်ရသေးလို့ 3D model ရဲ့ လက်ဖျားက ခလုတ်ကို တကယ်တိကျစွာထိနေတယ်လို့ မအတည်ပြုနိုင်သေးပါ။ Chord အတွက် wrist target ကို ပျမ်းမျှယူနေဆဲဖြစ်ပြီး wrist rotation/trajectory, collision/clearance, preview/export တူညီမှုနဲ့ browser-level contact test တွေ ဆက်လုပ်ရန်ကျန်ပါသေးတယ်။

### 2026-11-10 — လက်နှစ်ဖက် model အတွက် လက်ရှိအခြေအနေ

GitHub ၏ လက်ရှိ production asset သည် `website/assets/hand/hands_pair.glb` ဖြစ်ပြီး၊ `hands_pair_source.blend` မှ သီးခြား `PianoHandLeftRoot` နှင့် `PianoHandRightRoot` ကို အသုံးပြုသည်။ `hands_pair_fingertips.json` ထဲတွင် Blender မှတိုင်းထားသော wrist-relative fingertip anchor များ ပါဝင်ပြီး renderer က distal finger bone များနှင့် ချိတ်ကာ လက်ချောင်းကွေးသည့် frame တိုင်းတွင် tip world-position ကို ပြန်တွက်သည်။ Three.js `GLTFLoader` ၏ bone-name sanitize လုပ်ပုံနှင့် right-hand duplicate name များအတွက် `_1` suffix ကိုလည်း mapping ထဲတွင် ထည့်ထားသည်။ Model ၏ source/license/export အသေးစိတ်ကို `website/assets/hand/README.md`၊ `LICENSE.html` နှင့် export script တွင် မှတ်တမ်းတင်ထားသည်။

ကျွန်ုပ်၏ browser test သည် နောက်ပိုင်း အစားထိုးသွားသော raw GLB export ကို စမ်းသပ်ခဲ့ခြင်းဖြစ်သည်။ ထိုစမ်းသပ်မှုတွင် ဘယ်လက် MIDI 48/finger 5 နှင့် ညာလက် MIDI 64/finger 3 ကို တစ်ပြိုင်နက်ပြနိုင်ပြီး၊ လက်ဖျား–ခလုတ် offset ရှိနေကြောင်း တွေ့ခဲ့သည်။ ယခု active ဖြစ်သော `hands_pair.glb` နှင့် measured fingertip anchors ကို သုံးပြီး end-to-end browser test ဖြင့် tip–key အကွာအဝေးကို မတိုင်းတာရသေးသောကြောင့် **တိကျသော contact ကို အောင်မြင်ပြီးဟု မဆိုရသေးပါ**။ Chord coupled IK၊ collision/clearance၊ wrist trajectory နှင့် preview/export parity ကိုလည်း ဆက်စစ်ရန် ကျန်ရှိသည်။

နောက်ဆုံး source အပေါ် `npm run verify` အောင်မြင်ခဲ့သည် (**81/81 tests**); TypeScript, ESLint, Prettier, browser bundle build နှင့် `piano-hand-3d.js` syntax check လည်း pass ဖြစ်သည်။ ဤ suite သည် current GLB ပေါ်က fingertip–key အကွာအဝေးကို မတိုင်းတာသဖြင့် အပေါ်က contact လက်ခံစံကို အစားမထိုးပါ။


# Thank You (Outro) ending ကို အမြဲပါအောင် လုပ်ခြင်း — Integrated Plan

ဤအပိုင်းသည် user ပေးထားသော [`Doc/PLAN-thank-you-outro.md`](./Doc/PLAN-thank-you-outro.md) ကို root `Plan.md` ထဲသို့ ပေါင်းစည်းထားသော version ဖြစ်သည်။ အောက်တွင် draft အကြောင်းအရာကို မပြောင်းဘဲ ထည့်ထားပြီး၊ repository ရဲ့ လက်ရှိ code/CI အခြေအနေအပေါ် အခြေခံပြီး ဆက်လက်ရေးသားထားသော implementation continuation ကို ထပ်ပေါင်းထားသည်။ ဒီ plan ရဲ့ status သည် **Draft — coding မစရသေး** ဖြစ်ပြီး user က `ready` ဟု အတည်ပြုပြီးမှ S0/S1 ကို စတင်ရမည်။

# PLAN — Thank You (Outro) ending ကို အမြဲပါအောင် လုပ်ခြင်း

| | |
|---|---|
| **အခြေအနေ** | Draft v1 — မင်း "ready" မပြောမချင်း coding မစပါ |
| **အခြေခံ** | repo `main` @ `78f975a` (2026-11-10) |
| **ကျုံးဝင်တာ** | `website/assets/outro-video.js` + instrument page ၆ ခု (drum, guitar, bass-guitar, piano, violin, metronome) + `cloudflare-worker` |
| **စည်းကမ်း** | အဆင့်တစ်ခုချင်း၊ test အရင်၊ အဆင့်ပြီးတိုင်း ရပ်ပြီး မင်းအတည်ပြုမှ နောက်တစ်ဆင့် |

---

## 0. ရည်ရွယ်ချက်

**ပန်းတိုင်:** ထုတ်လုပ်တဲ့ video တိုင်းရဲ့ အဆုံးမှာ **Thank You ending တစ်ခု အမြဲ ပါရမယ်။** R2 နှေးတာ၊ ပြတ်တာ၊ ဖိုင်မတွေ့တာ၊ Worker ပျက်တာ ဖြစ်လည်း မပျောက်ရဘူး။

**အောင်မြင်ပြီလို့ သတ်မှတ်ချက် (တစ်ကြောင်းတည်း):**
> R2 ကို လုံးဝ block လုပ်ထားလည်း export တိုင်း ending နဲ့ပဲ ပြီးရမယ်။ R2 ကောင်းရင် R2 ရဲ့ clip ကို သုံးမယ်။

**ဒီ plan ရဲ့ အပြင်ဘက် (သီးခြား plan):** R2 ပုံ/ဗီဒီယို ပို့ပုံ cache/custom domain အကြီးစား ပြောင်းလဲမှု၊ export composition တည်ငြိမ်ရေး (pin/gate — drum မှာ ရှိပြီး)၊ GLB license။

---

## 1. လက်ရှိအခြေအနေ (ကုဒ်ထဲက အတည်ပြုပြီး)

| အချက် | ဘယ်မှာ |
|---|---|
| Clip key ပုံစံ: `Thank Video/{aspect}/{kind}/{aspect} {Black\|White} {Kind}.mp4`၊ ဖိုင်မတွေ့ရင် နောက် key ကို ဆက်စမ်း (အများဆုံး ~၅ ခု) | `outro-video.js` ရဲ့ key ဆောက်တဲ့အပိုင်း |
| `kind`: drum၊ guitar (bass ပါ)၊ **`paino`** (piano + violin — စာလုံးပေါင်း `paino`)၊ metronome | page ၆ ခု |
| Fetch လုပ်ပုံ: `${API_BASE}/assets/shared/<key>` → `arrayBuffer()` → blob → `<video>` | `outro-video.js` |
| **၁၀ စက္ကန့် abort** က ဖိုင်တစ်ခုလုံး ဒေါင်းတာ (`arrayBuffer()`) ကိုပါ ကာထား (11-08 commit `6b87b74` က ထည့်) | `loadOutro` |
| Metadata စောင့်တာ ၈ စက္ကန့်၊ မရရင် **reject** (အရင်က ဆက်သွားတယ်) | `waitForMetadata` |
| အားလုံးကျရင် `null` ပြန်၊ ကျတာကို **၃၀ စက္ကန့်** မှတ်ထား | `failureCache`၊ `lastFailure()` |
| Worker `/assets/shared/*`: R2 object ကို တစ်ဖိုင်လုံး stream၊ `max-age=60`၊ **Range မရှိ၊ 304 မရှိ** | `cloudflare-worker/src/index.ts` |
| Outro မရရင် export ရပ်တာ မဟုတ်၊ warning + "ending မပါဘဲ ဆက်မလား" dialog | drum page `generateVideo` / `askOptionalRender` |
| Segment contract: `{ seconds, draw(ctx, at, index), audio }` | `docs/VIDEO-ENGINE.md` |
| Same-origin logo SVG ရှိပြီးသား (`sharing-*-logo-full.svg`) | `website/assets/logo/` |
| Outro test မရှိ | `website/tests/` (loader/cleanup/voice-samples သုံးခုပဲ) |

**အားသာချက်:** Page ၆ ခုလုံးက `outro-video.js` တစ်ခုတည်းကို သုံးတာမို့ loader ကို ပြင်ရင် ၆ ခုလုံး တစ်ပြိုင်နက် ကောင်းမယ်။

---

## 2. ဘာကြောင့် မပါတော့တာလဲ — သံသယများ (အတည်မပြုရသေး)

| # | သံသယ | အထောက်အထား | အတည်ပြုနည်း (S0) |
|---|---|---|---|
| H1 | ၁၀ စက္ကန့် abort က ကြီးတဲ့ mp4 ကို ဒေါင်းမပြီးခင် ဖြတ်ချ | 11-08 ရဲ့ commit နဲ့ "မကြာသေးခင်မှ ပျောက်တာ" ကိုက်၊ Worker က Range/cache မရှိ | Network tab မှာ clip ဒေါင်းချိန်/ဆိုဒ် ကြည့် |
| H2 | R2 ထဲ clip နာမည်/folder မကိုက် (case, space, `paino`) | key ကို အတိအကျ ခန့်မှန်းတာ | URL ကို တိုက်ရိုက်ဖွင့်၊ 404 လား |
| H3 | `ALLOWED_ORIGINS` ကန့်သတ်ထားလို့ CORS ကျ | loader က `mode:'cors'` | Console မှာ CORS error ရှိလား |
| H4 | Browser က clip codec (HEVC/AAC မဟုတ်) မဖတ်နိုင် | metadata/decode error | `<video>` error၊ ဖိုင်ကို `ffprobe` |
| H5 | Deploy လုပ်ထားတဲ့ Worker က repo ကုဒ်နဲ့ မတူ (`/assets/shared/` မပါ) | Worker source ကို တစ်ချိန်က repo ပြင်ပမှာ ထိန်းခဲ့ဖူး | လက်ရှိ Worker မှာ route စမ်း |
| H6 | R2/Workers ရဲ့ တစ်ခါတစ်ရံ ပြတ်ခြင်း/limit | အရင်က intermittent ပြဿနာ | Worker logs |

### S0 — Diagnosis checklist (coding မလို)

1. နောက်ဆုံး export ရဲ့ စာ: **`not found: 404`** လား **`unavailable: timeout/5xx`** လား (ဒါက H1/H3-H6 နဲ့ H2 ကို အရင်ခွဲပေးမယ်)။
2. Drum page ထဲက `API_BASE` ကို သုံးပြီး `…/assets/shared/Thank%20Video/16x9/drum/16x9%20Black%20Drum.mp4` ကို browser မှာ တိုက်ရိုက်ဖွင့်။ မှတ်ရန်: status၊ **ဖိုင်ဆိုဒ်**၊ **ကြာချိန်**၊ `Access-Control-Allow-Origin`။
3. Console/Network မှာ အနီရောင် error ရှိလား။
4. R2 ထဲက clip တစ်ခုကို ဒေါင်းပြီး `ffprobe` (codec၊ ဖိုင်ဆိုဒ်၊ `faststart` ရှိ/မရှိ) မှတ်။

| S0 ရလဒ် | ပထမ လုပ်မယ့် အဆင့် |
|---|---|
| 404 | S5 (နာမည်/folder ပြင်) + S1 (နာမည်အစားထိုး) |
| ၁၀ စက္ကန့်ကျော် ဒေါင်းရ / timeout | S1 + S5 (clip သေးအောင်) |
| CORS error | S4 (`ALLOWED_ORIGINS`) |
| ဖိုင်ရပေမယ့် မဖွင့်နိုင် | S5 (re-encode) |
| အကုန် ကောင်းနေ | S1 ကိုသာ (timeout ကို ဘေးကင်း) နဲ့ S2 |

> **S2 (built-in ending) ကို S0 ရလဒ်ရှိသည်ဖြစ်စေ မရှိသည်ဖြစ်စေ လုပ်ရမယ်။** ဒါက "အမြဲ ပါရမယ်" ဆိုတဲ့ ပန်းတိုင်ကို အာမခံတာ။

---

## 3. ဒီဇိုင်းဆုံးဖြတ်ချက်များ (default ပါ၊ မင်းပြင်လို့ရ)

### 3.1 အလွှာ ၃ ထပ် (priority)
1. **R2 clip** (ပိုလှတဲ့ upgrade) — preload ပြီးသားဆိုရင် သုံး။
2. **Built-in ending** (အာမခံ) — R2 မရရင် **ဘာမေးမှု မလိုဘဲ အလိုအလျောက်** သုံး။
3. ဘာမှ မရတော့မှ (built-in ရဲ့ own-origin logo/font ကျ) → **render မစဘဲ ရှင်းရှင်းပြ။** (ဒါက ဖြစ်ကို မဖြစ်သင့်ဘူး)

### 3.2 Loader (outro-video.js) ရဲ့ စံနှုန်း

| ပစ္စည်း | default |
|---|---|
| First-byte timeout | ၁၅ စက္ကန့် |
| **Stall timeout** (byte မလာတာ) | ၁၅ စက္ကန့် (ဒေါင်းနေသရွေ့ မဖြတ်) |
| စုစုပေါင်း အမြင့်ဆုံး | ၁၂၀ စက္ကန့် |
| Metadata စောင့် | ၁၅ စက္ကန့်၊ ၁ ကြိမ် retry |
| Retry | 408 / 429 / 5xx / network / timeout → **၂ ကြိမ်** (၀.၅၊ ၁.၅ စက္ကန့် + jitter)၊ retry မှာ `cache: reload` |
| **404 / 403** | retry မလုပ်၊ နောက် key ကို ဆက် (နာမည် alias ပါ) |
| Failure cache | အားလုံးကုန်ပြီး ကျမှသာ၊ **၃၀ စက္ကန့်** (ရှိပြီးသားအတိုင်း) |
| Progress | bytes/total ကို callback နဲ့ ပြ (UI gate panel အတွက်) |
| ရလဒ် object | `{ source: 'r2' \| 'builtin', key, bytes, ms, attempts, reason }` |

**Error အမျိုးအစား ခွဲမယ်:** `not-found` · `unavailable (timeout/5xx)` · `blocked (CORS)` · `codec`။ UI/report က ဒါကို ပြမယ်။

### 3.3 Preload
- Kit/aspect/style ရွေးတာနဲ့ **နောက်ကွယ်မှာ clip ကို ဒေါင်း** (render မစခင်)၊ blob ကို မှတ်ထား။
- Render ခလုတ်နှိပ်တဲ့အခါ preload မပြီးသေးရင် **အများဆုံး ၃၀ စက္ကန့်** စောင့်ပြီး မရရင် built-in ကို သုံး (ဒေါင်းတာ ဆက်လုပ်တာ ရပ်)။

### 3.4 Built-in ending (S2 ရဲ့ spec)
- **ကာလ:** ၃.၀ စက္ကန့်၊ fade-in ၀.၄ စက္ကန့်။
- **အကြောင်းအရာ:** `sharing-{kind}-logo-full.svg` + "Thank you for watching" + site URL။ Style (black/white) နဲ့ aspect (16:9 / 9:16 / 1:1) အလိုက် အနေအထား။
- **Segment contract အတိုင်း** (`seconds` + `draw(ctx, at)`)၊ `audio` မပါ (default) — audio sting လိုချင်ရင် D4။
- **Network လုံးဝ မမှီခို:** Logo/font က same-origin (`website/assets/`)၊ canvas မှာ ဆွဲ။
- Font မ load ရင် gate ရှိပြီးသား font စောင့်တာကို ပြန်သုံး။

### 3.5 Worker (S4)
- `/assets/shared/*` ကို **Range** (206) နဲ့ **If-None-Match → 304** ကိုင်၊ cache ကို ရှည်ရှည် + versioned နာမည်။
- `ALLOWED_ORIGINS` ထဲ site ရဲ့ origin အားလုံး (www/non-www၊ localhost dev) ပါမပါ စစ်။
- (ရွေးချယ်) `/api/outro` — ရှိတဲ့ clip စာရင်း ပြန်ပေး၊ page က ခန့်မှန်းစရာ၊ ၄၀၄ ၅ ကြိမ်စမ်းစရာ မလို။
- Worker deploy က repo ကနေလား (Workers Build) ဒါမှမဟုတ် dashboard ကနေလား ဆိုတာ **အရင်အတည်ပြု** (H5)။

### 3.6 R2 clip spec (S5)
- H.264 (yuv420p)၊ ≤ 1080p၊ 30 fps၊ AAC အသံ၊ **faststart**၊ **တစ်ဖိုင် ~၈ MB အောက်**။
- နာမည် စည်းမျဉ်း: ဖိုင်/folder ကို case-sensitive အတိအကျ။ `paino` စာလုံးပေါင်းကို R2 နဲ့ ကိုက်ထား၊ loader က `piano` alias ကိုပါ စမ်း (၁ ခု ထပ်တိုး)။

---

## 4. မင်းဆုံးဖြတ်ရမယ့်အချက် (Open decisions)

| # | မေးခွန်း | default |
|---|---|---|
| D1 | R2 မရရင် built-in ကို **အလိုအလျောက်** သုံးမလား၊ dialog မေးမလား | အလိုအလျောက် (warning စာကြောင်းနဲ့) |
| D2 | Built-in ending ရဲ့ ကာလ/စာသား/URL | ၃ စက္ကန့်၊ "Thank you for watching" + site URL (မင်းပေးပါ) |
| D3 | Render မှာ preload မပြီးသေးရင် ဘယ်လောက်စောင့်မလဲ | ၃၀ စက္ကန့် |
| D4 | Built-in ကို audio sting ပါမလား | မပါ |
| D5 | `paino` folder ကို နာမည်ပြောင်းမလား၊ alias နဲ့ထားမလား | alias (R2 မပြောင်း) |
| D6 | Page ၆ ခုလုံး တစ်ပြိုင်နက် ပြောင်းမလား၊ drum အရင်လား | drum အရင်၊ အောင်မှ ကျန် ၅ ခု (call-site ပြောင်းလဲမှု သေးငယ်) |

---

## 5. အဆင့်လိုက် လုပ်ငန်းစဉ်

> အရွယ်: **S** ≈ တစ်ရက်အတွင်း · **M** ≈ နှစ်ရက်ခန့် · **L** ≈ အပတ်ဝက်ခန့် (ခန့်မှန်းချက်သက်သက်)

### S0 — Diagnosis (S၊ coding မလို)
- အပေါ် §2 checklist ကို လုပ်၊ ရလဒ်ကို ဒီဖိုင်ရဲ့ Work log မှာ မှတ်။
- **အောင်မြင်စံ:** အကြောင်းရင်း (404 / timeout / CORS / codec) ကို ရွေးချယ်လို့ရ။

### S1 — Loader hardening (M)
- **ဖိုင်:** `website/assets/outro-video.js`
- **လုပ်စရာ:** §3.2 အတိုင်း — stall/first-byte timeout၊ retry၊ error အမျိုးအစား၊ progress callback၊ `paino`/`piano` alias၊ structured result။
- **Test အရင်:** `website/tests/outro-video.test.mjs` (mock `fetch`/stream) — slow-but-steady ၂၅ စက္ကန့် ဒေါင်း **အောင်**၊ ၂၀ စက္ကန့် byte မလာ **ကျ**၊ 404 → နောက် key၊ 500 → retry ၂ ကြိမ်၊ အကုန်ကျ → result မှာ reason ပါ။
- **အောင်မြင်စံ:** Test စိမ်း၊ အရင် behavior (cache/failureCache) မပျက်။

### S2 — Built-in ending (M)
- **ဖိုင်:** `outro-video.js` (သို့) `website/assets/builtin-ending.js` အသစ်
- **လုပ်စရာ:** §3.4 အတိုင်း canvas end card segment (segment contract)။
- **Test:** Segment `seconds` မှန်၊ `draw` က aspect ၃ မျိုး × style ၂ မျိုးမှာ exception မပစ်၊ golden frame နှိုင်း။
- **အောင်မြင်စံ:** Network မရှိဘဲ ending ထွက်။

### S3 — Policy + page ချိတ်ဆက် (L)
- **Drum page အရင်:** Preload (§3.3)၊ gate ထဲ "Thank You" ကို required အဖြစ် (R2 → built-in fallback)၊ D1 အတိုင်း စာသား၊ render report ထဲ `outro: { source, key, bytes, ms, attempts, reason }`။
- **ပြီးမှ** guitar/bass-guitar/piano/violin/metronome (call-site သေးငယ်)၊ ပြီးရင် `node tools/stamp-assets.mjs` ပြန် stamp။
- **အောင်မြင်စံ:** DevTools မှာ Worker host ကို block → ၆ page လုံး ending နဲ့ ပြီး၊ report မှာ `source: builtin` ပြ။

### S4 — Worker (M)
- **ဖိုင်:** `cloudflare-worker/src/index.ts`၊ README
- **လုပ်စရာ:** §3.5 အတိုင်း Range + 304 + cache + `ALLOWED_ORIGINS` စစ် (+ `/api/outro` ရွေးချယ်)။
- **Test:** Worker unit/integration (လက်ရှိ test မရှိ — မျိုးစေ့ အနည်းငယ်)၊ `curl` နဲ့ 206/304 စစ်။
- **အောင်မြင်စံ:** Range request က 206၊ ဒုတိယအကြိမ် 304၊ site origin က CORS ကောင်း။

### S5 — R2 clip ပြင်ဆင်ခြင်း (S–M၊ လက်စွဲ)
- Clip တိုင်းကို §3.6 spec အတိုင်း re-encode၊ upload၊ `ffprobe` နဲ့ အတည်ပြု၊ ဖိုင်ဆိုဒ်/နာမည် စာရင်းထုတ်။
- **အောင်မြင်စံ:** ဖိုင်တိုင်း ≤ ~၈ MB၊ browser တိုက်ရိုက်ဖွင့်ရ၊ loader က ၁၀ စက္ကန့်အတွင်း မျှော်မှန်းဒေါင်းရ။

### S6 — အပြည့်အစုံ စမ်းသပ်ခြင်း (M)
- **Unit:** S1/S2 test အကုန်။
- **Browser (chromium):** Network throttle (slow-3G)၊ R2 block၊ Worker 500၊ 404 → ဘယ်လိုပဲဖြစ်ဖြစ် ending ပါ။ `tools/test-video-engine-browser.mjs` ပုံစံ။
- **CI:** repo မှာ `.github/workflows` မရှိ — အနည်းဆုံး `node --test website/tests` နဲ့ browser test ကို push တိုင်း run။

### S7 — ထုတ်ဝေခြင်းနဲ့ စာရွက်စာတမ်း (S)
- Build → copy → `node tools/stamp-assets.mjs --check` (အရင် stale ဖြစ်ခဲ့)။
- `docs/VIDEO-ENGINE.md` ကို outro fallback နဲ့ update၊ ဒီ plan ကို status လိုက်ပြင်။

---

## 6. Definition of Done

- [ ] R2 ကို block လုပ်ထားလည်း **page ၆ ခုလုံး** export က ending နဲ့ပဲ ပြီး
- [ ] R2 slow-3G မှာ clip ကို ဒေါင်းရ (သို့) ၃၀ စက္ကန့်အတွင်း built-in သို့ ပြောင်း
- [ ] 404 မ retry၊ 5xx/timeout retry ၂ ကြိမ်၊ error အမျိုးအစား မှန်
- [ ] Render report/UI မှာ `source: r2 | builtin` နဲ့ အကြောင်းရင်း ပြ
- [ ] Worker `/assets/shared/*` က Range (206) နဲ့ 304 ကိုင်၊ CORS မှန်
- [ ] R2 clip အားလုံး spec (≈၈ MB၊ H.264/AAC/faststart) ကိုက်
- [ ] Unit + browser test စိမ်း၊ `stamp-assets --check` စိမ်း
- [ ] Docs (`VIDEO-ENGINE.md`၊ ဒီ plan) update

---

## 7. အန္တရာယ်များ

| အန္တရာယ် | ကာကွယ်ပုံ |
|---|---|
| Built-in က R2 clip ထက် မလှလို့ မကြိုက် | D2 မှာ မင်းဒီဇိုင်းသတ်မှတ်၊ R2 ကောင်းရင် R2 ကို အမြဲ ဦးစားပေး |
| Preload က bandwidth/Worker request တိုးစေ | Aspect+style နဲ့ တိုက်ဆိုင်တာတစ်ခုပဲ ဒေါင်း၊ blob ကို cache၊ kit/aspect ပြောင်းရင် ဖျက် |
| ၆ page မှာ call-site ကွဲလွဲမှု | drum အရင်၊ အတူတူ pattern ကို ကူး၊ test ကို page တိုင်းမှာ |
| Worker deploy လမ်းကြောင်း မသိ (H5) | S0 မှာ အရင်အတည်ပြု |
| Ending ကာလ တိုးလို့ video ရှည်လာ | ၃ စက္ကန့်ပဲ၊ ကာလကို report ထဲ ပြ |
| `paino` စာလုံးပေါင်းကြောင့် ဘာသာပြန်/ရှာဖွေရ ရှုပ် | alias ကို loader မှာ တစ်နေရာတည်း၊ ဒီ plan မှာ မှတ် |

---

## 8. Work log

| ရက်စွဲ | အဆင့် | ဘာလုပ်ခဲ့လဲ | ရလဒ် / ဆုံးဖြတ်ချက် |
|---|---|---|---|
| | S0 | | |
| | | | |

*Log ကို အဆင့်တစ်ခုပြီးတိုင်း ဖြည့်ပါ၊ ဆုံးဖြတ်ချက် D1–D6 ကိုလည်း ဒီမှာ မှတ်ပါ။*


## 9. Repository-specific continuation — ဆက်ရေးထားသော implementation plan

### 9.1 လက်ရှိ code နဲ့ plan ကွာခြားချက်

လက်ရှိ `website/assets/outro-video.js` သည် R2 clip ကို fetch → ArrayBuffer → Blob → object URL → HTMLVideoElement အဖြစ် ပြင်ဆင်ပြီး metadata decode လုပ်ပေးနိုင်သည်။ Success cache နှင့် 30-second failure cache ရှိပြီး 404 နှင့် unavailable failure ကို `lastFailure()` မှတစ်ဆင့် ခွဲခြားနိုင်သည်။ သို့သော် R2 clip မရသောအခါ လက်ရှိ production pages များသည် built-in ending မသုံးသေးဘဲ outro မပါဘဲ ဆက် render နိုင်သေးသည်။ ထို့ကြောင့် attached plan ရဲ့ အဓိက gap သည် **fallback ending မရှိသေးခြင်း** ဖြစ်သည်။

လက်ရှိ repository တွင် Drum, Guitar, Bass Guitar, Piano နှင့် Violin page များကို rollout scope အဖြစ် လက်ခံထားပြီး Metronome သည် attached plan ထဲတွင် သီးခြား sixth page အဖြစ် ပါဝင်နေသည်။ Metronome page ၏ actual current integration ကို S0 inventory တွင် အရင်စစ်ပြီးမှ page count နှင့် call-site migration ကို အတည်ပြုရမည်။

### 9.2 ဆက်လုပ်မည့် အဆင့်များ

**S0 — Diagnosis freeze.** Coding မပြုမီ လက်ရှိ Worker endpoint ကို 404, 5xx, timeout, CORS နှင့် valid clip အခြေအနေများအလိုက် စမ်းသပ်ပြီး status, response headers, bytes, metadata duration, codec နှင့် failure classification ကို evidence JSON ထဲ မှတ်တမ်းတင်မည်။ Worker deploy source နှင့် repository source တူ/မတူကိုလည်း commit hash သို့မဟုတ် deployment version ဖြင့် မှတ်မည်။ S0 ရလဒ်မပြည့်စုံလျှင် S1 ကို မစရ။

**S1 — Loader hardening.** `outro-video.js` တွင် first-byte timeout, stall timeout, total timeout, retry/backoff, `paino`/`piano` alias, structured result နှင့် progress callback ကို ထည့်မည်။ Existing successful cache နှင့် short-lived failure cache မပျက်စေရ။ Stream response မရသော environment များအတွက် `arrayBuffer()` fallback ကို ထားမည်။ 404/403 သည် alias/next key သို့သာ ဆက်ပြီး retry မလုပ်ရ။

**S2 — Built-in ending.** `builtin-ending.js` သို့မဟုတ် `outro-video.js` ထဲတွင် same-origin logo/font ဖြင့် canvas segment ထည့်မည်။ Segment သည် 3 seconds, fade-in 0.4 seconds ဖြစ်ပြီး 16:9, 9:16, 1:1 နှင့် black/white style ခြောက်မျိုးလုံးကို deterministic အဖြစ် ဆွဲနိုင်ရမည်။ R2 network မရှိသောအခြေအနေတွင်လည်း ဒီ segment တစ်ခုတည်းဖြင့် export ပြီးရမည်။

**S3 — Policy and page integration.** R2 clip ကို first choice အဖြစ်ထားပြီး load မအောင်မြင်လျှင် dialog မမေးဘဲ built-in segment သို့ fallback လုပ်မည်။ Result/report တွင် `outro.source` ကို `r2` သို့မဟုတ် `builtin` အဖြစ်၊ `key`, `bytes`, `ms`, `attempts`, `reason` နှင့် `duration` ဖြင့် မှတ်မည်။ Page အားလုံးတွင် “without Thank You” success path ကို ဖယ်ရှားပြီး built-in fallback မရမှသာ render ကို ရပ်မည်။

**S4 — Worker improvements.** S0 မှာ Worker source/deploy mismatch သို့မဟုတ် performance issue အတည်ပြုမှသာ Worker ပြင်မည်။ Range 206, ETag/304, cache headers နှင့် CORS ကို unit/integration test ဖြင့် အတည်ပြုမည်။ Worker ပြင်ဆင်မှုသည် fallback ending မစောင့်ဘဲ သီးခြား commit ဖြစ်ရမည်။

**S5 — R2 asset quality.** Clip အားလုံးကို H.264/yuv420p, AAC, faststart, ≤1080p, 30fps, ~8MB အောက် စံနှုန်းဖြင့် ffprobe စစ်မည်။ R2 naming manifest ထုတ်ပြီး `paino` legacy spelling နှင့် `piano` alias ကို အထူးစစ်မည်။

**S6 — Test and CI.** Unit tests သည် slow-but-steady stream, stalled stream, 404, 403, 429, 500, CORS, codec failure, alias, cache နှင့် structured result ကို စစ်မည်။ Browser test သည် ၅/၆ pages × 3 aspects × 2 styles တွင် valid R2, blocked R2, 404, Worker 500 နှင့် slow response အခြေအနေများကို စစ်မည်။ အခြေအနေအားလုံးတွင် final segment ရှိ/မရှိကို encoded output metadata သို့မဟုတ် sampled frames ဖြင့် အတည်ပြုမည်။

**S7 — Documentation and release.** `docs/VIDEO-ENGINE.md`, `Doc/rollout/README.md`, ဒီ `Plan.md` နှင့် consolidated delivery plan တို့ကို source/CI/evidence နဲ့ ကိုက်ညီအောင် update လုပ်ပြီး asset stamp check နှင့် GitHub Actions အောင်မြင်မှသာ release ပြုလုပ်မည်။

### 9.3 အတည်ပြုစရာများ — default decision record

User က သီးခြားပြောင်းလဲမပြောသေးသရွေ့ ဒီ plan သည် အောက်ပါ default များကို အသုံးပြုမည်။ R2 clip ရလျှင် R2 ကို သုံးမည်။ R2 မရလျှင် built-in ending ကို အလိုအလျောက်သုံးမည်။ Built-in ending သည် 3 seconds ဖြစ်ပြီး “Thank you for watching” နှင့် site URL ပါမည်။ Built-in ending တွင် audio sting မပါ။ `paino` folder ကို R2 မပြောင်းဘဲ loader alias ဖြင့် ကိုင်တွယ်မည်။ Drum ကို reference implementation အဖြစ် အရင်ပြီးမှ ကျန် page များသို့ ကူးမည်။

### 9.4 New acceptance gates

- [ ] R2 ကို block လုပ်ထားသော်လည်း export output ၏ နောက်ဆုံး 3 seconds တွင် built-in Thank You ending ပါရမည်။
- [ ] R2 valid clip ရသောအခါ output ၏ ending သည် R2 source ဖြစ်ရမည်။
- [ ] 404/403 နှင့် timeout/5xx ကို report တွင် သီးခြား reason အဖြစ် ပြရမည်။
- [ ] R2 failure ဖြစ်သောကြောင့် “no Thank You clip” ဟု success မပြရ။
- [ ] `outro.source` သည် `r2` သို့မဟုတ် `builtin` ဖြစ်ရမည်၊ `null` မဖြစ်ရ။
- [ ] 16:9, 9:16, 1:1 နှင့် black/white style အားလုံးတွင် built-in frame မပျက်ရ။
- [ ] Preview/export နှင့် repeated render တွင် built-in ending frame များ deterministic ဖြစ်ရမည်။
- [ ] Worker ပြင်ဆင်မှုရှိပါက Range, 304, CORS နှင့် cache test evidence ပါရမည်။
- [ ] Unit, browser, encoded-output smoke test နှင့် CI အားလုံး အောင်ရမည်။

### 9.5 Work log — integrated plan

| ရက်စွဲ | အဆင့် | မှတ်တမ်း | အခြေအနေ |
|---|---|---|---|
| 2026-11-11 | Plan integration | User ပေးထားသော `PLAN-thank-you-outro.md` ကို `Plan.md` နှင့် `Doc/PLAN-thank-you-outro.md` ထဲ ပေါင်းစည်းပြီး repository-specific continuation ထည့်ထားသည်။ | ပြီး |
| 2026-11-11 | S0 | လက်ရှိ `outro-video.js`, page call-sites, existing outro unit test နှင့် five-page rollout ကို code-level inventory လုပ်ထားသည်။ Live Worker/R2 diagnosis မစရသေး။ | တစ်စိတ်တစ်ပိုင်း |
| — | S1–S7 | Loader hardening, built-in ending, page policy, Worker, R2 assets, browser tests, release docs | `ready` အတည်ပြုချက် စောင့်နေ |

### 9.6 Plan boundary

ဒီ plan သည် R2 clip ကို ပို့တင်မည့် cache/custom-domain architecture၊ general export pinning၊ GLB license နှင့် Piano hand calibration ကို မပြောင်းပါ။ Built-in ending ၏ network-independent guarantee ကိုပဲ အဓိကထားမည်။ User က `ready` ဟု အတည်ပြုပြီးမှ S0 evidence စုဆောင်းခြင်း၊ ထို့နောက် S1/S2 ကို တစ်ဆင့်ချင်း စတင်မည်။


## 10. မရေးရသေးသော technical contract များ

### 10.1 Outro state machine

Outro selection ကို page တစ်ခုချင်းစီက ကိုယ်ပိုင်ဆုံးဖြတ်ခြင်းမပြုဘဲ shared module က state machine တစ်ခုတည်းဖြင့် ဆုံးဖြတ်ရမည်။ အစအခြေအနေသည် `idle` ဖြစ်ပြီး preload စတင်လျှင် `loading`၊ valid R2 clip နှင့် metadata ရလျှင် `r2-ready`၊ 404/403 သို့မဟုတ် retry မကျန်တော့သော unavailable ဖြစ်လျှင် `builtin-ready`၊ built-in resource မရလျှင် `failed` ဖြစ်ရမည်။ Render စတင်ချိန်တွင် `r2-ready` သို့မဟုတ် `builtin-ready` မဟုတ်ပါက gate က state ကို စောင့်ပြီး timeout ပြည့်လျှင် built-in path သို့ တစ်ကြိမ်တည်း fallback လုပ်ရမည်။ `failed` သာလျှင် render မစရ။

State transition များသည် တစ်ကြောင်းတည်းဖြစ်ရမည်။ `r2-ready → builtin-ready` သည် R2 decode/seek ပျက်မှသာ ခွင့်ပြုမည်။ `builtin-ready → r2-ready` ကို render အလယ်တွင် မလုပ်ရ။ Render စတင်ပြီးသောအခါ outro source ကို lock လုပ်ထားရမည်၊ ဒါမှ frame တစ်ခုနှင့်တစ်ခု source မပြောင်းနိုင်တော့ဘဲ encoded output deterministic ဖြစ်မည်။

### 10.2 Shared result contract

`loadOutro()` နှင့် built-in factory နှစ်ခုစလုံးသည် အောက်ပါပုံစံနှင့် သဟဇာတဖြစ်သော object ပြန်ပေးရမည်။

```js
{
  source: 'r2' | 'builtin',
  key: string | null,
  seconds: number,
  bytes: number,
  ms: number,
  attempts: number,
  reason: null | 'not-found' | 'forbidden' | 'timeout' | 'http-5xx' |
    'http-429' | 'network' | 'cors' | 'codec' | 'builtin-fallback',
  video: HTMLVideoElement | null,
  audio: (offlineContext) => Promise<AudioBuffer | null>,
  draw: (ctx, canvas, seconds) => boolean
}
```

R2 result တွင် `video` နှင့် object URL ရှိနိုင်သော်လည်း built-in result တွင် `video: null` ဖြစ်ရမည်။ `draw()` သည် canvas ကို clear မလုပ်ဘဲ caller က frame policy ကို ထိန်းထားရမည်။ Built-in audio မပါသည့်အတွက် `audio()` သည် `null` ပြန်နိုင်ပြီး `VideoEngine.joinAudio()` က အဲဒီ segment ကို အလိုအလျောက်ကျော်နိုင်ရမည်။

### 10.3 Report schema တိုးချဲ့မှု

လက်ရှိ render report ထဲတွင် outro အတွက် အောက်ပါ nested object ကို ထည့်ရမည်။

```json
{
  "outro": {
    "source": "r2",
    "key": "Thank Video/16x9/drum/16x9 Black Drum.mp4",
    "seconds": 3.0,
    "bytes": 7340032,
    "ms": 842,
    "attempts": 1,
    "reason": null,
    "fallback": false,
    "state": "r2-ready"
  }
}
```

R2 မရ၍ built-in သုံးသောအခါ `source: "builtin"`, `key: null`, `fallback: true` နှင့် မူလ failure ကို `reason` တွင် ထားရမည်။ Built-in ကိုယ်တိုင် failure ဖြစ်ပါက `outro` မဖျောက်ဘဲ `state: "failed"` နှင့် failure reason ကို report လုပ်ပြီး render မစရ။ UI တွင် `R2 clip loaded`, `R2 unavailable — built-in ending used`, သို့မဟုတ် `Ending unavailable — render blocked` ဟူသော အခြေအနေသုံးမျိုးကိုသာ ပြရမည်။

### 10.4 Cache ownership နှင့် cleanup

R2 blob/object URL၊ decoded audio buffer နှင့် built-in image/font resource တို့၏ owner သည် shared outro module ဖြစ်ရမည်။ Page call-site များက object URL ကို ကိုယ်တိုင် revoke မလုပ်ရ။ Aspect/style/kind ပြောင်းလဲသည့်အခါ မသုံးတော့သော R2 clip ကို release လုပ်ပြီး၊ render ပြီးဆုံးသောအခါ သို့မဟုတ် cancel လုပ်သောအခါ locked source ကို `finally` မှာ release လုပ်ရမည်။ Success cache ကိုသာ ပြန်သုံးခွင့်ရှိပြီး failure cache သည် diagnosis အတွက် 30 seconds ထက် မကျော်ရ။

## 11. မရေးရသေးသော test matrix

### 11.1 Loader unit matrix

| Case | Expected request behavior | Expected result |
|---|---|---|
| exact R2 200 | one request, metadata decode | `source: r2` |
| first key 404, alias 200 | no retry on 404; next key only | `source: r2`, attempts recorded |
| 403 | no retry of same key | alias/next key or builtin |
| 429 | two retries with backoff | R2 or builtin with `http-429` |
| 500/502 | two retries with backoff | R2 or builtin with `http-5xx` |
| slow steady stream | no stall failure while bytes arrive | R2 if total limit allows |
| stalled stream | abort at stall timeout | builtin with `timeout` |
| CORS rejection | no blind retry | builtin with `cors` |
| valid bytes, undecodable video | release object URL | builtin with `codec` |
| repeated same request | success cache hit | no duplicate network request |
| repeated failure | short failure-cache hit | no permanent failure cache |

### 11.2 Built-in rendering matrix

Built-in ending ကို `16x9`, `9x16`, `1x1` aspect သုံးမျိုး၊ `black`, `white` style နှစ်မျိုး၊ `drum`, `guitar`, `piano`, `violin`, `bass-guitar`, `metronome` kind များဖြင့် စမ်းရမည်။ စမ်းသပ်မှုသည် exception မပစ်ခြင်းသာမက canvas အလွတ်မဖြစ်ခြင်း၊ logo/text bounds သတ်မှတ်ထားသော safe area အတွင်းရှိခြင်း၊ fade-in frame 0 တွင် alpha နည်းခြင်းနှင့် final frame တွင် alpha အပြည့်ရှိခြင်းကို စစ်ရမည်။ Golden image သည် exact pixel equality မလိုသော်လည်း logo/text bounding box နှင့် background color ကို သတ်မှတ်ထားသော tolerance အတွင်း စစ်ရမည်။

### 11.3 Browser export matrix

| Environment event | Required behavior |
|---|---|
| R2 host blocked before render | gate chooses builtin; export succeeds |
| Worker returns 404 | alias/search completes; builtin if none |
| Worker returns 500 | retry policy visible; builtin fallback |
| network offline after preload | cached source locks; export succeeds |
| network offline before preload | builtin fallback; export succeeds |
| resize during outro render | pin guard stops clearly or output remains stable; no silent missing ending |
| cancel during outro | cleanup runs; next export can load a fresh ending |
| second export on same page | no duplicate media-element-source error; ending present |
| 150%/200% browser zoom | built-in geometry follows pinned frame, not window |

## 12. Rollout checkpoints နှင့် အထောက်အထား

Checkpoint တစ်ခုချင်းစီတွင် code commit, test command, result JSON နှင့် short human-readable note လေးခု ရှိရမည်။ S0 တွင် `outro-diagnosis.json` နှင့် direct-response notes၊ S1 တွင် `outro-loader-unit.json`၊ S2 တွင် `builtin-ending-golden.json` နှင့် sample PNG များ၊ S3 တွင် page-by-page fallback JSON၊ S4 တွင် Worker curl output၊ S5 တွင် `r2-outro-manifest.json`၊ S6 တွင် browser matrix JSON နှင့် S7 တွင် final CI URL ကို သိမ်းရမည်။

Drum ကို reference page အဖြစ် စမ်းသပ်ရာတွင် R2 success path နှင့် R2 blocked path နှစ်ခုလုံး pass ပြီးမှ guitar/bass-guitar/piano/violin သို့ ကူးရမည်။ Metronome page သည် S0 inventory ပြီးမှ scope ထဲ ထည့်/မထည့်ကို အတည်ပြုမည်။ Page တစ်ခုချင်းစီအတွက် `outro.source`, `outro.reason`, ending duration နှင့် final frame status ကို evidence table ထဲတွင် တစ်ကြောင်းစီ မှတ်ရမည်။

## 13. Rollback နှင့် failure containment

Loader hardening သည် built-in fallback မပါသေးချိန်တွင် production page behavior ကို မပြောင်းရ။ S1 commit ကို S2 မပြီးမချင်း feature flag သို့မဟုတ် `OUTRO_FALLBACK_ENABLED` configuration ဖြင့် ပိတ်နိုင်ရမည်။ S3 integration တွင် page တစ်ခုက error ပြလျှင် အခြား page များကို မထိခိုက်စေရန် shared module API ကို backward-compatible ထားပြီး၊ page migration ကို page တစ်ခုချင်း commit ခွဲထားရမည်။

Built-in renderer တွင် exception ဖြစ်လျှင် R2 path ကို ဖျက်မပစ်ရ။ R2 valid ဖြစ်နေသော်လည်း built-in test မစိမ်းလျှင် S2/S3 release မပြုရ။ Worker Range/304 ပြင်ဆင်မှုသည် R2 fallback နှင့် မသက်ဆိုင်သဖြင့် Worker deploy ပြဿနာဖြစ်လျှင် client-side built-in ending path ကို rollback မလုပ်ဘဲ Worker-only change ကို ပြန်လှန်နိုင်ရမည်။

## 14. User approval gate နှင့် လက်ရှိအခြေအနေ

လက်ရှိအခြေအနေမှာ plan နှင့် technical continuation သာ ပြီးထားပြီး coding မစရသေးပါ။ အောက်ပါ approval တစ်ကြောင်းရမှ S0 diagnosis ကို စတင်မည်။

> **“Thank You outro plan အတိုင်း S0 ကို စပါ”**

အတည်ပြုချက်ရပြီးနောက် S0 diagnosis ကို အရင်လုပ်ပြီး result ကို plan work log ထဲ ဖြည့်မည်။ S0 ပြီးလျှင် loader hardening သို့ တန်းမသွားဘဲ diagnosis result နှင့် အညီ လိုအပ်သည့် S1/S2 order ကို ပြန်တင်ပြမည်။


## 15. File-by-file implementation map

ဒီအပိုင်းသည် S1–S7 တစ်ခုချင်းစီတွင် ဘယ်ဖိုင်ကို ဘာကြောင့်ပြင်ရမည်ဆိုတာ သတ်မှတ်ပေးသည်။ တူညီသော logic ကို instrument page ခြောက်ခုထဲတွင် copy/paste မလုပ်ရ။

| ဖိုင် | တာဝန် | ပြင်ဆင်ရမည့်အကြောင်းအရာ |
|---|---|---|
| `website/assets/outro-video.js` | shared loader/segment adapter | retry, timeout, alias, structured result, progress, fallback handoff, release |
| `website/assets/builtin-ending.js` | offline fallback | deterministic canvas ending, logo selection, text, fade, segment contract |
| `website/assets/render-report.js` | diagnostics | `outro` object, source/reason, fallback warning and timings |
| `website/assets/video-engine.js` | render boundary | zero-audio segment, segment duration, final-frame sampling and cancellation behavior ကို အတည်ပြုရန်သာ; မလိုလျှင် မပြင် |
| `website/video-create/drum/index.html` | reference integration | preload/gate/policy/report ကို ပထမဆုံးချိတ်မည့် page |
| `website/video-create/guitar/index.html` | page integration | drum pattern အတိုင်း call-site သေးသေးပဲ ပြင် |
| `website/video-create/bass-guitar/index.html` | page integration | guitar နှင့်တူညီသော kind mapping ကို အတည်ပြု |
| `website/video-create/piano/index.html` | page integration | MusicXML-only flow မပျက်စေဘဲ outro fallback ချိတ် |
| `website/video-create/violin/index.html` | page integration | `paino` legacy key နှင့် UI instrument name မရောစေ |
| `website/video-create/metronome/index.html` | scope decision | S0 inventory ပြီးမှ existing call-site ရှိပါက ချိတ်; မရှိပါက plan မှာ excluded အဖြစ်မှတ် |
| `cloudflare-worker/src/index.ts` | transport | S0 က issue ပြမှ Range/304/CORS ပြင် |
| `cloudflare-worker/README.md` | deployment contract | route, cache, CORS, R2 key encoding နှင့် deploy source မှတ်တမ်း |
| `docs/VIDEO-ENGINE.md` | public render contract | R2-first/builtin-second behavior နှင့် report schema |
| `tools/test-outro-video.mjs` | unit | loader state/retry/cache/failure tests |
| `tools/test-builtin-ending.mjs` | unit/visual | six style/aspect combinations and deterministic frame tests |
| `tools/test-outro-rollout-browser.mjs` | browser | blocked R2 and fallback ending output across pages |
| `.github/workflows/notation-and-video.yml` | CI | new unit/browser/evidence checks |
| `Doc/rollout/evidence/` | evidence | diagnosis, fallback, Worker and final matrix artifacts |

Shared modules must expose browser-safe APIs only. They must not import page DOM IDs, instrument-specific CSS classes, or the Piano/MIDI/notation engines.

## 16. Exact API surface to freeze before coding

### 16.1 Key and URL helpers

```js
OutroVideo.keys({ aspect, kind, style, aliases })
// returns ordered, de-duplicated R2 keys

OutroVideo.url(apiBase, key)
// returns encoded /assets/shared/<key> URL
```

The key helper must preserve spaces as URL-encoded path components, preserve case in the filename, and never concatenate a raw user-provided path without segment encoding. The ordered list must be visible in the diagnostic result so a 404 can say which keys were tried.

### 16.2 R2 loader

```js
await OutroVideo.loadOutro(apiBase, {
  aspect,
  kind,
  style,
  signal,
  onProgress,
  timeout,
  retry
})
```

`signal` must cancel fetch, metadata wait, and any pending retry. Cancellation is not classified as a server outage; the caller receives an aborted result or exception that the export controller can handle. `onProgress` receives `{ loaded, total, attempt, key }`, with `total: null` when the server does not send Content-Length.

### 16.3 Built-in factory

```js
await OutroVideo.createBuiltin({
  aspect,
  kind,
  style,
  siteUrl,
  duration: 3,
  fadeIn: 0.4
})
```

The built-in factory must not call fetch. It may wait for already-declared same-origin fonts, but a missing optional font must fall back to a system font rather than making a network request. The returned segment must implement the same `seconds`, `draw`, and optional `audio` contract accepted by `VideoEngine.render`.

### 16.4 Policy helper

```js
await OutroVideo.resolve(apiBase, {
  aspect,
  kind,
  style,
  siteUrl,
  signal,
  onState,
  onProgress
})
```

`resolve()` is the only function page call-sites should use. It tries R2, records the failure if needed, creates the built-in segment, and returns a source-locked result. Page code must not call `loadOutro()` and `createBuiltin()` separately because that would allow inconsistent fallback decisions.

## 17. Asset naming and alias matrix

| UI kind | Primary folder | Primary filename word | Legacy/alternate lookup | Note |
|---|---|---|---|---|
| drum | `drum` | `Drum` | none | reference asset |
| guitar | `guitar` | `Guitar` | drum fallback only if policy permits | guitar page |
| bass-guitar | `guitar` | `Guitar` | `bass-guitar` only if separately uploaded | attached plan's existing behavior |
| piano | `paino` | `Paino` | `piano` / `Piano` | preserve current R2 spelling, alias in loader |
| violin | `paino` | `Paino` | `violin` / `Violin` | verify whether shared piano outro is intentional |
| metronome | `metronome` | `Metronome` | drum fallback only if approved | S0 scope check |

Fallback to another instrument's clip must be recorded as `fallbackKind` in the result. It must not be silently presented as the requested instrument's branded clip. If the product decision is that only same-kind clips are acceptable, the key list must stop after same-kind aliases and proceed directly to built-in.

Before S3, the plan must resolve whether `bass-guitar` may use the `guitar` clip and whether `violin` may use the `paino` clip. The current code does this by outward key search; the new report must make that choice visible.

## 18. Built-in ending visual and typography specification

The built-in ending must be a product fallback, not a debug card. The frame background uses the selected style's same background color as the page. The logo is centered on the primary axis, preserves its intrinsic aspect ratio, and occupies no more than 42% of the shorter frame side. The text block begins below the logo with a safe gap of at least 4% of the shorter side.

The title text is exactly `Thank you for watching` unless a future product decision changes it. The site URL is a separate smaller line and must be supplied from configuration; a fake or stale URL must never be hard-coded into the fallback. Until the owner supplies the production URL, the plan records `siteUrl: null` and the URL line is omitted rather than showing a placeholder.

Black style uses light logo/text; white style uses dark logo/text. The logo asset mapping must be explicit and same-origin. If a requested instrument logo does not exist, the fallback must use the shared site logo and report `logoFallback: true`. The built-in frame must not depend on R2 kit assets, uploaded MusicXML, uploaded audio, or a cross-origin image.

The fade function is deterministic: for `at < fadeIn`, alpha is `smoothstep(0, fadeIn, at)`; for later frames alpha is 1. The frame at `at = 0` and the frame at `at = duration - 1/fps` are golden fixtures. Canvas coordinates are derived from the supplied canvas dimensions, never from `window.innerWidth`, CSS pixels, or the live preview rectangle.

## 19. Worker request/response contract

For a successful full response, the Worker must return the R2 object's content type, a stable `ETag`, `Last-Modified` when available, `Content-Length` when known, `Accept-Ranges: bytes`, and an explicit `Access-Control-Allow-Origin` matching the requesting site origin. `Vary: Origin` is required when the response varies by origin.

For a valid Range request, the Worker must return `206 Partial Content`, `Content-Range`, the requested byte length, and the same CORS/cache policy. For `If-None-Match` with a matching tag, it must return `304` with no body. A missing object must return JSON containing `{ error: "not-found", key, requestId }`; upstream or R2 failures must return `{ error: "unavailable", key, requestId }` without leaking credentials or bucket internals.

The Worker must reject path traversal, decode keys once only, and avoid turning `%2F` inside a filename into an unintended folder separator. Logs must include requestId, key hash or safe key, status, duration, bytes, cache outcome and failure category. Raw user file names and authorization headers must not be logged.

## 20. Performance, memory and security budgets

- Built-in ending creation: under 50 ms for a single frame on the acceptance browser.
- Built-in per-frame draw: under 2 ms at 1920×1080 after logo/font preparation.
- R2 clip target: approximately 8 MB or less per asset; the loader must not keep more than the current source plus one replacement source alive.
- Object URL lifetime: from successful blob creation until render completion/cancellation; revoke in `finally`.
- Retry budget: two retries for each candidate key; total resolve time must respect the configured 30-second preload deadline and 120-second absolute gate deadline.
- Built-in path must work with network disabled after page assets have loaded.
- Do not place R2 secrets, Worker tokens, signed URLs, or raw upload bytes in the report or console.
- Do not use `innerHTML` with the site URL or server-provided error text; set text through DOM text APIs.
- A user cancellation must abort pending fetches and release video/audio resources without leaving a permanent failure cache entry.

## 21. Accessibility and UI behavior

The Asset Gate panel must expose status through text, not color alone. Each state needs a stable label and optional detail: `Loading`, `Ready — R2`, `Fallback — built-in`, or `Blocked`. Retry progress must not make the Render button appear enabled before the source is locked.

When built-in fallback is selected, the UI should show a non-blocking warning near the Generate button and include the same warning in the report. The warning must not require a confirmation dialog under the default D1 decision. Keyboard users must be able to reach Copy report, Download report, Retry, Generate, and Cancel controls in that order. The panel must not shift the pinned export frame geometry.

Screen-reader status updates should use one `aria-live="polite"` region and should not announce every downloaded byte. Announce only state transitions and final reason. The error message must name the category and next action, for example: `R2 outro unavailable (500); built-in ending selected.`

## 22. Migration order and commit boundaries

1. **Plan-only checkpoint:** freeze decisions and obtain `ready` approval. No runtime behavior changes.
2. **S0 diagnosis commit:** evidence and read-only diagnostic scripts only.
3. **S1 loader commit:** shared loader tests must pass; pages still use the old optional policy.
4. **S2 built-in commit:** built-in unit/golden tests must pass with no page call-site changes.
5. **S3 Drum commit:** Drum is the only page switched to required outro with automatic fallback.
6. **S3 remaining-page commits:** Guitar, Bass Guitar, Piano, Violin, and Metronome only after their page-specific inventory passes.
7. **S4 Worker commit:** transport changes separate from client fallback.
8. **S5 asset/evidence commit:** manifest, ffprobe output, and naming corrections.
9. **S6 CI commit:** browser matrix and encoded-output assertions.
10. **S7 docs/release commit:** public docs, plan status, stamp check, and final links.

Every commit must leave the repository runnable. A commit that changes the result schema must update its unit fixture in the same commit. A page migration must include that page in the browser matrix in the same commit.

## 23. Final sign-off checklist

Before marking this plan complete, the following evidence must exist and be linked from the work log:

- [ ] S0 diagnosis identifies the actual current R2/Worker behavior.
- [ ] All open decisions D1–D6 have a recorded choice or an explicit owner-provided value.
- [ ] `siteUrl` is either supplied and tested or intentionally omitted from the built-in card.
- [ ] Loader API and result schema are frozen and unit-tested.
- [ ] Built-in ending golden frames exist for all six aspect/style combinations.
- [ ] Same-kind/alias/fallback-kind behavior is visible in reports.
- [ ] Drum fallback path passes with R2 blocked.
- [ ] Every in-scope page passes fallback and R2-success paths.
- [ ] Metronome scope is resolved from actual code, not assumed from the attachment.
- [ ] Worker Range/304/CORS behavior is evidenced if S4 is implemented.
- [ ] R2 clip manifest and ffprobe results are committed or linked.
- [ ] Memory/object URL/cancellation tests pass.
- [ ] Accessibility status and keyboard path are checked.
- [ ] CI runs every new unit/browser test.
- [ ] `docs/VIDEO-ENGINE.md`, `Doc/rollout/README.md`, `Doc/PLAN-thank-you-outro.md`, and root `Plan.md` agree.
- [ ] Final output always contains a visible Thank You ending or render is explicitly blocked; there is no silent no-outro success.

### Current plan status

Sections 15–23 complete the remaining written specification. The plan is now implementation-ready but remains **not started** until the approval gate in Section 14 is satisfied. The next action after approval is S0 diagnosis, not S1 coding.


## 24. S0 Diagnosis ပြီးစီးမှု မှတ်တမ်း — 2026-11-11

S0 ကို coding မပြုဘဲ live Worker/R2 probe၊ repository source inspection၊ representative clip download နှင့် `ffprobe` ဖြင့် ပြီးစီးအောင် စစ်ဆေးခဲ့သည်။ Evidence အပြည့်အစုံကို [`Doc/rollout/evidence/outro-diagnosis.json`](./Doc/rollout/evidence/outro-diagnosis.json) တွင် သိမ်းထားသည်။ စစ်ဆေးမှုသည် repository commit `3b08d4a` အပေါ် လုပ်ထားပြီး runtime code မပြောင်းပါ။

### အတည်ပြုရလဒ်

- Known Drum clips သုံးခုသည် live Worker မှ `200 video/mp4` ပြန်ပြီး CORS သည် `Access-Control-Allow-Origin: *` ဖြစ်သည်။
- `16x9 Black Drum` သည် 1,173,124 bytes၊ 6.0 seconds ဖြစ်ပြီး H.264 High/yuv420p 1920×1080/30fps + AAC-LC audio ဖြစ်သည်။
- `16x9 White Drum` သည် 5,427,103 bytes၊ 6.016 seconds ဖြစ်ပြီး codec သည် browser-compatible sample နှင့် ကိုက်ညီသည်။
- `9x16 White Drum` သည် 5,431,237 bytes၊ 6.016 seconds ဖြစ်ပြီး H.264/yuv420p 1080×1920/30fps + AAC-LC ဖြစ်သည်။
- Missing key သည် `404` နှင့် JSON error body ပြန်သည်။ 404 retry မလုပ်သင့်ကြောင်း အတည်ပြုနိုင်သည်။
- `Range: bytes=0-1023` ကို live Worker က `206` မပြန်ဘဲ `200` နှင့် full object ပြန်သည်။ `Content-Range` မရှိပါ။
- Valid `If-None-Match` ဖြင့်လည်း `304` မပြန်ဘဲ `200` နှင့် full body ပြန်သည်။
- `16x9 Black Drum` timing sample တွင် total download 5.02 seconds ဖြစ်ပြီး 1.17 MB အတွက် လက်ရှိ 10-second client abort အောက်တွင်ပြီးနိုင်သည်။
- 5 MB ကျော်သော clips များသည် representative 20-second controlled probes တွင် partial bytes ဖြင့် timeout ဖြစ်နိုင်ကြောင်း ပြသသည်။ `16x9 White Drum` သည် 20 seconds အတွင်း 1,892,334/5,427,103 bytes သာ ရပြီး curl exit 28 ဖြစ်သည်။ အခြား 5 MB guitar/paino/violin samples များလည်း partial timeout တွေ့ရသည်။
- Sampled key matrix တွင် `paino` path သည် အချို့နေရာတွင် ရှိပြီး `piano` path သည် 404 ဖြစ်သည်။ Metronome path များသည် sampled combinations တွင် 404 ဖြစ်သည်။ ထို့ကြောင့် alias/fallback kind ကို report တွင် ဖော်ပြရန်လိုသည်။
- Downloaded clips များတွင် codec failure ကို မတွေ့ရသေးပါ။ H4 မအတည်ပြုနိုင်သေးသော်လည်း လက်ရှိ evidence အရ H1/H6 နှင့် H2 က ပိုအလေးထားရမည့်အကြောင်းရင်းများ ဖြစ်သည်။

### S0 diagnosis ဆုံးဖြတ်ချက်

S0 result သည် **H1/H6 transport/timeout risk ကို confirmed**, **H2 naming mismatch ကို confirmed**, **H3 GitHub Pages origin အတွက် မပျက်သော်လည်း wildcard CORS ကို confirmed**, **H4 codec failure မတွေ့**, **H5 deployed source အတည်မပြုနိုင်သော်လည်း live Worker သည် repository ၏ no-Range/no-304 behavior နှင့် ကိုက်** ဟု သတ်မှတ်သည်။

ထို့ကြောင့် နောက်တစ်ဆင့်သည် S1 loader hardening နှင့် S2 built-in ending ဖြစ်ရမည်။ Current 10-second full-body fetch ကို အားကိုးပြီး S3 page policy မပြင်ရ။ Worker Range/304/requestId ပြင်ဆင်မှုသည် အကျိုးရှိသော်လည်း S4 အဖြစ် client fallback နှင့် သီးခြားထားရမည်။

### မပြီးသေးသော S0 အကန့်အသတ်

Cloudflare dashboard/Worker observability မရသဖြင့် live deployment commit၊ R2 origin log နှင့် server-side intermittent error ကို မအတည်ပြုနိုင်သေးပါ။ Arbitrary Origin probe သည် connection ပိတ်သွားသဖြင့် origin rejection ဟု မဆုံးဖြတ်ထားပါ။ ffprobe တွင် faststart/moov placement ကို သီးခြားမစစ်ရသေးသောကြောင့် S5 asset verification ထဲတွင် ထည့်ရမည်။

### Work log update

| ရက်စွဲ | အဆင့် | ဘာလုပ်ခဲ့လဲ | ရလဒ် / ဆုံးဖြတ်ချက် |
|---|---|---|---|
| 2026-11-11 | S0 | Live Worker/R2 known key, missing key, OPTIONS, Range, If-None-Match, CORS, timing, clip download နှင့် ffprobe စစ်ဆေးပြီး JSON evidence သိမ်းခဲ့သည်။ | **ပြီး** — H1/H6 risk နှင့် H2 naming mismatch အတည်ပြု; S1/S2 ကို ဆက်သင့် |
| 2026-11-11 | S0 | `outro-diagnosis.json` ထဲတွင် source inspection, live probes, media metadata, matrix samples, limitations နှင့် recommendation မှတ်တမ်းတင်ခဲ့သည်။ | **ပြီး** |
| — | S1/S2 | Loader hardening နှင့် built-in ending | S0 result အပေါ်မူတည်၍ နောက်တစ်ဆင့် |

S0 diagnosis evidence ဖိုင်ကို ပြင်ပြီးသောအခါ plan ၏ S0 status သည် **complete** ဖြစ်သည်။ S1/S2 ကို စတင်ခြင်းသည် S0 ပြီးကြောင်းကို အတည်ပြုပြီးမှသာ လုပ်ရမည့် သီးခြားအဆင့် ဖြစ်သည်။


## 25. S1 Loader Hardening ပြီးစီးမှု မှတ်တမ်း — 2026-11-11

S1 ကို `website/assets/outro-video.js` တွင် shared loader တစ်ခုတည်းအဖြစ် အကောင်အထည်ဖော်ပြီးပါပြီ။ Page call-site များကို မပြောင်းဘဲ `loadOutro()` ၏ null/success behavior ကို ထိန်းထားပြီး success result နှင့် `lastFailure()` diagnostics ကို တိုးချဲ့ထားသည်။

### အကောင်အထည်ဖော်ပြီးသောအချက်များ

- First-byte timeout 15 seconds
- Byte မလာတော့သော stall timeout 15 seconds
- Candidate keys/retries အားလုံးအတွက် total deadline 120 seconds
- Metadata timeout 15 seconds
- HTTP 408/429/5xx၊ network၊ timeout၊ unavailable failure များကို initial attempt ပြီးနောက် retry နှစ်ကြိမ်
- Retry delay 0.5s/1.5s + jitter နှင့် retry request တွင် `cache: reload`
- Initial request တွင် `cache: no-store`
- 403/404/codec failure တွင် same key retry မလုပ်ဘဲ နောက် candidate သို့ ဆက်ခြင်း
- `response.body.getReader()` ရှိလျှင် streaming bytes ဖတ်ပြီး `onProgress({ loaded, total, attempt, key })` ပေးခြင်း
- Stream မရသော environment များအတွက် `arrayBuffer()` fallback
- `piano` ↔ `paino` alias ကို shared key helper တစ်နေရာတည်းတွင် ထည့်ခြင်း
- Success result တွင် `source: 'r2'`, `bytes`, `ms`, `attempts`, `reason` ထည့်ခြင်း
- Failure report တွင် `kind`, `status`, `key`, `attempts`, `ms`, `message` ထည့်ခြင်း
- Existing 30-second failure cache နှင့် successful cache behavior ထိန်းသိမ်းခြင်း

### စမ်းသပ်မှုရလဒ်

- `node --check website/assets/outro-video.js` — passed
- `node --check tools/test-outro-video.mjs` — passed
- `node tools/test-outro-video.mjs` — passed
- 404/403 no-retry — passed
- 500/network retry — passed
- streaming progress — passed
- piano/paino alias — passed
- first-byte timeout — passed
- structured success metadata — passed
- Drum browser acceptance — passed
- Cross-page browser acceptance — passed

အထောက်အထားကို [`Doc/rollout/evidence/outro-loader-s1.json`](./Doc/rollout/evidence/outro-loader-s1.json) တွင် သိမ်းထားသည်။ `docs/VIDEO-ENGINE.md` နှင့် `Doc/rollout/README.md` တွင် S1 contract ကို update လုပ်ထားသည်။

### S1 အပြီး မပြီးသေးသောအရာ

S1 သည် loader ကိုသာ ခိုင်မာစေခြင်းဖြစ်ပြီး R2 မရသောအခါ built-in Thank You ending အလိုအလျောက် ထုတ်ပေးခြင်း မပါသေးပါ။ ထို့ကြောင့် လက်ရှိ pages များတွင် R2 failure သည် optional/no-outro path အဖြစ် ရှိနေဆဲဖြစ်သည်။ အဲဒီအပိုင်းသည် S2 built-in ending နှင့် S3 page policy တွင် ဆက်လုပ်ရမည်။

S1 status: **complete**. Next planned step: **S2 — Built-in ending**.
