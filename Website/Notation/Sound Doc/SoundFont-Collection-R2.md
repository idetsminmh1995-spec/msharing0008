# SoundFont Collection — R2 Asset Record

## ရယူထားသော sound sources

Sound Engine အတွက် အသံရွေးချယ်မှုနှင့် fallback comparison ပြုလုပ်နိုင်ရန် SoundFont ခြောက်မျိုးကို စုစည်းထားသည်။ MuseScore General SF2/SF3 သည် MuseScore official OSUOSL mirror မှ ရယူထားသည်။ MS Basic SF3 သည် MuseScore official `deprecated_master/share/sound` directory မှ ရယူထားသည်။ FluidR3 GM SF2 သည် Piano Booster ၏ v3.1 release မှ ရယူထားပြီး GeneralUser GS သည် creator site ရှိ 1.472 legacy download ဖြစ်သည်။ Salamander Grand Piano V3 SF2 သည် FreePats ၏ official page မှ ရယူထားသည်။

Collection ထဲရှိ assets များမှာ `MS Basic.sf3`, `MuseScore_General.sf3`, `MuseScore_General.sf2`, `GeneralUser GS v1.472.sf2`, `FluidR3_GM.sf2` နှင့် `SalamanderGrandPiano-V3+20200602.sf2` ဖြစ်သည်။ File တစ်ခုချင်းစီ၏ SHA-256 ကို `SHA256SUMS` နှင့် JSON manifest တွင် ထည့်ထားသည်။

## License သတိပြုရန်

MuseScore General နှင့် FluidR3 သည် MIT notices ပါရှိသည်။ Salamander Grand Piano သည် CC BY 3.0 ဖြစ်ပြီး attribution လိုအပ်သည်။ GeneralUser GS တွင် download ထဲပါလာသော `LICENSE.txt` ကို လိုက်နာရမည်။ MS Basic ၏ official upstream license file ကို bundle ထဲတွင် ထည့်ထားသော်လည်း ဖိုင်အတွင်း MuseScore General filename/text အဟောင်း reference ရှိနေသဖြင့် public သို့မဟုတ် commercial R2 redistribution မလုပ်မီ MuseScore/rightsholder ထံမှ ရှင်းလင်းအတည်ပြုချက် သို့မဟုတ် legal review လိုအပ်သည်။

## R2 upload အကြံပြုချက်

Asset တစ်ခုချင်းစီကို versioned prefix သီးခြားဖြင့် upload လုပ်ပါ။ ဥပမာ `soundfonts/musescore-general/v0.2/MuseScore_General.sf2` နှင့် `soundfonts/salamander-grand-piano/v3-20200602/SalamanderGrandPiano-V3+20200602.sf2` ဖြစ်သည်။ Original zip တစ်ခုထဲကို R2 တွင်ထားပြီး browser က unzip လုပ်မည့်ပုံစံ မသုံးရပါ။ Sound Engine သည် manifest JSON ကို တစ်ကြိမ် fetch လုပ်ပြီး လိုအပ်သည့် SoundFont binary ကို cache-first ဖြင့် download လုပ်ရမည်။

## R2 folder တည်ဆောက်ပုံ

Zip ကို computer တွင် အရင် extract လုပ်ပြီး R2 bucket အတွင်း အောက်ပါ object key structure အတိုင်း upload လုပ်ပါ။ Bucket name ကို မိမိ Cloudflare R2 bucket အမည်ဖြင့် အစားထိုးပါ။

```text
<bucket>/soundfonts/
├── manifest.json
├── ms-basic/
│   └── official-deprecated-master/
│       ├── MS Basic.sf3
│       ├── MS Basic_License.md
│       ├── MS Basic_Readme.md
│       └── MS_Basic_Changelog.md
├── musescore-general/
│   └── v0.2/
│       ├── MuseScore_General.sf2
│       ├── MuseScore_General.sf3
│       ├── MuseScore_General_License.md
│       └── MuseScore_General_Readme.md
├── generaluser-gs/
│   └── v1.472/
│       ├── GeneralUser GS v1.472.sf2
│       ├── LICENSE.txt
│       └── README.txt
├── fluidr3-gm/
│   └── v3.1/
│       ├── FluidR3_GM.sf2
│       ├── COPYING
│       └── README
└── salamander-grand-piano/
    └── v3-20200602/
        ├── SalamanderGrandPiano-V3+20200602.sf2
        └── readme.txt
```

`manifest.json` ကို collection ထဲရှိ `soundfont-manifest.json` ကို copy လုပ်ပြီး bucket root ရှိ `soundfonts/manifest.json` အဖြစ်ထားနိုင်သည်။ Manifest ထဲရှိ `files[].path` သည် zip အတွင်း path ဖြစ်သောကြောင့် upload ပြီးနောက် application သုံးမည့် R2 object key/path များကို `runtime` mapping ထဲတွင် သီးခြားထည့်ရန် လိုအပ်သည်။ ပိုမိုလွယ်ကူစေရန် manifest ကို upload ပြီးနောက် R2 prefix နှင့်ကိုက်ညီအောင် path များကို ပြင်နိုင်သည်။

## Dashboard ဖြင့် upload လုပ်နည်း

Cloudflare Dashboard → **R2 Object Storage** → မိမိ bucket → **Upload** ကိုဝင်ပါ။ Zip ကို တိုက်ရိုက် upload မလုပ်ဘဲ extract လုပ်ထားသော `ms-basic`, `musescore-general`, `generaluser-gs`, `fluidr3-gm`, `salamander-grand-piano` folder များကို `soundfonts/` prefix အောက်သို့ upload လုပ်ပါ။ Upload ပြီးလျှင် object key တစ်ခုချင်းစီကို ဖွင့်၍ Content-Type ကို စစ်ပါ။ `.sf2` နှင့် `.sf3` အတွက် `audio/x-soundfont` မလက်ခံပါက `application/octet-stream` သုံးပါ။ JSON အတွက် `application/json`၊ Markdown/TXT/CSV အတွက် `text/plain; charset=utf-8` သုံးပါ။

R2 bucket ကို public မဖွင့်ချင်ပါက application server/Worker က signed URL ထုတ်ပေးပါ။ Public CDN သုံးမည်ဆိုပါက custom domain တစ်ခုချိတ်ပြီး browser မှာ အသုံးပြုမည့် URL ကိုသာ ထုတ်ပေးပါ။ R2 access key နှင့် secret ကို frontend code၊ GitHub သို့မဟုတ် `.env` committed file ထဲ မထည့်ရပါ။

## Cache setting

Versioned `.sf2`/`.sf3` objects များအတွက် `Cache-Control: public, max-age=31536000, immutable` သုံးနိုင်သည်။ `manifest.json` ကို update ပြုလုပ်နိုင်သောကြောင့် `Cache-Control: no-cache` သို့မဟုတ် အချိန်တို cache သုံးပါ။ Sound Engine သည် manifest ကို တစ်ကြိမ်ဖတ်ပြီး selected SoundFont binary ကို Cache API/IndexedDB ထဲသိမ်းရမည်။ Playback event တစ်ခုချင်းစီအတွက် R2 request မပြုလုပ်ရပါ။

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


## R2 upload record — 2026-11-13

- Uploaded the extracted collection as individual objects to bucket `msharing0008` under the `soundfonts/` prefix; the source ZIP itself was not uploaded.
- All 19 objects in the layout above are present. R2 HEAD checks confirmed each object's stored size matches the corresponding extracted archive entry. SHA-256 values from `SHA256SUMS` were preserved as object metadata and match the verified local extraction; `soundfonts/manifest.json` is the application-compatible collection manifest with a `runtime.assetPaths` mapping.
- The default Sound Engine asset is `soundfonts/musescore-general/v0.2/MuseScore_General.sf3` (`musescore-general-sf3`). Its SHA-256 matches the recorded official value `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3`.
- The optional Salamander Grand Piano SF2 (1,266,462,334 bytes) was also uploaded as an individual object. The collection's MS Basic license caveat above remains: obtain rights-holder clarification/legal review before public or commercial redistribution.
- No public bucket access or custom domain was enabled as part of this upload. Configure the intended public CDN URL or signed-URL flow before browser clients attempt to fetch the manifest and binary.
- All object-key/size checks passed. The temporary, prefix-restricted transfer Worker was deleted after upload verification.
