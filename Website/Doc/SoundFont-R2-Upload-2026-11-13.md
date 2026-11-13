# SoundFont Collection R2 Upload — 2026-11-13

## အကျဉ်းချုပ်

အသုံးပြုသူပေးထားသော Google Drive ရှိ `soundfont-r2-collection.zip` ကို download လုပ်၊ ZIP integrity စစ်ပြီး Plan ထဲရှိ layout အတိုင်း ဖိုင်တစ်ခုချင်းစီ Cloudflare R2 သို့ upload လုပ်ခဲ့သည်။ Destination သည် `msharing0008` bucket အတွင်းရှိ `soundfonts/` prefix ဖြစ်သည်။ ZIP archive ကို R2 ထဲသို့ တိုက်ရိုက်မတင်ဘဲ အတွင်းဖိုင်များကိုသာ upload လုပ်ထားသည်။

## ပြီးစီးခဲ့သည့်အလုပ်များ

- Repo-ийн `Website/Plan/README.md`, `Website/Notation/Sound Plan/README.md`, `Website/Notation/Sound Doc/SoundFont-Collection-R2.md` болон `MuseScore-General-R2-Asset.md`-ийг уншиж, bucket/prefix, object key layout, manifest/cache болон license-ийн зааврыг дагасан.
- Drive-ээс ZIP татаж аваад бүтэн ZIP CRC шалгалт хийсэн. Файл бүрийг Plan-д заасан хувилбарын замтай тааруулж задалсан.
- Бүх asset-ийн SHA-256-ийг эх archive доторх `soundfont-manifest.json`-ийн checksum мэдээлэлтэй тулгаж шалгасан. `MuseScore_General.sf3` SHA-256 нь `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3`-тай яг таарсан.
- App-д тохирсон `soundfonts/manifest.json` үүсгэж, `runtime.assetPaths` mapping-ийг Sound Engine-ийн `DEFAULT_ASSET_PATHS`-тай нийцүүлсэн.
- SoundFont binary, лиценз/readme, `manifest.json`, `README.md`, `SHA256SUMS` нийлсэн **19 object**-ийг Plan-ийн versioned R2 key-үүдэд тус тусад нь upload хийсэн. 1.27 GB Salamander SF2-ийг мөн тусдаа stream хэлбэрээр байршуулсан.
- R2 object бүр дээр HEAD шалгалт хийж, хадгалсан byte size нь задалсан archive-ийн тухайн файлын хэмжээтэй таарч байгааг баталгаажуулсан. SHA-256 утгуудыг custom metadata-д хадгалсан; `.sf2/.sf3`-ийг `application/octet-stream`, manifest-ийг `application/json`, текст файлуудыг `text/plain; charset=utf-8` гэж тодорхойлсон.
- Versioned object-уудад immutable cache-control, manifest-д no-cache тохируулсан. Bucket-ийг public болгоогүй, custom domain нэмээгүй.
- Upload хийхэд түр, `soundfonts/` prefix-д л бичих эрхтэй Cloudflare Worker ашигласан; upload болон R2 шалгалт дууссаны дараа Worker-ийг устгасан.
- R2 asset record-уудыг шинэчилж, upload status, шалгалтын үр дүн, license анхааруулгыг тэмдэглэсэн. Эдгээр өөрчлөлт `6caf67d79e659722b103af57ea31757469a1fcd5` commit-оор `main` branch-д өмнө нь push хийгдсэн.

## Байршуулсан object layout

```text
msharing0008/soundfonts/
├── manifest.json
├── README.md
├── SHA256SUMS
├── ms-basic/official-deprecated-master/
│   ├── MS Basic.sf3
│   ├── MS Basic_License.md
│   ├── MS Basic_Readme.md
│   └── MS_Basic_Changelog.md
├── musescore-general/v0.2/
│   ├── MuseScore_General.sf2
│   ├── MuseScore_General.sf3
│   ├── MuseScore_General_License.md
│   └── MuseScore_General_Readme.md
├── generaluser-gs/v1.472/
│   ├── GeneralUser GS v1.472.sf2
│   ├── LICENSE.txt
│   └── README.txt
├── fluidr3-gm/v3.1/
│   ├── FluidR3_GM.sf2
│   ├── COPYING
│   └── README
└── salamander-grand-piano/v3-20200602/
    ├── SalamanderGrandPiano-V3+20200602.sf2
    └── readme.txt
```

## Шалгалтын үр дүн

**Амжилттай:** ZIP integrity, бүх asset-ийн local SHA-256 тулгалт, R2-д 19 object байгаа эсэх болон object тус бүрийн byte size. MuseScore General SF3 нь repo-д тэмдэглэсэн official checksum-тэй таарсан. Түр Worker устсан, temporary upload ажиллагаа дууссан.

**Хийгдээгүй:** Browser-оос R2 manifest/audio-г татах бодит playback/E2E туршилт хийгдээгүй. Bucket private хэвээр тул production browser fetch энэ upload-оор дангаараа ажиллахгүй.

## Үлдсэн ажил

1. SoundFont-уудыг browser-оос унших албан ёсны delivery зам сонгох: R2 custom domain/public CDN эсвэл Worker-оор үүсгэх signed URL. Private bucket хэвээр байлгах бол signed URL/authorized Worker flow-ийг сонгох.
2. `Website/Website/notation.js` болон шаардлагатай config-д approved manifest URL, asset base URL-ийг тохируулж, `soundfonts/manifest.json` болон default `musescore-general-sf3` object fetch-ийг холбоно. R2 credentials-ийг browser code-д хэзээ ч မထည့်ရ။
3. Browser playback E2E шалгалт хийх: user gesture-ээс AudioContext စတင်ခြင်း, manifest/SF3 load, cache-first reload, play/pause/volume, error/loading states болон phone/desktop viewport.
4. MusicXML unpitched drum mapping, instrument program/bank routing, percussion bank 128 болон multi-part score-ийн mapping/tests — Sound Engine Plan-д үлдсэн implementation work.
5. Collection record-д тэмдэглэсэн MS Basic upstream license caveat-ийг public эсвэл commercial redistribution-ээс өмнө эрх эзэмшигчээр баталгаажуулах/эрх зүйн review авах.
6. Salamander SF2 нь ойролцоогоор 1.27 GB тул optional asset хэвээр; default preload-д оруулахгүй, хэрэглэгч сонгосон үед л татах стратегийг E2E/performance туршилтаар баталгаажуулах.

## Холбоотой баримтууд

- [SoundFont Collection R2 Asset Record](../Notation/Sound%20Doc/SoundFont-Collection-R2.md)
- [MuseScore General R2 Asset Record](../Notation/Sound%20Doc/MuseScore-General-R2-Asset.md)
- [Sound Engine Plan](../Notation/Sound%20Plan/README.md)
