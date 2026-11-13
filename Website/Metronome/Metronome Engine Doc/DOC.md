# Metronome Engine — Code Review болон техникийн баримт

**Шалгасан огноо:** 2026-11-13  
**Source:** GitHub-д импортолсон `metronome-engine.zip` snapshot  
**Engine зам:** `Website/Metronome/Metronome Engine/`  
**Энэ баримтын зорилго:** Одоогийн кодын бодит үүрэг, public API, design-ууд, build/test болон илэрсэн хязгаарлалтыг тэмдэглэх. Энэ нь engine кодыг өөрчилсөн эсвэл website-д интеграц хийсэн гэсэн үг биш.

## Товч дүгнэлт

Metronome Engine нь өгөгдсөн нэг beat-ийн төлөвийг SVG frame болгон дүрслэх TypeScript renderer юм. 11 төрлийн дүрслэлийн design, гурван aspect ratio (`16x9`, `9x16`, `1x1`), design тус бүрийн өнгөний palette, хэмнэл/measure readout болон optional logo URL-ийг нэг SVG output-д нэгтгэнэ.

Энэ Engine өөрөө цаг хэмжигч, audio, metronome playback, DOM animation эсвэл эцсийн video encoder биш. Host application нь `beat`, `phase`, tempo болон meter-ийн төлөвийг өгч, үүссэн SVG-г preview эсвэл video pipeline-д ашиглах үүрэгтэй.

Орон нутгийн түр copy дээр `npm install --no-package-lock --no-audit --no-fund` болон `npm run verify` амжилттай ажилласан: typecheck, lint, format check болон **20 test бүгд pass** болсон. Энэ нь GitHub repo-д `node_modules` эсвэл build output нэмсэн гэсэн үг биш; шалгалтыг `/tmp` дахь temporary copy дээр хийсэн.

## Бүтэц ба үүрэг

| Зам | Үүрэг |
|---|---|
| `src/index.ts` | Public entry point; design сонгох, frame-ийг normalize хийх, SVG shell үүсгэх, `renderMetronomeFrame()` болон `listDesigns()` export хийх. |
| `src/types.ts` | Aspect ratio, canvas, input frame, palette болон `Design`/`DesignContext` contracts. |
| `src/designs/index.ts` | 11 design-ийг picker-ийн тогтсон дарааллаар бүртгэх; `designById()` болон `DEFAULT_DESIGN_ID`. |
| `src/designs/01-*.ts`–`11-*.ts` | Тус бүрийн SVG body/layout болон beat/phase-д суурилсан дүрслэл. |
| `src/layout.ts` | Canvas хэмжээ, gutter, header/stage band, logo box, title/subtitle болон нийтлэг BPM/meter readout. |
| `src/theme.ts` | Design бүрийн өнгөний palette, light/dark ground болон readout өнгө. |
| `src/logos.ts` | Design ID-гаас logo-ийн нэр сонгоно; файлын URL/path-ийг host application шийднэ. |
| `src/svg.ts` | SVG element helpers, текст escaping, тоон хэмжээг форматлах, arc/polar/easing helpers. |
| `test/designs.test.js` | Built IIFE bundle дээр ажиллах Node test suite. |
| `dist/metronome-engine.js` | Build хийхэд гардаг browser IIFE bundle; global нэр нь `MetronomeDesigns`. |

## Render pipeline

`renderMetronomeFrame(input)` дараах байдлаар ажиллана:

1. `input.design`-ийг `designById()`-аар сонгоно. Танихгүй ID бол registry-ийн эхний design болох `pendulum` руу fallback хийнэ.
2. `input.aspect`-ийг шалгана. Runtime дээр танихгүй aspect ирвэл `16x9` руу fallback хийнэ.
3. Сонгосон aspect-д тохирох canvas болон design-ийн palette-г авна.
4. `frame`-ийн утгуудыг normalize хийгээд `DesignContext` үүсгэнэ.
5. Background rect, shared header (design нь `ownHeader` тохируулсан бол алгасна), design body, нийтлэг `tempoStats`-ийг дарааллаар SVG-д оруулна.
6. `viewBox`, responsive `width/height`, `preserveAspectRatio="xMidYMid meet"`, `role="img"` болон beat-ийг илэрхийлсэн `aria-label`-тай бүрэн `<svg>` document string буцаана.

`renderMetronomeFrame()` нь нэг агшны SVG-г буцаадаг. Хөдөлгөөнийг video болгохын тулд caller нь хөгжмийн цагтай тааруулан `frame.phase` болон бусад frame values-ийг шинэчилж олон удаагийн render хийх ёстой.

## Public API

| API | Тайлбар |
|---|---|
| `renderMetronomeFrame(input): string` | Нэг frame-ийн complete SVG string гаргана. |
| `listDesigns(): readonly DesignSummary[]` | Picker-д зориулсан design ID, нэр, тайлбар, look, palette, `isLight`, logo-name metadata буцаана. |
| `DESIGNS` | Picker-ийн тогтсон дараалалтай `Design[]`. Дарааллыг өөрчлөхөд хэрэглэгчийн хадгалсан/дугаарласан сонголт өөр утгатай болох эрсдэлтэй. |
| `DEFAULT_DESIGN_ID` | Одоогийн default: `pendulum`. |
| `designById(id)` | ID тохирсон `Design` эсвэл `undefined`. Энэ нь render fallback-тай андуурагдахгүй тусдаа lookup API. |
| `ASPECT_RATIOS`, `canvasFor()`, `bands()`, `logoBox()` | Aspect/canvas болон layout-ийн helper-үүд. |
| `tempoStats()`, `statRow()`, `statColumnWidth()`, `statRowHeight()`, `LOGO_FRACTION` | Shared readout/logo layout helper ба constant. |
| `paletteForDesign()`, `isLightPalette()` | Theme helper-үүд. |
| `metronomeLogoName()`, `DEFAULT_LOGO_NAME` | Design ID-д тохирох logo-ийн нэр; `DEFAULT_LOGO_NAME` нь `sharing`. |
| `AspectRatio`, `Canvas`, `Design`, `DesignContext`, `MetronomeFrame`, `MetronomeRenderInput`, `Palette`, `DesignSummary` | TypeScript integration types. |

`DesignSummary.logo` нь `drum`, `piano`, `guitar`, `bass`, `violin`, `cello`, `vocal` эсвэл `sharing` зэрэг нэр байдаг. Engine нь эдгээрийг бодит image path болгон resolve хийхгүй; host нь өөрийн asset байршилд map хийх шаардлагатай. `logoUrl` өгөгдвөл SVG image-д ашиглах URL/data URI-г caller өгнө.

## Input contract ба normalize хийх дүрэм

`MetronomeRenderInput`:

| Field | Утга |
|---|---|
| `design` | Design registry-ийн string ID. |
| `aspect` | `'16x9'`, `'9x16'` эсвэл `'1x1'`. |
| `frame.beat` | Measure доторх 1-ээс эхэлсэн beat. |
| `frame.beatsPerBar` | Measure дахь beat-ийн тоо. |
| `frame.phase` | Одоогийн beat эхлэхэд `0`, дараагийн beat-ийн өмнө `1` болох progress. |
| `frame.bar` | 1-ээс эхэлсэн bar number. |
| `frame.bpm` | Tempo-ийн BPM утга. |
| `frame.timeSignature` | `{ numerator, denominator }` хэлбэрийн meter. |
| `title`, `subtitle` | Optional текст; орхисон эсвэл хоосон байвал текст нэмэхгүй. |
| `logoUrl` | Optional image URL эсвэл data URI; орхисон/хоосон үед logo дүрслэхгүй. |

Одоогийн runtime normalization:

- `beatsPerBar`, `beat`, `bar`, `bpm`, time signature-ийн numerator/denominator-ийг бүхэл тоо руу тоймлож, доод утгыг `1` болгоно. `beat` нь `1..beatsPerBar` хооронд хязгаарлагдана.
- `phase` нь finite биш бол `0`; бусад үед `0..1`-д clamp хийнэ.
- Энэ normalization нь `NaN`/`Infinity`-г бүх numeric field дээр тусгайлан шалгадаггүй. Иймээс JavaScript caller нь дээрх утгуудыг finite, утгатайгаар өгөх ёстой; edge case-уудыг “хязгаарлалт ба хийх ажлууд” хэсэгт тэмдэглэв.
- `src/svg.ts`-ийн `n()` helper SVG geometry-д очих finite биш тоог `0` болгодог ч энэ нь frame input-ийн бүрэн validation орлохгүй.
- User text SVG text content-д гарахаас өмнө XML-escape хийгддэг. `logoUrl`-ийн attribute escaping нь тусдаа кодтой бөгөөд бүрэн escaping-ийн test одоогоор байхгүй.

## Canvas, layout ба нийтлэг харагдах элемент

| Aspect | Canvas | Layout-ийн онцлог |
|---|---:|---|
| `16x9` | `1920 × 1080` | Title зүүн дээд хэсэгт; BPM/meter readout нь stage-ийн хоёр талд column хэлбэртэй; үндсэн stage өргөн байрлана. |
| `9x16` | `1080 × 1920` | Title/subtitle төвлөрнө; readout нь header-ийн доорх row; stage өндөр зай авна. |
| `1x1` | `1080 × 1080` | Title төвлөрнө; readout нь header-ийн доорх row; design-ууд дугуй/loop зохиомжийг ашиглах боломжтой. |

Layout-ийн нийтлэг баримт:

- `gutter()` нь canvas-ийн богино талаас `7.5%`.
- Canvas-ийн хэмжээс тогтмол; font, logo, stage хэмжээг богино талаас тооцно.
- `bands()` нь header болон design stage-ийг тусгаарлаж, shared readout-ийн зайг stage-д давхар ашиглуулахгүй.
- `tempoStats()` нь BPM тоо, `BPM` label болон time signature-г бүх design-д ижил байрлалын дүрмээр гаргана. Dark ground дээр шар/улаан өнгө; light ground дээр уншигдахаар гүн gold/улаан өнгө ашиглана.
- `LOGO_FRACTION = 0.16`; logo box нь top-left corner-д байна. Design-ууд өөрсдийн logo name-ийг `metronomeLogoName()`-аар тайлбарлуулж, бодит URL-ийг host өгнө.
- `pendulum` нь `ownHeader` ашиглан title/header зохиомжоо өөрөө тавьдаг; нийтлэг BPM/meter readout-ийг renderer мөн л нэмнэ.

## 11 design-ийн каталог

| № | ID | Нэр | Look | Үндсэн дүрслэл |
|---:|---|---|---|---|
| 1 | `pendulum` | Pendulum | Black & neon red | Дүүжинтэй metronome case, scale, beat number; өөрийн header layout-тай. |
| 2 | `beat-dots` | Beat Dots | Black & red | Medallion доторх count, beat бүрийн dot, цохилтын дараах богино pulse ring. |
| 3 | `pulse-ring` | Pulse Ring | Night blue | Beat бүрээр тэлж бүдгэрэх ring-үүд ба төвийн count. |
| 4 | `bar-meter` | Bar Meter | Paper & ink | Measure-ийн beat бүрийг bar-аар харуулна; өнгөрсөн/current/future beat-ийн төлөв ялгаатай. Portrait-д bar-уудыг хэвтээ байрлалд шилжүүлнэ. |
| 5 | `sweep-dial` | Sweep Dial | Charcoal & amber | Нэг бүтэн bar-ийн турш тойрох тасралтгүй hand/progress arc, beat бүрийн tick. |
| 6 | `big-number` | Big Number | White & red | Current beat-ийг том тоогоор; бусад beat-ийг нимгэн rail дээр. Portrait-д rail босоо. |
| 7 | `segment-ring` | Segment Ring | Deep green | Bar-ийг beat бүрийн wedge болгон хувааж, current/played/future хэсгийг ялгана. |
| 8 | `travel-line` | Travel Line | Off-white & ink blue | Marker beat-үүдийн хооронд явна; landscape-д хэвтээ, portrait-д босоо, square-д rounded loop. |
| 9 | `flash-frame` | Flash Frame | True black & hot red | Beat бүрээр canvas-ийн хүрээ цацарч, downbeat дээр илүү хүчтэй wash гаргана. |
| 10 | `bounce-ball` | Bounce Ball | Cream & orange | Beat pad-уудын хооронд нумлан үсэрч, beat дээр бууна; гурван aspect-д үндсэндээ хэвтээ. |
| 11 | `stack-blocks` | Stack Blocks | Slate & violet | Beat-ийн дугаарын байрлалуудыг block-оор дүрсэлж, ирэх beat-үүдийг outline хэлбэрээр үзүүлнэ; portrait/square-д босоо зохиомжтой. |

**Beat-ийн animation state-ийг Engine үүсгэдэггүй.** Design-ууд өгөгдсөн `beat` болон `phase`-ээс frame-ийн геометрээ тооцно. Caller нь хөгжмийн цагтай тохирсон frame state нийлүүлэх ёстой. Жишээлбэл, `sweep-dial` bar-ийн бүх уртад тасралтгүй progress гаргадаг бол олон design current beat болон phase-ийн pulse/decay-г голчлон ашиглана.

## Build ба verification

`package.json`-д байгаа гол scripts:

| Command | Одоогийн үүрэг |
|---|---|
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | `eslint src`. |
| `npm run format:check` | TypeScript source-д Prettier check. |
| `npm run test` / `npm test` | Bundle rebuild хийж, дараа нь Node `--test` ажиллуулна. |
| `npm run verify` | Typecheck → lint → format check → test/build. |
| `npm run build` | `src/index.ts`-ээс IIFE bundle `dist/metronome-engine.js` үүсгэнэ; global нэр `MetronomeDesigns`. |
| `npm run declarations` | `tsc --emitDeclarationOnly`; `tsconfig.json`-ийн дагуу declaration output `dist/` руу гарна. `build` script энэ алхмыг өөрөө ажиллуулахгүй. |

Орон нутгийн шалгалтын үр дүн:

- Archive-д `package-lock.json` байгаагүй тул `npm ci` ажиллахгүй (`npm ci` нь lockfile шаардсан).
- `npm install --no-package-lock --no-audit --no-fund`-ийн дараа `npm run verify` ажиллуулсан.
- **Үр дүн:** typecheck pass, lint pass, Prettier check pass, build pass, test **20/20 pass**.
- Энэ verification нь source/test code-ийн тухайн snapshot дээр хийгдсэн. Browser дээр харагдах байдлын review, website page integration, bundled file-ийн website-тэй sync-ийг энэ шалгалт нотлоогүй.

## Одоогоор тодорхой бус эсвэл сайжруулах шаардлагатай зүйл

1. **Frame-ийн runtime validation:** `phase`-ээс бусад numeric field-д `NaN`/`Infinity` ирэх нөхцөл тусгайлан хамгаалагдаагүй. Одоогийн invalid-input test нь zero, negative `bar`, болон `NaN phase`-ийг шалгадаг ч бусад field-ийн non-finite утгыг шалгахгүй.
2. **Package artifact/metadata:** `package.json` `types: dist/index.d.ts` гэж заадаг; declaration үүсгэх тусдаа script байна. `build` болон `verify` нь declaration generation-ийг ажиллуулахгүй. `private: true` тул README-ийн package import жишээ болон бодит хэрэглээний хэлбэрийг тодорхой болгох хэрэгтэй.
3. **Install reproducibility:** Archive-д lockfile байхгүй; цэвэр орчинд `npm ci` боломжгүй. `npm install` нь тухайн үед татагдсан dependency resolution-оос хамаарна.
4. **Website integration:** README нь bundle-ийг `website/assets/metronome-engine.js` рүү хуулж `website/video-create/metronome/` ашиглана гэж бичсэн. Engine archive-д sync script байхгүй, харин GitHub дахь одоогийн байрлал нь `Website/Metronome/Metronome Engine/`; target path/case болон build-to-site холболтыг тусад нь баталгаажуулах шаардлагатай.
5. **Visual test-ийн хамрах хүрээ:** 20 test нь SVG string, бүх design/aspect combination, сонгосон phase/beat болон layout contract-уудыг шалгадаг. Гэвч output-ийг browser эсвэл SVG parser-аар зураг болгон шалгахгүй; website дээр бодит asset ачаалж байгааг ч батлахгүй.
6. **Logo URL escaping:** `logo()` helper нь double quote-ийг escape хийдэг боловч бусад XML attribute character-д зориулсан нийтлэг escaping helper-ийг ашигладаггүй. Test нь URL-д зөвхөн энгийн URL хэлбэрийг шалгадаг.
7. **Design-ийн хязгаарын гэрээ:** Test нь `beatsPerBar`-ийн 1, 3, 5, 6, 7, 12 утгыг шалгадаг. Бүх design-д зориулсан дээд хязгаар эсвэл өндөр beat-count үед уншигдах байдлын universal guarantee кодод тодорхойлогдоогүй.

## Энэ ажлын хүрээнд хийгдээгүй зүйл

- Engine source code өөрчлөөгүй.
- Website/video/audio application-д integration хийгээгүй.
- Preview/video гаргаж харааны чанарыг баталгаажуулаагүй.
- `npm ci` ажиллаагүй тул lockfile-тэй clean install-ийг баталгаажуулаагүй; `npm install`-оор verification хийсэн.
