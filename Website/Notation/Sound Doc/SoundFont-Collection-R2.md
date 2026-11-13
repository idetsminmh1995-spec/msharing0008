# SoundFont Collection — R2 Asset Record

## ရယူထားသော sound sources

Sound Engine အတွက် အသံရွေးချယ်မှုနှင့် fallback comparison ပြုလုပ်နိုင်ရန် SoundFont ခြောက်မျိုးကို စုစည်းထားသည်။ MuseScore General SF2/SF3 သည် MuseScore official OSUOSL mirror မှ ရယူထားသည်။ MS Basic SF3 သည် MuseScore official `deprecated_master/share/sound` directory မှ ရယူထားသည်။ FluidR3 GM SF2 သည် Piano Booster ၏ v3.1 release မှ ရယူထားပြီး GeneralUser GS သည် creator site ရှိ 1.472 legacy download ဖြစ်သည်။ Salamander Grand Piano V3 SF2 သည် FreePats ၏ official page မှ ရယူထားသည်။

Collection ထဲရှိ assets များမှာ `MS Basic.sf3`, `MuseScore_General.sf3`, `MuseScore_General.sf2`, `GeneralUser GS v1.472.sf2`, `FluidR3_GM.sf2` နှင့် `SalamanderGrandPiano-V3+20200602.sf2` ဖြစ်သည်။ File တစ်ခုချင်းစီ၏ SHA-256 ကို `SHA256SUMS` နှင့် JSON manifest တွင် ထည့်ထားသည်။

## License သတိပြုရန်

MuseScore General နှင့် FluidR3 သည် MIT notices ပါရှိသည်။ Salamander Grand Piano သည် CC BY 3.0 ဖြစ်ပြီး attribution လိုအပ်သည်။ GeneralUser GS တွင် download ထဲပါလာသော `LICENSE.txt` ကို လိုက်နာရမည်။ MS Basic ၏ official upstream license file ကို bundle ထဲတွင် ထည့်ထားသော်လည်း ဖိုင်အတွင်း MuseScore General filename/text အဟောင်း reference ရှိနေသဖြင့် public သို့မဟုတ် commercial R2 redistribution မလုပ်မီ MuseScore/rightsholder ထံမှ ရှင်းလင်းအတည်ပြုချက် သို့မဟုတ် legal review လိုအပ်သည်။

## R2 upload အကြံပြုချက်

Asset တစ်ခုချင်းစီကို versioned prefix သီးခြားဖြင့် upload လုပ်ပါ။ ဥပမာ `soundfonts/musescore-general/v0.2/MuseScore_General.sf2` နှင့် `soundfonts/salamander-grand-piano/v3-20200602/SalamanderGrandPiano-V3+20200602.sf2` ဖြစ်သည်။ Original zip တစ်ခုထဲကို R2 တွင်ထားပြီး browser က unzip လုပ်မည့်ပုံစံ မသုံးရပါ။ Sound Engine သည် manifest JSON ကို တစ်ကြိမ် fetch လုပ်ပြီး လိုအပ်သည့် SoundFont binary ကို cache-first ဖြင့် download လုပ်ရမည်။

Salamander SF2 သည် 1.2 GB ခန့်ရှိသောကြောင့် browser first-load အတွက် မသင့်တော်နိုင်ပါ။ ၎င်းကို optional high-quality piano asset အဖြစ်ထားပြီး MuseScore General သို့မဟုတ် GeneralUser GS ကို default/lightweight fallback အဖြစ် သုံးရန် စီစဉ်ထားသည်။ Sound Engine သည် selected soundfont တစ်ခုသာ preload လုပ်ပြီး အသံထွက်နေချိန်တွင် R2 request မပြုလုပ်ရ။

## Notation Engine နှင့် ချိတ်ဆက်မှု

Notation Engine က normalized `noteOn`, `noteOff`, `programChange` နှင့် `controlChange` events ထုတ်မည်။ Sound Engine က manifest ထဲမှ selected asset ကို load/cache လုပ်ပြီး MIDI bank/program, velocity နှင့် CC events များကို SoundFont sampler/WASM adapter သို့ ပို့မည်။ SoundFont ပြောင်းသည့်အခါ selected asset ID နှင့် cache key ကို ပြောင်းပြီး event contract တစ်ခုတည်းကို ဆက်သုံးမည်။

## References

- https://musescore.org/en/handbook/3/soundfonts-and-sfz-files
- https://github.com/musescore/MuseScore/tree/deprecated_master/share/sound
- https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/
- https://www.schristiancollins.com/generaluser
- https://github.com/pianobooster/fluid-soundfont/releases/tag/v3.1
- https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html
