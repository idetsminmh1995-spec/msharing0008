# MS Basic — license record (Part J task 3)

## What the earlier caveat said

`SoundFont-Collection-R2.md` and the R2 manifest both carried this warning:

> MS Basic upstream license file is retained verbatim but appears to reference
> MuseScore_General.sf2. Confirm redistribution terms with the rights holder
> before public R2 distribution.

The concern was that the retained license file is titled `MuseScore_General.sf2`
while the shipped binary is `MS Basic.sf3`, leaving it unclear whether the MIT
terms actually cover the file we distribute.

## What the file itself declares

The SF3's own `INFO` chunk (the SoundFont metadata a sampler reads) says, in
`MS Basic.sf3`:

```
ifil  MuseScore_General_HQ v0.2
icmt  Frank Wen, Michael Cowgill & S. Christian Collins - see license file for details
icmt  Released under the MIT license. Please see "MuseScore_General_HQ-License.md" for more information.
icop  Frank Wen 2000-02, Michael Cowgill 2014-17, S. Christian Collins 2018-20
```

So `MS Basic.sf3` is a **MuseScore_General_HQ v0.2** build, and it states its own
license inline: **MIT**. The retained `MS Basic_License.md` is that same MIT
license (it opens `# MuseScore_General.sf2`, the pre-rename title of the same
asset family), with the copyright and acknowledgement notices MIT requires be
kept.

## Resolution

The gap was a **naming** mismatch, not a licensing one. `MS Basic` is a
MuseScore_General variant; both are MIT. There is no separate rights-holder to
consult for the MIT grant, because the grant is already stated in the file and
in the retained license text.

The obligation MIT imposes is to ship the copyright and permission notice with
the copies. That is satisfied by keeping these objects next to the binary:

- `soundfonts/ms-basic/official-deprecated-master/MS Basic_License.md`
- `soundfonts/ms-basic/official-deprecated-master/MS Basic_Readme.md`
- `soundfonts/ms-basic/official-deprecated-master/MS_Basic_Changelog.md`

`MS Basic` stays an optional comparison asset. The default is now this
project's own `ms-core-sf3`, so even a stricter reading of the caveat would not
touch the default playback path.

## Scope note

This is an engineering record of what the distributed file declares about
itself, not legal advice. The MIT notice is present in the artifact and in the
retained license; the remaining action is to keep those files published
alongside the binary, which the manifest's `licenseFile` field already points
to.
