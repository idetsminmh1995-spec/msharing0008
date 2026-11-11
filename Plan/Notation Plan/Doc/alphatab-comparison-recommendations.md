# AlphaTab လေ့လာချက်နှင့် Notation Engine တိုးတက်ရေး အကြံပြုချက်

## အဓိကဆုံးဖြတ်ချက်

သင့် Notation Engine ရဲ့ အခြေခံ architecture က AlphaTab နဲ့ တော်တော်နီးစပ်ပြီးသားပါ။ နှစ်ခုလုံးမှာ semantic data model၊ importer/parser၊ engraving/layout၊ rendering နဲ့ playback-position ခွဲခြားထားပါတယ်။ AlphaTab က score ကို data model ထဲမှာ ထိန်းသိမ်းပြီး အဲဒီ model ကနေ visual tree နဲ့ MIDI playback data နှစ်မျိုးလုံး ထုတ်ပါတယ်။ [1] [2]

ဒါကြောင့် AlphaTab လိုဖြစ်အောင် အားလုံးကို ပြန်ရေးရန် မလိုပါ။ အကောင်းဆုံးလမ်းကြောင်းက လက်ရှိ `notation-engine` ရဲ့ အားသာချက်တွေ—SMuFL/Bravura metrics၊ SVG rendering၊ MusicXML/MIDI parser၊ tempo map၊ skyline collision avoidance၊ playback position API—အပေါ်မှာ AlphaTab ရဲ့ အောက်ပါ pattern တွေကို ထည့်ပေါင်းရန် ဖြစ်ပါတယ်။

1. Semantic model ကို rendering geometry နဲ့ ပိုမိုတိကျစွာ ခွဲခြားပြီး normalized event timeline တစ်ခု ထည့်ရန်။
2. Rendering bounds lookup၊ partial rendering နဲ့ worker-based processing ထည့်ရန်။
3. Format compatibility ကို feature count နဲ့ မတိုင်းဘဲ corpus + visual snapshot + diagnostic အဖြစ် စနစ်တကျတိုင်းရန်။
4. Playback ကို built-in audio မထည့်ဘဲ event/tick API အဖြစ် ပိုမိုခိုင်မာစေရန်။
5. Text font၊ lyrics၊ chord symbols၊ metadata marks တွေကို first-class rendering system အဖြစ် ဖြည့်စွက်ရန်။

## AlphaTab မှ သင်ယူသင့်တဲ့ architecture

AlphaTab ရဲ့ core hierarchy က `Score > Track > Staff > Bar > Voice > Beat > Note` ဖြစ်ပါတယ်။ `Beat` က တစ်ချိန်တည်းမှာ တီးမယ့် note တွေကို chord-like group အဖြစ် စုထားပြီး duration၊ tuplet၊ lyrics၊ grace notes၊ guitar effects စတဲ့ beat-level information ကို ကိုင်တွယ်ပါတယ်။ Data model က visual coordinate မသိဘဲ semantic information ကိုပဲ ထိန်းသိမ်းထားပါတယ်။ [2]

လက်ရှိ engine မှာ `Score > Part > Measure > Voice > Chord > Note` အလားတူအဆင့်တွေ ရှိပြီးသားဖြစ်လို့ အခြေခံဆုံးဖြတ်ချက်က မှန်ပါတယ်။ သို့သော် အောက်ပါအချက်တွေကို ထည့်ရန် တန်ပါတယ်။

- `Chord` ကို AlphaTab ရဲ့ `Beat` လို semantic time slice အဖြစ် သတ်မှတ်ပြီး တစ်ချိန်တည်းက notes၊ duration၊ tuplet၊ grace-note၊ lyric/chord annotation တွေကို တစ်နေရာတည်းမှာ စုရန်။
- Note/Chord/Measure/Part တစ်ခုစီမှာ parent link နဲ့ next/previous time link ထည့်ရန်။ AlphaTab က navigation ကို bidirectional လုပ်ထားပြီး `Score.finish()` လို consolidation pass ဖြင့် ties, timing, links တွေကို render မစခင် resolve လုပ်ပါတယ်။ [2]
- Parser ထဲက raw MusicXML order နဲ့ renderer လိုအပ်တဲ့ normalized order ကို မရောရန်။ `finishScore()` သို့မဟုတ် `normalizeScore()` တစ်ခုထားပြီး divisions, backup/forward, ties, voices, repeat timeline, MIDI ticks တွေကို အဲဒီအဆင့်မှာပဲ resolve လုပ်ရန်။

ဒီအချက်က လက်ရှိ engine ရဲ့ parser ကို ပိုရှုပ်အောင်လုပ်ရန် မဟုတ်ပါ။ Parser က source meaning ကိုထုတ်ပြီး normalization pass က cross-measure consistency ကို တာဝန်ယူစေရန် ဖြစ်ပါတယ်။

## အရေးကြီးဆုံး gap ၁ — Rendering bounds lookup

AlphaTab က render ပြီးနောက် `boundsLookup` ကို ထုတ်ပေးပြီး system → master bar → track bar → beat → note အဆင့်အထိ visual bounds နဲ့ real bounds ကို ရှာနိုင်ပါတယ်။ Note bounds ကိုပါ option ဖြင့် ရနိုင်တာကြောင့် cursor၊ hit testing၊ selection၊ annotation overlay နဲ့ external animation တွေကို SVG ကို ပြန်ဖတ်စရာမလိုဘဲ လုပ်နိုင်ပါတယ်။ [5]

သင့် engine မှာ skyline/debug bounding-box infrastructure ရှိပြီးသားဖြစ်လို့ ဒီ feature က အမြန်ဆုံး high-value update ဖြစ်နိုင်ပါတယ်။ Public API ကို အောက်ပါပုံစံနဲ့ ထည့်ရန် အကြံပြုပါတယ်။

```ts
interface BoundsLookup {
  systems: SystemBounds[];
  findAtTick(tick: number): BeatBounds | null;
  findAtPoint(x: number, y: number): NoteBounds | null;
  findMeasure(partId: string, measureIndex: number): MeasureBounds | null;
}
```

`visualBounds` နဲ့ `layoutBounds` ကို ခွဲထားရန် လိုပါတယ်။ `visualBounds` က glyph အမှန်တကယ်ဖုံးတဲ့ဧရိယာ၊ `layoutBounds` က spacing အတွက် reserve လုပ်ထားတဲ့ဧရိယာ ဖြစ်ရပါမယ်။ ဒီ lookup ကို playback cursor၊ drum animation၊ note click selection နဲ့ video frame highlighting တို့ရဲ့ တစ်ခုတည်းသော geometry source အဖြစ် သုံးပါ။

## အရေးကြီးဆုံး gap ၂ — Partial rendering နှင့် long-score performance

AlphaTab ရဲ့ display settings မှာ bar အရေအတွက်၊ row အတွင်း bars၊ partial render တစ်ခုအတွင်း bars အရေအတွက် စတဲ့ controls ရှိပါတယ်။ သူတို့က score တစ်ခုလုံးကို တစ်ကြိမ်တည်း DOM/SVG ထဲ မထုတ်ဘဲ partial အပိုင်းများအဖြစ် render လုပ်ပြီး user ကို ပထမဆုံးမြင်ကွင်းကို မြန်မြန်ပေးနိုင်အောင် ဒီဇိုင်းလုပ်ထားပါတယ်။ [4]

သင့် engine ရဲ့ performance budget နဲ့ `renderParsedMusicXml` ရှိပြီးသားဖြစ်ပေမယ့် အောက်ပါ API ကို ထည့်ရန် အကျိုးရှိပါတယ်။

```ts
renderScore(score, {
  range: { fromMeasure: 0, toMeasure: 12 },
  mode: 'page' | 'scroll',
  includeNoteBounds: true,
  onPartial: (partial) => {},
});
```

ဦးစားပေးအစီအစဉ်က—

1. Parser/model/layout ကို main thread မှာ တစ်ကြိမ်သာလုပ်ရန်။
2. System တစ်ခုချင်းစီကို SVG fragment အဖြစ် render လုပ်ရန်။
3. Viewport အနီးရှိ systems ပဲ attach လုပ်ရန်။
4. Resize ဖြစ်ရင် parser မပြန်ခေါ်ဘဲ layout + SVG geometry ပဲ ပြန်တွက်ရန်။
5. Score ကြီးလျှင် layout calculation ကို Worker သို့ ရွှေ့ရန်။

SVG string rendering ကို worker ထဲမှာ လုပ်နိုင်သော်လည်း DOM မထိရပါ။ Worker က serializable layout tree ထုတ်ပြီး main thread က SVG DOM ကို attach လုပ်တဲ့ပုံစံကို ရွေးပါ။

## အရေးကြီးဆုံး gap ၃ — Layout modes နှင့် user-controlled systems

AlphaTab မှာ Page၊ Horizontal နဲ့ Parchment layout mode သုံးမျိုးရှိပြီး၊ Parchment mode က file ထဲက systems layout hints ကို အသုံးပြုနိုင်ပါတယ်။ Page mode မှာ bars-per-row၊ last-system justification၊ padding၊ effect-band spacing စတဲ့ settings အများကြီးကို သီးခြားထိန်းနိုင်ပါတယ်။ [3] [4]

လက်ရှိ engine မှာ scroll/page mode၊ arbitrary resize၊ spacing နဲ့ skyline တို့ ရှိပြီးသားဖြစ်လို့ layout engine ကို ပြန်ရေးရန် မလိုပါ။ အောက်ပါ gap တွေကို ဖြည့်ရန် အကြံပြုပါတယ်။

- Score-wide `systemPlan` ကို public, inspectable output အဖြစ် ထုတ်ရန်။
- User သတ်မှတ်ထားတဲ့ bars-per-system ကို automatic mode နဲ့ သီးခြားထားရန်။
- Last system ကို အမြဲ justify မလုပ်ဘဲ fullness threshold ထည့်ရန်။
- MusicXML `<print>` နဲ့ source layout hint ရှိ/မရှိကို diagnostic ဖြင့် ပြရန်။
- Rendered system တစ်ခုချင်းစီမှာ width, height, first/last measure, staff bounds ပါစေရန်။

အထူးသဖြင့် `systemPlan` ထုတ်ခြင်းက debug screenshot နဲ့ visual regression ကို အလွန်လွယ်ကူစေပါမယ်။

## အရေးကြီးဆုံး gap ၄ — Text rendering system

AlphaTab ရဲ့ display resources ထဲမှာ music fonts, text fonts, colors နဲ့ rendering style ကို configuration အဖြစ် ထားပါတယ်။ [4] သင့် engine မှာ lyrics နဲ့ chord symbol geometry ရှိပေမယ့် syllable/root letter text rendering က အဓိကကျန်နေတဲ့ gap ဖြစ်နေပါတယ်။ `Doc/STATUS.md` မှာလည်း lyrics syllable text နဲ့ chord root/bass text ကို deferred လုပ်ထားကြောင်း ဖော်ပြထားပါတယ်။

ဒီ gap ကို glyph တစ်ခုချင်းစီနဲ့ ဖြေရှင်းရန် မကြိုးစားသင့်ပါ။ အောက်ပါ first-class text layer ထည့်ပါ။

- `TextStyle`: font family fallback list, size, weight, italic, baseline, letter spacing။
- `TextMeasurer`: browser Canvas2D measure၊ deterministic test measurer၊ optional server measurer။
- `TextRun`: text, style, anchor, alignment, collision category။
- `renderTextRun`: escaped SVG `<text>` output နှင့် font-loading readiness။
- `textBounds`: skyline/collision system ထဲသို့ ဝင်နိုင်တဲ့ measured box။

ဦးစားပေး text features က lyrics syllable, chord root/quality/bass, rehearsal mark, tempo word နဲ့ part/score title ဖြစ်သင့်ပါတယ်။ ဒီတစ်ခုကို ဖြည့်လိုက်ရင် MusicXML fixture coverage နဲ့ user-visible quality နှစ်ခုလုံး တစ်ပြိုင်နက်တိုးတက်ပါမယ်။

## အရေးကြီးဆုံး gap ၅ — Playback ကို host integration အဖြစ် ပိုမိုခိုင်မာစေရန်

AlphaTab မှာ data model ကနေ MIDI file ပြန်ထုတ်ပြီး built-in SoundFont synthesizer နဲ့ playback လုပ်နိုင်ပါတယ်။ ထို့အပြင် external audio/video ကို ချိတ်ရန် handler interface သီးခြားထားပြီး media time ကို notation time သို့ update လုပ်စေပါတယ်။ Official guide မှာ external media position ကို 50ms ဝန်းကျင် interval ဖြင့် update လုပ်လျှင် အလုပ်လုပ်ကြောင်း ဖော်ပြထားပါတယ်။ [1] [6]

သင့် PLAN က audio synthesis ကို engine အတွင်း မထည့်ရန် မှန်ကန်စွာ ဆုံးဖြတ်ထားပါတယ်။ အဲဒီဆုံးဖြတ်ချက်ကို မပြောင်းဘဲ API ကို AlphaTab pattern အတိုင်း တိုးတက်စေပါ။

```ts
interface PlaybackClock {
  readonly endTick: number;
  readonly endSeconds: number;
  setPosition(tick: number): void;
  setExternalTime(seconds: number): void;
  setRange(range: { fromTick: number; toTick: number } | null): void;
  setSpeed(rate: number): void;
}

interface PlaybackEvent {
  type: 'noteOn' | 'noteOff' | 'beat' | 'measure' | 'tempo';
  tick: number;
  partId?: string;
  noteId?: string;
}
```

လိုအပ်တာက audio engine မဟုတ်ဘဲ deterministic tick lookup၊ repeat-unfolded position၊ beat/note event stream၊ range loop နဲ့ external media sync ဖြစ်ပါတယ်။ Drum video renderer က ဒီ API ကို သုံးပြီး notation engine ကို animation code နဲ့ tightly couple မဖြစ်အောင် ဆက်ထားနိုင်ပါတယ်။

## Format strategy — AlphaTab ကို မျက်ကန်းလိုက်မလုပ်သင့်တဲ့အပိုင်း

AlphaTab က Guitar Pro 3–7၊ MusicXML၊ CapXML နဲ့ alphaTex ကို import လုပ်နိုင်ပြီး playback/export capability တွေလည်း ထည့်ထားပါတယ်။ [1] [2] သို့သော် format အရေအတွက်များတာက quality အာမခံချက် မဟုတ်ပါ။ AlphaTab ရဲ့ MusicXML feature table ကိုယ်တိုင်မှာ total feature support 62%၊ relevant feature support 52% လို့ ဖော်ပြထားပါတယ်။ [3]

သင့် project ရဲ့ primary use case က MusicXML + MIDI + drums + SVG ဖြစ်တဲ့အတွက် Guitar Pro binary importer ကို အခုချက်ချင်း မထည့်သင့်ပါ။ အစား—

1. MusicXML compatibility corpus ကို MuseScore/Finale/Sibelius/hand-authored fixtures ဖြင့် တိုးရန်။
2. Unsupported element ကို `ignored`, `partial`, `rendered`, `played` အလိုက် diagnostic ခွဲရန်။
3. Source visual intent နဲ့ playback intent မတူတဲ့ MusicXML elements ကို model ထဲမှာ သီးခြားထိန်းရန်။
4. Test fixture တစ်ခုချင်းစီမှာ parsed model snapshot + SVG snapshot + timing snapshot သုံးမျိုးထားရန်။
5. AlphaTex ကဲ့သို့ test-friendly mini notation DSL ကို optional developer tool အဖြစ် ထည့်ရန်။

AlphaTex လို DSL က production input format မဟုတ်သော်လည်း beam, tuplet, ties, lyrics, drum maps နဲ့ cursor tests ရေးရာမှာ MusicXML ထက် ပိုတိုပြီး deterministic ဖြစ်ပါမယ်။

## Instrument coverage — AlphaTab ထံမှ ရွေးချယ်သင့်သောအရာ

AlphaTab ရဲ့ model က fretted notes, piano notes နဲ့ percussion notes ကို note-level abstraction တစ်ခုအတွင်း ထားပြီး track/staff configuration နဲ့ display ကို ခွဲပါတယ်။ [2] သင့် engine ရဲ့ instrument-agnostic invariant က ဒီ direction နဲ့ကိုက်ညီပါတယ်။

အခုနောက်တစ်ဆင့်မှာ instrument-specific renderer မဖန်တီးဘဲ notation profile ထည့်သင့်ပါတယ်။ ဥပမာ—

- `standard`: clef, pitch, accidental, stem, beam
- `tab`: strings, tuning, fret, bend, slide, let-ring
- `percussion`: unpitched identity, display position, notehead, voice/stem rule
- `piano`: grand staff, cross-staff relation, pedal

Profile က mapping/configuration ပဲ ဖြစ်ပြီး core model က instrument branch မလုပ်ရပါ။ ဒီနည်းက လက်ရှိ PLAN ရဲ့ instrument-agnostic rule ကို မဖျက်ဘဲ AlphaTab ရဲ့ broad feature set ဆီ တိုးချဲ့နိုင်ပါတယ်။

## ဦးစားပေးလုပ်ဆောင်ရမည့် roadmap

### P0 — user-visible quality နှင့် API foundation

1. Text font system ဖြင့် lyrics, chord symbols, rehearsal/tempo text ကို တကယ် render လုပ်ရန်။
2. `BoundsLookup` ကို public API အဖြစ် ထုတ်ရန်။
3. Score normalization/finish pass ထည့်ပြီး parent links၊ next/previous links၊ tie/repeat/timing consistency ကို တစ်နေရာတည်းတွင် resolve လုပ်ရန်။
4. Unsupported/partial MusicXML diagnostic ကို element + rendering + playback အလိုက် ခွဲရန်။

### P1 — long-score rendering နှင့် playback integration

1. Partial system rendering နှင့် viewport-aware attachment ထည့်ရန်။
2. Worker-safe layout/render pipeline ထည့်ရန်။
3. External media sync၊ playback range၊ speed၊ loop နဲ့ beat/note events ကို stable contract ပြောင်းရန်။
4. Page/system plan ကို inspectable output အဖြစ် ထုတ်ရန်။

### P2 — notation breadth

1. MusicXML corpus coverage တိုးပြီး page-format details ကို ပိုကောင်းအောင် လုပ်ရန်။
2. Text-dependent elements ပြီးမှ figured bass, additional ornaments, cross-staff beaming စသည့် အပိုင်းများကို စဉ်းစားရန်။
3. AlphaTex-like developer DSL ထည့်ပြီး geometry/parser tests ကို တိုတောင်းစေရန်။
4. Guitar Pro importer က သင့် product requirement ဖြစ်လာမှသာ စတင်ရန်။

## မလုပ်သင့်သေးတဲ့အရာများ

- AlphaTab ရှိသမျှ format အားလုံးကို တစ်ပြိုင်နက် support မလုပ်ပါနဲ့။
- Notation engine ထဲကို audio synthesizer၊ video encoder၊ drum animation UI တိုက်ရိုက် မထည့်ပါနဲ့။
- SVG output ရှိနေသေးချိန်မှာ Canvas renderer ကို အရင်မပြောင်းပါနဲ့။ SVG က debug၊ accessibility နဲ့ deterministic snapshot အတွက် အားသာပါတယ်။
- Layout correctness မတည်ငြိမ်သေးခင် visual effect feature တွေ အများကြီး မတိုးပါနဲ့။
- AlphaTab ရဲ့ internal class names ကို copy မလုပ်ပါနဲ့။ သူ့ရဲ့ separation patterns နဲ့ contracts ကိုသာ သင်ယူပါ။

## လက်ရှိ engine အတွက် တိကျသော အားသာချက်များ

AlphaTab နဲ့ နှိုင်းယှဉ်လျှင် သင့် engine မှာ အောက်ပါ foundation ကောင်းတွေ ရှိပြီးသားပါ။

- SMuFL/Bravura metadata ကို geometry နဲ့ တိုက်ရိုက်အသုံးချထားခြင်း။
- MusicXML partwise/timewise/MXL နှင့် MIDI parsing ကို ကိုယ်ပိုင်လုပ်ထားခြင်း။
- Tempo map၊ MIDI↔MusicXML alignment နဲ့ drum mapping ရှိခြင်း။
- Skyline collision avoidance နဲ့ spacing algorithm ကို မျှော်မှန်းချက်မဟုတ်ဘဲ test ဖြင့် ခိုင်မာထားခြင်း။
- SVG snapshots၊ browser checks နဲ့ 864-test suite ရှိခြင်း။
- Audio/video/animation ကို core ထဲမထည့်ဘဲ playback position API အဖြစ် ခွဲထားခြင်း။

ဒါကြောင့် အခုအချိန်မှာ “engine ကို AlphaTab လို ပြန်ရေးမယ်” မဟုတ်ဘဲ “text + bounds + normalization + partial rendering” ဆိုတဲ့ core four ကို ဖြည့်ခြင်းက အကျိုးအရှိဆုံး လမ်းကြောင်း ဖြစ်ပါတယ်။

## References

[1]: https://alphatab.net/docs/introduction "AlphaTab Introduction"
[2]: https://alphatab.net/docs/reference/score "AlphaTab Data Model"
[3]: https://alphatab.net/docs/formats/musicxml "AlphaTab MusicXML Support"
[4]: https://alphatab.net/docs/reference/types/displaysettings/ "AlphaTab Display Settings"
[5]: https://alphatab.net/docs/reference/types/alphatabapi/ "AlphaTab API and Bounds Lookup"
[6]: https://alphatab.net/docs/guides/audio-video-sync "AlphaTab Audio and Video Synchronization"
