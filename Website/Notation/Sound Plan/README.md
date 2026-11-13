# Sound Engine Plan

## ရည်ရွယ်ချက်

Notation Engine က score ထဲရှိ note events များကို ထုတ်ပေးပြီး Sound Engine က ထို events များကို အသံအဖြစ် render/playback လုပ်မည်။ ပထမဆုံး sound source အဖြစ် MuseScore 3 နှင့် MuseScore 2.2+ တွင် default ဖြစ်သော **MuseScore_General.sf3** ကို အသုံးပြုမည်။ Official MuseScore handbook တွင် MuseScore_General ကို General MIDI-compatible SoundFont အဖြစ် ဖော်ပြထားပြီး official OSUOSL mirror မှ `.sf3` နှင့် attribution files များကို ရယူနိုင်သည်။

## Asset နှင့် license ဆုံးဖြတ်ချက်

- R2 တွင် `MuseScore_General.sf3` ကို immutable version path ဖြင့် သိမ်းမည်။ လက်ရှိ source version သည် `0.2` ဖြစ်သည်။
- SoundFont နှင့်အတူ `MuseScore_General_License.md`, `MuseScore_General_Readme.md`, `MuseScore_General_Sample_Sources.csv`, `MuseScore_General_Changelog.md` နှင့် `VERSION` ကို သိမ်းမည်။
- License သည် MIT ဖြစ်သော်လည်း derivative/distributed bundle တွင် copyright, author နှင့် attribution notices များကို မဖယ်ရှားရ။
- Source files နှင့် checksum ကို R2 object metadata/documentation အဖြစ် ထားမည်။ `soundfont-manifest.json` သည် source URL, version, SHA-256, MIDI program mapping နှင့် R2 asset path ကို ဖော်ပြမည်။

## R2 object layout

```text
soundfonts/
└── musescore-general/
    └── v0.2/
        ├── MuseScore_General.sf3
        ├── soundfont-manifest.json
        ├── MuseScore_General_License.md
        ├── MuseScore_General_Readme.md
        ├── MuseScore_General_Sample_Sources.csv
        ├── MuseScore_General_Changelog.md
        ├── VERSION
        └── SHA256SUMS
```

Version path သည် cache invalidation နှင့် rollback အတွက် ဖြစ်သည်။ Source file ကို overwrite မလုပ်ဘဲ version အသစ်ထွက်တိုင်း folder အသစ်သုံးမည်။

## JSON နှင့် fetch/cache design

JSON ထဲသို့ audio bytes မထည့်ရ။ Manifest တစ်ခုကို တစ်ကြိမ် fetch လုပ်ပြီး Sound Engine က manifest ထဲရှိ `assetPath`, `cacheKey`, `sha256` နှင့် MIDI program mapping ကို အသုံးပြုမည်။ SoundFont binary ကို browser `Cache API` သို့မဟုတ် IndexedDB တွင် `soundfont:musescore-general:v0.2` key ဖြင့် သိမ်းပြီး နောက် playback များတွင် R2 ကို ထပ်ခေါ်မည်မဟုတ်ပါ။

Runtime flow သည် အောက်ပါအတိုင်း ဖြစ်မည်။

1. Notation Engine က MusicXML/MIDI timing ကို `noteOn`, `noteOff`, `programChange`, `controlChange` events အဖြစ် normalize လုပ်မည်။
2. Sound Engine က manifest ကို cache-first ဖြင့် ဖတ်မည်။
3. SoundFont မရှိပါက `.sf3` ကို R2 မှ တစ်ကြိမ် download လုပ်ပြီး checksum စစ်ကာ local cache ထဲသိမ်းမည်။
4. SoundFont-compatible WebAssembly sampler/FluidSynth adapter ကို အသုံးပြုပြီး SoundFont ကို load မည်။
5. Notation Engine event clock နှင့် Sound Engine clock ကို shared timestamp/transport ဖြင့် sync လုပ်မည်။
6. အသံထွက်နေချိန် R2 request မပြုလုပ်ရ။ R2 သည် asset delivery သာ တာဝန်ယူပြီး note scheduling ကို browser ထဲတွင်လုပ်မည်။

## Notation Engine event contract

```ts
export type NoteEvent =
  | { type: 'noteOn'; channel: number; note: number; velocity: number; timeMs: number }
  | { type: 'noteOff'; channel: number; note: number; timeMs: number }
  | { type: 'programChange'; channel: number; bank: number; program: number; timeMs: number }
  | { type: 'controlChange'; channel: number; controller: number; value: number; timeMs: number };

export interface SoundEngine {
  loadManifest(url: string): Promise<void>;
  preload(): Promise<void>;
  schedule(events: NoteEvent[], startAtMs: number): void;
  stop(): void;
  setVolume(value: number): void;
}
```

Notation Engine သည် rendering နှင့် event timing ကိုပဲ ကိုင်တွယ်မည်။ Sound Engine သည် audio context, SoundFont loading, MIDI program/bank selection, velocity/CC နှင့် output routing ကို ကိုင်တွယ်မည်။ Sound Engine မချိတ်ဆက်မီ UI တွင် connection status ကိုသာ ပြပြီး အသံထွက်နေသည်ဟု မဖော်ပြရ။

## မပြီးသေးသော implementation အဆင့်များ

- Browser-compatible `.sf3` sampler/WASM adapter ကို ရွေးချယ်ပြီး license နှင့် bundle size စစ်ဆေးရန်။
- Manifest loader နှင့် Cache API/IndexedDB cache layer ရေးရန်။
- Notation Engine ၏ playback events ကို အထက်ပါ contract သို့ map လုပ်ရန်။
- Piano, drum/percussion bank 128 နှင့် General MIDI bank/program selection စမ်းသပ်ရန်။
- Phone နှင့် desktop viewport နှစ်မျိုးတွင် play/stop, volume, loading/error state ကို စစ်ဆေးရန်။

## Reference

- MuseScore handbook — SoundFonts and SFZ files: https://musescore.org/en/handbook/3/soundfonts-and-sfz-files
- Official MuseScore General directory: https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/
