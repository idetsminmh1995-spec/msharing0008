# MuseScore General SoundFont — R2 Asset Record

## ရွေးချယ်ထားသော asset

Sound Engine အတွက် official MuseScore General SoundFont ကို ရွေးထားသည်။ MuseScore handbook အရ `MuseScore_General.sf3` သည် MuseScore 3 နှင့် MuseScore 2.2+ တို့တွင် အသုံးပြုသည့် free default SoundFont ဖြစ်ပြီး General MIDI instruments နှင့် percussion bank ပါဝင်သည်။ Official download source သည် Oregon State University Open Source Lab mirror ဖြစ်သည်။

- Source: https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3
- Version: `0.2`
- Format: `.sf3`
- License: MIT
- SHA-256: `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3`
- Official handbook: https://musescore.org/en/handbook/3/soundfonts-and-sfz-files

License နှင့် sample attribution notices များကို bundle ထဲတွင် မဖယ်ရှားဘဲ ထည့်ထားသည်။ MuseScore General ၏ license file က copyright/acknowledgements ကို derivative work တွင် ထည့်ထားရန် သတ်မှတ်ထားသည်။

## ပေးထားသော zip bundle

`musescore-general-r2-bundle.zip` ထဲတွင် SoundFont binary၊ license/readme၊ sample source attribution၊ version၊ checksum နှင့် Sound Engine အတွက် `soundfont-manifest.json` ပါဝင်သည်။ JSON သည် audio ကို အစားထိုးထားခြင်းမဟုတ်ဘဲ asset metadata နှင့် cache key/URL mapping ဖြစ်သည်။

## R2 ထဲထည့်နည်း

1. Zip ကို local computer တွင် extract လုပ်ပါ။ Extract ပြီးပါက folder တစ်ခုလုံးကို အောက်ပါ R2 prefix ထဲ upload လုပ်ပါ။

   `soundfonts/musescore-general/v0.2/`

2. အနည်းဆုံး အောက်ပါဖိုင်များကို upload လုပ်ပါ။

   - `MuseScore_General.sf3`
   - `soundfont-manifest.json`
   - `MuseScore_General_License.md`
   - `MuseScore_General_Readme.md`
   - `MuseScore_General_Sample_Sources.csv`
   - `MuseScore_General_Changelog.md`
   - `VERSION`
   - `SHA256SUMS`

3. `MuseScore_General.sf3` ကို binary object အဖြစ် `Content-Type: audio/x-soundfont` သို့မဟုတ် R2 dashboard တွင် လက်ခံသော `application/octet-stream` ဖြင့်ထားပါ။ `soundfont-manifest.json` ကို `application/json` သတ်မှတ်ပါ။ License/CSV/Markdown ကို `text/plain; charset=utf-8` သတ်မှတ်ပါ။

4. Public CDN URL သို့မဟုတ် signed URL တစ်ခုရပြီးနောက် manifest ထဲရှိ `runtime.assetPath` နှင့် application ၏ manifest URL ကို project configuration တွင် ထည့်ပါ။ Secret R2 credentials ကို browser code ထဲ မထည့်ရပါ။

5. Object key ကို overwrite မလုပ်ဘဲ version အသစ်တိုင်း `v0.3`, `v0.4` စသည်ဖြင့် folder အသစ်သုံးပါ။ Cache-Control ကို versioned asset များအတွက် long-lived immutable cache သုံးနိုင်သည်။ Manifest ကို ပြောင်းလဲနိုင်ပါက `no-cache` သို့မဟုတ် short cache သုံးပါ။

6. Upload ပြီးနောက် `SHA256SUMS` ထဲရှိ hash နှင့် R2 မှ download လုပ်ထားသော `.sf3` hash တူမတူ စစ်ပါ။

## Sound Engine သုံးစွဲပုံ

- Browser သည် manifest ကို တစ်ကြိမ် fetch လုပ်ပြီး `assetPath` နှင့် `cacheKey` ကို အသုံးပြုရမည်။
- `.sf3` ကို Cache API သို့မဟုတ် IndexedDB တွင် cache-first ဖြင့်သိမ်းရမည်။ Note တစ်လုံးချင်း၊ playback တစ်ကြိမ်ချင်း R2 ကို မခေါ်ရ။
- JSON ထဲတွင် audio binary မထည့်ရ။ JSON သည် version, checksum, URL/path, General MIDI program mapping နှင့် attribution file references သာ ထားရမည်။
- Notation Engine က `noteOn`, `noteOff`, `programChange`, `controlChange` events ထုတ်ပြီး Sound Engine က အဆိုပါ events များကို sampler/FluidSynth WebAssembly adapter သို့ ပေးရမည်။
- Sound Engine load မပြီးမချင်း UI တွင် loading/connection status ကို ပြရမည်။ အသံထွက်နေသည်ဟု မဖော်ပြရ။

## လက်ရှိစစ်ဆေးမှု

- Official mirror မှ `.sf3` နှင့် attribution files download အောင်မြင်သည်။
- SHA-256 checksum ကို bundle ထဲတွင် ထည့်ပြီး အတည်ပြုထားသည်။
- Manifest တွင် General MIDI program 0–127 နှင့် percussion bank 128 ကို မှတ်တမ်းတင်ထားသည်။
- Browser sampler integration, R2 upload execution နှင့် Notation Engine end-to-end playback ကို မစတင်ရသေးပါ။
