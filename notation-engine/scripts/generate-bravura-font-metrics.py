#!/usr/bin/env python3
"""Generate Bravura Unicode cmap coverage and hmtx metrics from the bundled WOFF2.

Requires fontTools (tested with 4.68.0):
    python3 -m pip install fonttools
    python3 scripts/generate-bravura-font-metrics.py

The checked-in result is used at runtime to reject glyph names whose primary
SMuFL codepoint is absent from the bundled font. Advance widths are recorded
in raw font units so tests can independently validate metadata staff-space
widths against the actual OpenType hmtx table.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT / "dist" / "fonts" / "Bravura.woff2"
OUTPUT_PATH = ROOT / "src" / "glyphs" / "data" / "bravura_font_metrics.json"
EXPECTED_VERSION = 1.482


def main() -> None:
    font_bytes = FONT_PATH.read_bytes()
    font = TTFont(FONT_PATH)
    family = font["name"].getDebugName(1)
    version_name = font["name"].getDebugName(5) or ""
    version_match = re.search(r"([0-9]+(?:\.[0-9]+)+)", version_name)
    if family != "Bravura" or version_match is None:
        raise SystemExit(f"Unexpected font identity: {family!r} {version_name!r}")
    version = float(version_match.group(1))
    if version != EXPECTED_VERSION:
        raise SystemExit(f"Expected Bravura {EXPECTED_VERSION}, found {version}")

    # Bravura's glyphAdvanceWidths are expressed in staff spaces. One staff
    # space corresponds to 250 units in the bundled font's 1000-unit em.
    units_per_em = font["head"].unitsPerEm
    staff_space_units = 250
    if units_per_em != 1000:
        raise SystemExit(f"Expected 1000 units per em, found {units_per_em}")

    cmap: dict[int, str] = {}
    for table in font["cmap"].tables:
        if table.isUnicode():
            cmap.update(table.cmap)
    advance_widths = {
        f"U+{codepoint:04X}": int(font["hmtx"].metrics[glyph_name][0])
        for codepoint, glyph_name in sorted(cmap.items())
    }
    manifest = {
        "fontName": family,
        "fontVersion": version,
        "fontSha256": hashlib.sha256(font_bytes).hexdigest(),
        "unitsPerEm": units_per_em,
        "staffSpaceUnits": staff_space_units,
        "cmapAdvanceWidths": advance_widths,
    }
    OUTPUT_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(
        f"Wrote {OUTPUT_PATH.relative_to(ROOT)}: Bravura {version}, "
        f"{len(advance_widths)} Unicode cmap entries, SHA-256 {manifest['fontSha256']}"
    )


if __name__ == "__main__":
    main()
