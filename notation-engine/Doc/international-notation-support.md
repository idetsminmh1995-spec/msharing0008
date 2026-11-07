# International notation support: current boundary and next steps

## What the engine now supports

The MusicXML parser now reads `<pitch><alter>` as a decimal number of semitones instead of truncating it to an integer. It preserves the exact source accidental glyph when MusicXML supplies a `smufl` attribute, and it maps all 40 named values in MusicXML 4.0's `accidental-value` type to the corresponding bundled SMuFL glyph. That list includes Arel–Ezgi–Uzdilek (AEU) makam signs, Turkish folk comma signs, Persian sori/koron, arrow accidentals, and the quarter-/three-quarter-tone family.[1][2][3]

For a fractional pitch with no explicit accidental value, the renderer has default glyphs for common 24-EDO alterations in the supported range. It keeps other finite decimal pitch values in the score model. When no matching glyph is available, it reports `UNSUPPORTED_PITCH_ALTER` and does not invent a nearby sharp or flat. A source-provided, bundled SMuFL glyph remains the most precise display instruction. SMuFL glyph availability is not, by itself, a pitch-tuning or notation-system definition.[4][5][6]

This improves MusicXML import and rendering; it does **not** make every world notation system a supported mode. The current renderer still lays out the conventional staff model. A glyph set, or a fractional semitone field, cannot encode all the contextual pitch, rhythmic, modal, and structural semantics of another tradition.

## Why other notation families need their own semantics

**Jianpu (Chinese numbered notation)** writes tonic-relative scale degrees as 1–7. A tonic declaration is needed to relate them to sounding pitches. Octave dots and rhythmic marks have position-sensitive meanings; a dot above a numeral is not the same thing as an augmentation dot after it. Jianpu should therefore be a separate profile that retains degree spelling and duration marks, not a staff renderer with numeric noteheads.[7][8]

**Hindustani Sargam/swaralipi** uses Sa–Re–Ga–Ma–Pa–Dha–Ni relative to a chosen tonic. Bhatkhande and Paluskar are distinct conventions, and pitch marks, octave, tala cycles and rhythmic grouping must retain their system context. A fixed MIDI pitch or a generic semitone alteration cannot be inferred from a swara syllable without the tonic and tuning policy. SangeetXML is a research proposal for Indic score exchange, not evidence of a broadly adopted universal format.[9][10]

**Turkish makam AEU notation** uses distinct comma-scale accidental identities, while makam theory and usul cycles supply information beyond semitone pitch and ordinary bar duration. The AEU symbols are registered in SMuFL, but that glyph registry does not define how to convert every written value to a performed frequency. Keep the written accidental separate from any explicit tuning realization.[4][11]

**Kepatihan cipher notation** represents scale degrees in a selected laras, such as sléndro or pélog. Its dots, rests/sustains, damping, gatra, kenong and gong-cycle markers carry context that should not be silently converted to Western pitch classes or ordinary measures. Published digital representations are useful examples, but the reviewed sources do not establish a shared Kepatihan interchange standard.[12][13]

**Byzantine chant neumes** primarily express intervallic motion and modal relationships, with temporal and qualitative signs attached to groups and positioned relative to other symbols. Unicode provides encoded characters, not a complete semantic or layout model. Rendering the codepoints alone would not implement the notation.[14][15]

These five examples are representative, not exhaustive, and local, historical, editorial and performance variants matter within each family.

## Recommended implementation boundary

Add future traditions as explicit notation profiles with their own importers, semantic models, glyph/placement rules, and fixtures. They may share a neutral event timeline for playback, but should preserve their native pitch references, rhythmic cycles, ornaments, and written symbols instead of flattening them prematurely into Western staff values. The profile should state which source conventions it implements and which data cannot round-trip through generic MusicXML.

For each profile, acceptance should require both semantic tests and rendered score fixtures validated against a domain-specific source. Test that pitch and rhythm context survives parse/render conversion, that visually similar marks with different meanings remain distinct, and that unsupported values produce a clear diagnostic rather than a plausible-looking guess. Jianpu is a practical first independent profile; Sargam, Kepatihan and Byzantine neumes need their own data and layout rules. The current AEU work is a MusicXML/SMuFL engraving increment, not complete makam or tuning-system support.

## References

[1]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/alter/ "MusicXML 4.0 alter element"
[2]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/accidental-value/ "MusicXML 4.0 accidental-value"
[3]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/ "MusicXML 4.0 accidental element"
[4]: https://w3c.github.io/smufl/latest/tables/arel-ezgi-uzdilek-aeu-accidentals.html "SMuFL Arel-Ezgi-Uzdilek accidentals"
[5]: https://w3c.github.io/smufl/latest/tables/turkish-folk-music-accidentals.html "SMuFL Turkish folk music accidentals"
[6]: https://w3c.github.io/smufl/latest/tables/persian-accidentals.html "SMuFL Persian accidentals"
[7]: http://anuccme.com/jianpu "ANU Chinese Classical Music Ensemble Jianpu guide"
[8]: https://opensheetmusicdisplay.org/blog/jianpu-mode/ "OpenSheetMusicDisplay Jianpu mode"
[9]: https://www.tenor-conference.org/proceedings/2016/05_Misra_tenor2016.pdf "Swaralipi: A Framework for Transcribing and Rendering Indic Music Sheet"
[10]: https://dl.acm.org/doi/fullHtml/10.1145/3469877.3493697 "SangeetXML: An XML Format for Score Retrieval for Indic Music"
[11]: https://ismir2012.ismir.net/event/papers/223_ISMIR_2012.pdf "A Turkish Makam Music Symbolic Database for Music Information Retrieval: SymbTr"
[12]: https://manifold.uhpress.hawaii.edu/read/traditional-music-in-modern-java/section/b050e583-ec90-4774-998c-2d33d51a908a "From Oral to Written Tradition in Javanese Music"
[13]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10885543/ "Notation of Javanese Gamelan dataset for traditional music applications"
[14]: https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-21/ "Unicode Standard Chapter 21: Byzantine Musical Symbols"
[15]: https://www.unicode.org/notes/tn20/byznotation.1.1.pdf "Unicode Technical Note 20: Byzantine Musical Notation"
