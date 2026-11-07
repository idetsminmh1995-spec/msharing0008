# Multi-track playback event streams

**Status:** implemented; covered by the two-part MusicXML fixture and full playback tests.

The renderer already supports multiple MusicXML parts, and `getEventStream(playback)` already returns one score-wide, tick-sorted stream. This follow-up makes the track boundary explicit: `PlaybackData.tracks` lists each part's stable ID and optional display name in score order, every `NotationEvent` includes its `partId`, and `getTrackEventStream(playback, partId)` returns only that part's events. Existing consumers of the global stream are unchanged.

This is a data/API layer for a host app to select or route each track independently. It does not synthesize audio and does not provide mute, solo, volume, or transposition controls. AlphaTab's playback stack includes a synthesizer and per-track mixing methods for those controls, so a true audio mixer is a later, separate layer rather than something this host-driven notation engine should imply it has.[1] [2]

The `multi-part.musicxml` test verifies the `P1` Violin and `P2` Cello metadata, confirms each filtered stream contains the correct part's event, and checks that a missing ID yields an empty stream.

References

[1]: https://alphatab.net/docs/features/play-sync/per-track-mixing "AlphaTab per-track mixing"
[2]: https://alphatab.net/docs/features/play-sync/ "AlphaTab play and sync feature overview"
