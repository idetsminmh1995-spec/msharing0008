# Part J — R2 asset rename (soundfonts/musescore-general → soundfonts/ms-core)

**Status: repo-side done; R2-side pending (needs bucket write access).**

The app and engine now address the default SoundFont by this project's own
id (`ms-core-sf3`) and a neutral R2 prefix (`ms-core/v0.2/`). The live R2
bucket still holds the objects under the old prefix
(`musescore-general/v0.2/`), so until the steps below run, a browser load of
`ms-core-sf3` will 404.

Nothing here changes the audio bytes. Only the object keys move, and the
manifest's ids/paths are rewritten to match. `manifest.json` in this folder
is the ready-to-upload result.

## 1. Copy the four objects to the new prefix

Both binaries and their two attribution files move from
`musescore-general/v0.2/` to `ms-core/v0.2/`. The binaries are renamed; the
attribution files keep their upstream names because the MIT license requires
their notices be retained verbatim.

| Old key | New key |
|---|---|
| `soundfonts/musescore-general/v0.2/MuseScore_General.sf3` | `soundfonts/ms-core/v0.2/ms-core.sf3` |
| `soundfonts/musescore-general/v0.2/MuseScore_General.sf2` | `soundfonts/ms-core/v0.2/ms-core.sf2` |
| `soundfonts/musescore-general/v0.2/MuseScore_General_License.md` | `soundfonts/ms-core/v0.2/MuseScore_General_License.md` |
| `soundfonts/musescore-general/v0.2/MuseScore_General_Readme.md` | `soundfonts/ms-core/v0.2/MuseScore_General_Readme.md` |

With `rclone` (R2 configured as a remote named `r2`):

```sh
B=r2:msharing0008/soundfonts
rclone copyto "$B/musescore-general/v0.2/MuseScore_General.sf3" "$B/ms-core/v0.2/ms-core.sf3"
rclone copyto "$B/musescore-general/v0.2/MuseScore_General.sf2" "$B/ms-core/v0.2/ms-core.sf2"
rclone copyto "$B/musescore-general/v0.2/MuseScore_General_License.md" "$B/ms-core/v0.2/MuseScore_General_License.md"
rclone copyto "$B/musescore-general/v0.2/MuseScore_General_Readme.md" "$B/ms-core/v0.2/MuseScore_General_Readme.md"
```

Content types must match the old objects: `.sf2`/`.sf3` as
`application/octet-stream`, the two `.md` files as `text/plain; charset=utf-8`.
Set the versioned objects to `Cache-Control: public, max-age=31536000, immutable`.

## 2. Upload the new manifest

```sh
rclone copyto manifest.json r2:msharing0008/soundfonts/manifest.json \
  --header-upload "Content-Type: application/json" \
  --header-upload "Cache-Control: no-cache"
```

## 3. Verify

```sh
BASE=https://pub-0b3068d26b824f80ad0e157d133e1f6c.r2.dev/soundfonts
for p in ms-core/v0.2/ms-core.sf3 ms-core/v0.2/ms-core.sf2; do
  curl -sS -o /dev/null -w "%{http_code} %{size_download} $p\n" -r 0-0 "$BASE/$p"
done
curl -sS "$BASE/manifest.json" | python3 -c "import json,sys; print(json.load(sys.stdin)['runtime']['defaultAssetId'])"
```

Expect `206` for both binaries and `ms-core-sf3` from the manifest.

## 4. Retire the old objects (only after 3 passes)

```sh
rclone delete r2:msharing0008/soundfonts/musescore-general/v0.2/
```

Keeping them is harmless but leaves the third-party-named prefix public,
which is the whole point of Part J.

## 5. Re-test playback

Open the editor and run **Test** and **Score** against `ms-core-sf3`. The
cache key changes with the URL, so this is a cold fetch of the renamed
object — the check that the rename is complete.
