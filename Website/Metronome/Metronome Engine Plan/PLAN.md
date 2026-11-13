# Metronome Engine — Хөгжүүлэлтийн Plan

**Шалгасан огноо:** 2026-11-13  
**Source snapshot:** `Website/Metronome/Metronome Engine/`  
**Хамаарах техникийн баримт:** [../Metronome Engine Doc/DOC.md](../Metronome%20Engine%20Doc/DOC.md)

Энэ Plan нь одоогийн кодыг уншиж, temporary copy дээр verification ажиллуулсны дараа тодорхойлсон дараагийн ажлуудыг жагсаана. Энд `[ ]` тэмдэгтэй зүйлүүд нь **хийх санал/үлдсэн ажил**; энэ удаагийн documentation commit-оор engine-ийн код, website integration эсвэл эдгээр ажлууд хийгдсэн гэж үзэхгүй.

## Зорилго

Host application-аас өгсөн metronome frame state-ийг `16x9`, `9x16`, `1x1` хэлбэрийн 11 design болгон тогтвортой SVG-р дүрслэх. Renderer нь frame-ээс хамааралгүй audio/clock/video behavior эзэмшихгүй; харин host-оос өгсөн `beat`, `phase`, tempo, meter болон asset-уудыг зөв харуулах үүрэгтэй.

## Одоогийн baseline

- `renderMetronomeFrame()` complete SVG string буцаана; `listDesigns()` picker metadata гаргана.
- 11 design, гурван aspect ratio, per-design palette болон shared tempo/meter readout бий.
- `npm run verify` temporary source copy дээр pass болсон: typecheck, lint, format check, build болон 20 test pass.
- ZIP/source snapshot-д `package-lock.json` байгаагүй тул `npm ci` ажиллахгүй. `npm install --no-package-lock` ашиглан дээрх verification-ийг хийсэн.
- README-д дурдсан `website/assets/metronome-engine.js` sync болон `website/video-create/metronome/` host integration энэ review-д ажиллуулж баталгаажаагүй.
- Follow-up item-уудыг энэ дарааллаар шийдэхийг санал болгож байна: **P0 → P1 → P2**.

## P0 — Runtime frame input contract-ийг бүрэн тодорхойлж хамгаалах

`src/index.ts` дахь `normalizeFrame()` нь `phase`-ийг non-finite утгаас хамгаалдаг боловч `beat`, `beatsPerBar`, `bar`, `bpm`, numerator, denominator-д `NaN`/`Infinity`-ийг тусгайлан шалгахгүй. Одоогийн invalid-input test нь zero утга, negative `bar`, `NaN phase`-ийг хамардаг боловч бусад numeric edge case-ийг хамрахгүй.

- [ ] Дээрх numeric field бүрт зөвшөөрөгдөх хүрээ, бүхэл/бутархай утгыг боловсруулах дүрэм болон invalid утгын үр дүнг тогтоох. Одоогийн clamp pattern-ийг үргэлжлүүлэх үү, эсвэл input буцаах/алдаа өгөх үү гэдгийг API contract-д шийдэх.
- [ ] `NaN`, `Infinity`, `-Infinity`, fractional value, маш өндөр BPM/beat count болон nested time-signature-ийн invalid утгуудыг шалгах test нэмэх.
- [ ] Хэрэв deterministic fallback/clamp сонговол render бүр finite, хүчинтэй SVG geometry гаргаж байгаа эсэхийг шалгах; хэрэв invalid input reject хийх сонголт хийвэл алдааны contract-ийг баримтжуулах.
- [ ] `phase`-ийн одоогийн `[0, 1]` clamp болон finite бус үед `0` болдог зан үйлийг docs/test-тэй нийцүүлэх.

**Дууссанд тооцох шалгуур:** Runtime-аар ирсэн бүх frame field-ийн invalid/edge behavior тодорхой, tests-ээр баталгаажсан, хүчинтэй input дээрх одоогийн output өөрчлөгдөөгүй байна.

## P1 — Website build, asset path ба runtime integration-ийг шийдэх

README нь build bundle-ийг `website/assets/metronome-engine.js` рүү хуулж, `website/video-create/metronome/` ашиглана гэж тайлбарладаг. `package.json` дахь `build` нь зөвхөн `dist/metronome-engine.js` үүсгэдэг; archive-д website sync script байхгүй. Repo дахь `Website/Metronome/Metronome Engine/` зам ба README-ийн `website/...` path/case нь бодит deploy-ийн зам мөн эсэхийг шийдээгүй.

- [ ] Website-ийн canonical asset location, case-sensitive path болон video-create page-ийн бодит consumer-ийг repo дотор баталгаажуулах.
- [ ] Build artifact-ийг `dist`-ээс host app руу синхрончлох нэг тодорхой үйлдэл/скрипт эсвэл existing integration contract тогтоох; гар аргаар хуулж зөрөхөөс сэргийлэх.
- [ ] Host нь engine bundle-ийг ачаалж `MetronomeDesigns.renderMetronomeFrame()` эсвэл тохирох API-г дуудаж буй integration smoke test нэмэх.
- [ ] Logo-name (`drum`, `piano`, бусад instrument, `sharing`) болон logo URL-ийг host asset-ийн жинхэнэ path-тэй холбож, missing asset үед зөв fallback/no-image зан үйлийг батлах.
- [ ] Engine-ийн source-of-truth болон website-д ашиглагдах copied/generated bundle-ийн эзэмшлийг README-д тодорхойлох.

**Дууссанд тооцох шалгуур:** Source bundle-ээс deploy ашиглах bundle руу давтагдахуйц sync flow бий; host integration зөв path, global name, logo assets-тай smoke test-ээр батлагдсан.

## P1 — Dependency install ба package output-ийг reproducible болгох

`package.json` `private: true` гэж заасан ч README нь `import { ... } from 'metronome-engine'` жишээтэй; мөн `types` нь `dist/index.d.ts` руу заадаг. `npm run declarations` declaration-уудыг тусад нь гаргадаг, харин `build` болон `verify` дотор энэ алхам байхгүй. Snapshot-д lockfile байхгүй учир `npm ci` ажиллаагүй.

- [ ] Engine нь repo доторх bundle-only internal module байх уу, эсвэл TypeScript package/API хэлбэрээр хэрэглэгдэх үү гэдгийг шийдэх.
- [ ] Хэрэв TS package import дэмжих бол declaration generation-ийг build/release flow-д оруулах; `types` target бодитоор үүсдэгийг clean build-ээр батлах. Хэрэв зөвхөн browser IIFE бол README/package metadata-г тэр хэрэглээнд тааруулах.
- [ ] Reproducible dependency install шаардлагатай эсэхийг шийдээд, шаардлагатай бол lockfile нэмэх; `npm ci` + `npm run verify`-г clean environment-д шалгах.
- [ ] Supported Node.js/npm version-ийг тодорхойлох (`package.json` одоогоор `engines` field заагаагүй).

**Дууссанд тооцох шалгуур:** Package metadata, README-ийн хэрэглээний жишээ, build artifact болон clean install behavior хоорондоо нийцсэн байна.

## P2 — SVG/XML input escaping ба output validity-г баталгаажуулах

`src/svg.ts`-ийн `escapeText()` нь текст болон helper-аар үүсгэсэн string attribute-уудыг escape хийнэ. Харин `src/layout.ts` дахь logo helper нь `logoUrl`-ийн double quote-ийг л солидог; одоогийн test нь logo URL-д special XML character оруулахгүй. Бусад атрибутын parser-level validity эсвэл browser render-ийг test suite шалгахгүй.

- [ ] Logo URL attribute-ийг нийтлэг XML attribute escaping helper-ээр гаргах эсвэл equivalent safe serializer ашиглах.
- [ ] `&`, `<`, `>`, single/double quote агуулсан title/subtitle/logo URL input дээр regression test нэмэх.
- [ ] Бүтэн SVG output-ийг XML/SVG parser эсвэл browser smoke test-ээр шалгаж, malformed markup-ийг барих.

**Дууссанд тооцох шалгуур:** User-controlled text болон logo URL зөв escape хийгдэж, representative SVG output parser/browser-аар хүчинтэй гэж батлагдсан.

## P2 — 33 layout-ийн visual regression болон design contract-уудыг батлах

Одоогийн 20 test нь бүх design/aspect render хийж SVG string, viewBox, tag balance, fallback болон сонгосон shared layout behavior-ийг шалгана. Энэ нь бодит browser зураглал, text clipping, overlap, font fallback, logo asset load эсвэл бүх design-ийн element bounds-ийг батлахгүй.

- [ ] `11 × 3 = 33` combination-д representative visual snapshot/browser render smoke test зохиох; font болон browser prerequisites-ийг тодорхойлох.
- [ ] Header/readout/stage/logo overlap, text clipping, stage boundary болон safe margin-ийг бүх aspect дээр шалгах.
- [ ] Downbeat, beat transition, `phase=0`, дундах phase болон `phase→1` зэрэг timing boundary дээр design-specific regression test нэмэх.
- [ ] Travel Line-ийн straight track дээр endpoint tick (`count + 1`) ба square loop (`count`) ялгааг, Bounce Ball-ийн нэг beat bar case-ийг explicit edge test болгох.
- [ ] Stack Blocks-ийн “accumulates/cleared at bar line” тайлбарыг кодын per-frame reconstruction-тэй нийцүүлж тодруулах; engine нь prior frame-үүдийн persistent state хадгалдаггүйг батлах.

**Дууссанд тооцох шалгуур:** Текстээр шалгагдаж байсан visual contract-ууд browser-render/snapshot болон boundary tests-ээр давтагдахуйц батлагдсан байна.

## P2 — Beat-count болон tempo/time-signature range-ийг тодорхойлох

Test suite нь `beatsPerBar`-ийн `1, 3, 5, 6, 7, 12` утгыг шалгадаг. Бүх design-д зориулсан universal upper bound кодод тодорхойгүй; өндөр beat count үед dot spacing, ring wedge, bar label, layout readability өөрчлөгдөж болно.

- [ ] Дэмжих ёстой maximum beats-per-bar болон bpm/time-signature-ийн practical range-ийг product requirement-тай хамт тогтоох.
- [ ] Range доторх бага/их boundary, жигд бус meter, 1-beat bar болон олон оронтой утгын output-ийг шалгах.
- [ ] Range-ээс гарсан input-д clamp/reject/diagnostic-ийн сонголтыг P0 contract-тай нэг мөр болгох.
- [ ] Хэрэв universal maximum тогтоохгүй бол design тус бүрийн tested limits болон large-count caveat-ийг docs-д тусгах.

**Дууссанд тооцох шалгуур:** Engine-ийн supported range тодорхой, boundary cases бүх design-д тесттэй, хэрэглэгч хязгаарыг баримтаар мэддэг байна.

## Шийдвэр гаргах дараалал

1. P0 дээр frame validation-ийн contract-ийг батлах.
2. P1 дээр website target path, package delivery mode болон install reproducibility-г шийдэх.
3. P2 дээр escaping, visual regression, design edge case болон supported numeric range-ийн ажлуудыг хэрэгжүүлэх.
4. Код эсвэл integration өөрчилсний дараа `npm run verify`, clean install болон host-page smoke test-ийг дахин ажиллуулж үр дүнг энэ Plan/Doc-д шинэчлэх.

Энэ Plan-д listed item-уудыг хэрэгжүүлэхийн өмнө тухайн өөрчлөлтийн хүрээг тусад нь тохирно; энэ удаагийн ажлын гүйцэтгэл нь зөвхөн code review болон хоёр Markdown баримт бичгийг GitHub-д нэмэх явдал.
