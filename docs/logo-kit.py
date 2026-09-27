"""One Illustrator file, eight logos.

Run it from anywhere; it reads website/assets/logo/drum.svg and writes
the eight sharing-*-logo-full.svg marks beside it. Nothing on the site
runs this -- it is kept because it is how those marks were made, and
because the next mark the owner draws goes through it unchanged.

`drum.svg`, `violin.svg` and `bass.svg` are the SAME document with a
different layer switched on: inside each are top-level groups named
Drum, Violin, Guitar, Vocal, Paino, Bass, Cello and MShairng, all but
one carrying display="none". So the family can be cut out of any one
of them, and the three uploads are three copies of the same 8.6 MB.

8.6 MB of which almost none is the drawing. Two things account for it:
nine copies of a 2480x3508 PNG of the whole artboard, which no browser
ever draws (removing all nine changes not one pixel of the render),
and Illustrator's own <i:aipgf> blob, the editable document zstd'd and
base64'd into the file. Both go.
"""
import io, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
LOGOS = HERE.parent / 'website' / 'assets' / 'logo'
SRC = str(LOGOS / 'drum.svg')
NAMES = ['Drum', 'Violin', 'Guitar', 'Vocal', 'Paino', 'Bass', 'Cello', 'MShairng']


def clean(text: str) -> str:
    """Everything a browser never draws."""
    text = re.sub(r'<image\b[^>]*/>', '', text)
    text = re.sub(r'<image\b[^>]*>.*?</image>', '', text, flags=re.S)
    text = re.sub(r'<i:aipgf\b.*?</i:aipgf>', '', text, flags=re.S)
    text = re.sub(r'<foreignObject\b.*?</foreignObject>', '', text, flags=re.S)
    return text




# ---------------------------------------------------------------------
# Turning the two words into outlines.
#
# The logo's only text is "Sharing" and the instrument's name, set in
# `Aka02` and `AJKunheingETM03` -- two fonts nobody's browser has, so
# an <img> pointing at this file draws them in whatever serif the
# machine falls back to. The word comes out in the wrong face, and a
# different wrong face on every machine.
#
# Illustrator embedded both fonts in the file as SVG <font> elements,
# 650 glyphs with their real outlines. Chrome dropped SVG fonts years
# ago and Firefox never had them, so the browser ignores them -- but
# they are the same outlines "Create Outlines" would have produced, and
# nothing stops US from using them. Each character becomes a <path>,
# placed at the pen and flipped (font coordinates run y-up from the
# baseline, SVG runs y-down), and the fonts then leave the file.
# ---------------------------------------------------------------------

ENTS = {'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'"}


def unescape(raw: str) -> str:
    def one(m):
        body = m.group(1)
        if body.startswith('#x') or body.startswith('#X'):
            return chr(int(body[2:], 16))
        if body.startswith('#'):
            return chr(int(body[1:]))
        return ENTS.get(body, m.group(0))
    return re.sub(r'&(#x?[0-9a-fA-F]+|[a-zA-Z]+);', one, raw)


def read_fonts(text: str):
    """{family: (units_per_em, default_advance, {char: (advance, d)})}"""
    fonts = {}
    for block in re.finditer(r'<font\b([^>]*)>(.*?)</font>', text, re.S):
        attrs, body = block.group(1), block.group(2)
        face = re.search(r'<font-face\b([^>]*)/>', body)
        family = re.search(r'font-family="([^"]*)"', face.group(1)).group(1)
        upem = float(re.search(r'units-per-em="([^"]*)"', face.group(1)).group(1))
        default = float(re.search(r'horiz-adv-x="([^"]*)"', attrs).group(1))
        glyphs = {}
        for g in re.finditer(r'<glyph\b([^>]*?)/?>', body):
            a = g.group(1)
            u = re.search(r'unicode="([^"]*)"', a)
            if not u:
                continue
            adv = re.search(r'horiz-adv-x="([^"]*)"', a)
            d = re.search(r'\sd="([^"]*)"', a)
            glyphs[unescape(u.group(1))] = (
                float(adv.group(1)) if adv else default,
                d.group(1) if d else '',
            )
        fonts[family] = (upem, default, glyphs)
    return fonts


def outline_text(text: str) -> str:
    fonts = read_fonts(text)
    if not fonts:
        return text

    def one(m):
        attrs, body = m.group(1), m.group(2)
        family = re.search(r'font-family="\'?([^"\']*)\'?"', attrs)
        size = re.search(r'font-size="([\d.]+)', attrs)
        if not family or not size or family.group(1) not in fonts:
            return m.group(0)
        upem, default, glyphs = fonts[family.group(1)]
        scale = float(size.group(1)) / upem
        carried = ''.join(
            f' {k}="{v}"' for k, v in re.findall(r'\s([\w-]+)="([^"]*)"', attrs)
            if k in ('transform', 'fill', 'display', 'opacity')
        )
        pen, parts = 0.0, []
        for ch in unescape(body):
            adv, d = glyphs.get(ch, (default, ''))
            if d:
                parts.append(
                    f'<path d="{d}" transform="matrix({scale:.6g} 0 0 {-scale:.6g} '
                    f'{pen * scale:.6g} 0)"/>'
                )
            pen += adv
        return f'<g{carried}>' + ''.join(parts) + '</g>'

    text = re.sub(r'<text\b([^>]*)>(.*?)</text>', one, text, flags=re.S)
    text = re.sub(r'<font\b.*?</font>', '', text, flags=re.S)
    text = re.sub(r'<defs\b[^>]*>\s*</defs>', '', text)
    return text


def span_of(text: str, name: str):
    """A <g id="NAME"> element's full extent, by balancing <g> and </g>."""
    m = re.search(r'<g\s+id="' + re.escape(name) + r'"[^>]*>', text)
    if not m:
        return None
    depth = 1
    for t in re.finditer(r'<g\b[^>]*?(/?)>|</g>', text[m.end():]):
        if t.group(0) == '</g>':
            depth -= 1
        elif not t.group(1):
            depth += 1
        if depth == 0:
            return m.start(), m.end() + t.end()
    return None


def one_instrument(text: str, keep: str) -> str:
    """Keep one instrument's group and delete the other seven outright."""
    for name in NAMES:
        if name == keep:
            continue
        sp = span_of(text, name)
        if sp:
            text = text[:sp[0]] + text[sp[1]:]
    sp = span_of(text, keep)
    if sp:
        head, body, tail = text[:sp[0]], text[sp[0]:sp[1]], text[sp[1]:]
        body = re.sub(r'^(<g\s+id="' + re.escape(keep) + r'")[^>]*>',
                      r'\1>', body, count=1)
        text = head + body + tail
    text = re.sub(r'<metadata\b.*?</metadata>', '', text, flags=re.S)
    text = re.sub(r'\n{2,}', '\n', text)
    return text


# ---------------------------------------------------------------------
# The box.
#
# Every mark the frames draw is 1414 x 2000 with its ink at columns 151
# to 1257 and rows 333 to 1649, because the frame's CSS pulls the
# layout box onto the ink with negative margins written as fractions of
# those numbers. A mark whose ink sits anywhere else lands anywhere
# else in the video. A raster had to be trimmed and pasted to get
# there; an SVG only needs a viewBox that says so, and then nothing in
# any page changes but the file extension.
# ---------------------------------------------------------------------

BOX = {'w': 1414.0, 'h': 2000.0, 'x': 151.0, 'y': 333.0, 'iw': 1106.0, 'ih': 1316.0}


def set_box(text: str, ink) -> str:
    """ink = (x, y, w, h) in the file's own user units."""
    ix, iy, iw, ih = ink
    # One scale for both axes: the ink's aspect is within a third of a
    # percent of the box's, and squashing a logo to hide that is worse
    # than the half-pixel of margin that centring it leaves.
    s = min(BOX['iw'] / iw, BOX['ih'] / ih)
    ox = BOX['x'] + (BOX['iw'] - iw * s) / 2
    oy = BOX['y'] + (BOX['ih'] - ih * s) / 2
    vx, vy = ix - ox / s, iy - oy / s
    vw, vh = BOX['w'] / s, BOX['h'] / s
    return re.sub(
        r'<svg\b([^>]*)>',
        lambda m: '<svg' + re.sub(
            r'\s(?:width|height|viewBox|enable-background|x|y)="[^"]*"', '', m.group(1)
        ) + f' width="{BOX["w"]:.0f}" height="{BOX["h"]:.0f}"'
          f' viewBox="{vx:.4f} {vy:.4f} {vw:.4f} {vh:.4f}">',
        text, count=1)


INK = {
    # Each mark's own ink box, in the file's user units, measured by
    # rendering it transparent at a known scale and reading the alpha.
    'drum': (186.06, 9.68, 466.83, 557.33),
    'violin': (186.06, 8.84, 466.83, 557.33),
    'guitar': (186.06, 10.10, 466.83, 557.33),
    'vocal': (186.06, 9.68, 466.83, 556.49),
    'paino': (186.06, 8.84, 466.83, 557.33),
    'bass': (184.37, 7.16, 469.35, 559.86),
    'cello': (185.64, 8.00, 467.67, 558.17),
    'mshairng': (186.06, 9.26, 466.83, 556.91),
}

FILES = {
    'drum': 'sharing-drum-logo-full', 'violin': 'sharing-violin-logo-full',
    'guitar': 'sharing-guitar-logo-full', 'vocal': 'sharing-vocal-logo-full',
    'paino': 'sharing-piano-logo-full', 'bass': 'sharing-bass-logo-full',
    'cello': 'sharing-cello-logo-full', 'mshairng': 'sharing-logo-full',
}


if __name__ == '__main__':
    source = outline_text(clean(io.open(SRC, encoding='utf-8', errors='replace').read()))
    for group in NAMES:
        key = group.lower()
        mark = set_box(one_instrument(source, group), INK[key])
        (LOGOS / f'{FILES[key]}.svg').write_text(mark, encoding='utf-8')
        print(f'{FILES[key]}.svg  {len(mark):>7,} bytes')
