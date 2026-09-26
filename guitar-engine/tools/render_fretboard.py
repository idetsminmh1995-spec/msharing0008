#!/usr/bin/env python3
"""
render_fretboard.py — the studio render of a fretboard.

The photoreal plugins do not DRAW their instruments at runtime. They
model one, light it, render it once at high resolution, and blit the
picture: Fusion360 and Keyshot, then a filmstrip. This is that step,
in numpy, so it lives in the repository and can be re-rendered rather
than being a binary nobody can reproduce.

What comes out is a strip: the nut at the left, the last fret at the
right, the board filling the height. It is generated from the real
measurements of an instrument -- the 17.817 rule, the nut width, the
string gauges -- so the calibration the engine needs (where every
fret wire and every string IS, in the file's own pixels) is exact by
construction rather than measured off a photograph afterwards.

    python3 tools/render_fretboard.py --model acoustic

Writes the image and prints the TypeScript literal for photo.ts.
"""
import argparse
import json
import math

import numpy as np
from PIL import Image

# --- the instrument, in millimetres -------------------------------
MODELS = {
    'acoustic': dict(
        scale=648.0, frets=20, nut_width=43.0, width_at_12=52.0,
        string_nut=36.0, string_at_12=45.0,
        board=(0.285, 0.170, 0.108), board_dark=(0.120, 0.066, 0.042),
        binding=(0.92, 0.86, 0.70), binding_mm=0.0,
        inlay='dot', inlay_color=(0.93, 0.92, 0.88),
        wound=3,
    ),
    'classical': dict(
        scale=650.0, frets=19, nut_width=52.0, width_at_12=62.0,
        string_nut=43.0, string_at_12=56.0,
        board=(0.240, 0.132, 0.080), board_dark=(0.098, 0.050, 0.030),
        binding=(0.86, 0.78, 0.60), binding_mm=0.0,
        inlay='none', inlay_color=(0.93, 0.92, 0.88),
        wound=3, nylon=True,
    ),
    'electric': dict(
        scale=628.0, frets=22, nut_width=42.0, width_at_12=51.0,
        string_nut=35.0, string_at_12=44.0,
        board=(0.150, 0.092, 0.062), board_dark=(0.055, 0.032, 0.022),
        binding=(0.95, 0.91, 0.78), binding_mm=1.8,
        inlay='block', inlay_color=(0.95, 0.94, 0.90),
        wound=3,
    ),
    'extended': dict(
        scale=648.0, frets=24, nut_width=43.0, width_at_12=54.0,
        string_nut=35.0, string_at_12=46.0,
        board=(0.135, 0.090, 0.070), board_dark=(0.050, 0.032, 0.024),
        binding=(0.9, 0.9, 0.9), binding_mm=0.0,
        inlay='dot', inlay_color=(0.88, 0.89, 0.92),
        wound=3,
    ),
}

INLAY_FRETS = {3, 5, 7, 9, 15, 17, 19, 21}
DOUBLE_INLAY = {12, 24}


def fret_mm(scale, n):
    """Where fret n's wire stands, from the nut. The 17.817 rule itself."""
    return scale - scale / (2 ** (n / 12.0))


# --- noise --------------------------------------------------------
def value_noise(shape, freq, rng):
    """Smooth noise at one frequency, bilinear between random points."""
    h, w = shape
    gh, gw = max(2, int(h * freq[0]) + 2), max(2, int(w * freq[1]) + 2)
    grid = rng.random((gh, gw))
    ys = np.linspace(0, gh - 1.001, h)
    xs = np.linspace(0, gw - 1.001, w)
    y0 = ys.astype(int)[:, None]
    x0 = xs.astype(int)[None, :]
    fy = (ys - y0[:, 0])[:, None]
    fx = (xs - x0[0, :])[None, :]
    # Smoothstep, so the grid does not show as diamonds.
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    a = grid[y0, x0]
    b = grid[y0, x0 + 1]
    c = grid[y0 + 1, x0]
    d = grid[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(shape, freq, rng, octaves=5, gain=0.5):
    out = np.zeros(shape)
    amp = 1.0
    total = 0.0
    f = np.array(freq, dtype=float)
    for _ in range(octaves):
        out += amp * value_noise(shape, f, rng)
        total += amp
        amp *= gain
        f = f * 2
    return out / total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='acoustic', choices=sorted(MODELS))
    ap.add_argument('--width', type=int, default=3600)
    ap.add_argument('--out', default=None)
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()
    spec = MODELS[args.model]
    rng = np.random.default_rng(args.seed)

    scale = spec['scale']
    last = spec['frets']
    # The strip: a little wood before the nut, and past the last fret.
    x_from = -14.0
    x_to = fret_mm(scale, last) + 26.0
    span = x_to - x_from
    W = args.width
    ppm = W / span
    # Tall enough for the widest end of the board and the shadow round it.
    board_at = lambda x: spec['nut_width'] + (spec['width_at_12'] - spec['nut_width']) * (x / fret_mm(scale, 12))
    strings_at = lambda x: spec['string_nut'] + (spec['string_at_12'] - spec['string_nut']) * (x / fret_mm(scale, 12))
    H = int(round((board_at(x_to) + 14.0) * ppm))
    H += H % 2
    mid = H / 2.0

    # Pixel grids, in millimetres from the nut and from the centre line.
    xs_mm = (np.arange(W) + 0.5) / ppm + x_from
    ys_mm = ((np.arange(H) + 0.5) - mid) / ppm
    X = np.repeat(xs_mm[None, :], H, axis=0)
    Y = np.repeat(ys_mm[:, None], W, axis=1)

    half = board_at(np.clip(X, 0, None)) / 2.0
    on_board = (np.abs(Y) <= half) & (X >= -1.2)

    # --- the wood -------------------------------------------------
    # Grain runs ALONG the neck, so the noise is stretched that way.
    # Two grains and a pore layer. One long and fine, the way the
    # streaks run down a quartersawn board; one broad and slow, which
    # is what stops it reading as a pattern; and the open pores that
    # rosewood has and a gradient does not.
    streak = fbm((H, W), (0.9, 0.010), rng, octaves=5)
    broad = fbm((H, W), (0.16, 0.045), rng, octaves=3)
    fine = fbm((H, W), (1.8, 0.06), rng, octaves=3)
    pore = fbm((H, W), (0.9, 0.9), rng, octaves=2)
    t = np.clip(streak * 0.55 + broad * 0.30 + fine * 0.15, 0, 1)
    t = np.clip((t - 0.26) * 1.7, 0, 1)
    # The dark lines: where the long grain runs deepest, not everywhere.
    lines = np.clip((streak - 0.62) * 6.0, 0, 1)
    t = np.clip(t - lines * 0.45, 0, 1)
    dark = np.array(spec['board_dark'])
    light = np.array(spec['board'])
    wood = dark[None, None, :] + (light - dark)[None, None, :] * t[:, :, None]
    wood *= (0.93 + 0.14 * pore)[:, :, None]

    colour = wood.copy()
    # Roundness: a fretboard is radiused, so it falls away at the edges.
    r = np.clip(np.abs(Y) / np.maximum(half, 1e-6), 0, 1)
    colour *= (1.0 - 0.20 * r ** 2.4)[:, :, None]
    # And the light comes from up and to the left.
    colour *= (1.10 - 0.20 * (Y / np.maximum(half, 1e-6)))[:, :, None]

    # --- inlays ---------------------------------------------------
    if spec['inlay'] != 'none':
        for n in range(1, last + 1):
            if n not in INLAY_FRETS and n not in DOUBLE_INLAY:
                continue
            cx = (fret_mm(scale, n) + fret_mm(scale, n - 1)) / 2.0
            offsets = [-strings_at(cx) * 0.28, strings_at(cx) * 0.28] if n in DOUBLE_INLAY else [0.0]
            for cy in offsets:
                if spec['inlay'] == 'block':
                    w2, h2 = 14.0, board_at(cx) * 0.30
                    d = np.maximum(np.abs(X - cx) / w2, np.abs(Y - cy) / h2)
                    m = np.clip((1.02 - d) * 24, 0, 1)
                else:
                    rad = 6.0 if n not in DOUBLE_INLAY else 5.4
                    d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / rad
                    m = np.clip((1.0 - d) * 18, 0, 1)
                m = m * on_board
                pearl = np.array(spec['inlay_color'])[None, None, :] * (
                    0.82 + 0.3 * fbm((H, W), (2.0, 0.6), rng, octaves=3)
                )[:, :, None]
                # Pearl catches the light in drifting bands. Driven by
                # noise, not by a sine: a regular stripe over every dot
                # reads as wallpaper, which is what it did.
                sheen = fbm((H, W), (0.9, 0.25), rng, octaves=3)
                pearl = np.clip(pearl * (0.92 + 0.22 * sheen[:, :, None]), 0, 1)
                colour = colour * (1 - m[:, :, None]) + pearl * m[:, :, None]

    # --- fret wires -----------------------------------------------
    wire_mm = 2.4
    wires = []
    for n in range(0, last + 1):
        fx = fret_mm(scale, n)
        wires.append(fx)
        width = 3.6 if n == 0 else wire_mm
        u = (X - fx) / (width / 2.0)          # -1..1 across the wire
        inside = np.abs(u) <= 1.0
        if not inside.any():
            continue
        # A round bar: the normal across it gives the highlight, and
        # the light sits a little above the centre, as it does on a
        # neck lying under a lamp.
        nz = np.sqrt(np.clip(1 - u ** 2, 0, 1))
        spec_term = np.clip(nz, 0, 1) ** 12
        body = 0.42 + 0.34 * nz + 0.55 * spec_term
        if n == 0:
            metal = np.array([0.93, 0.90, 0.82])[None, None, :]   # bone
        else:
            metal = np.array([0.80, 0.80, 0.83])[None, None, :]   # nickel
        bar = np.clip(metal * body[:, :, None], 0, 1)
        m = inside & on_board
        # The shadow the wire casts on the wood, on its lower side.
        shade = ((X - fx) > width / 2) & ((X - fx) < width / 2 + 0.9) & on_board
        colour = np.where(shade[:, :, None], colour * 0.55, colour)
        colour = np.where(m[:, :, None], bar, colour)

    # --- strings --------------------------------------------------
    gauges = [0.30, 0.38, 0.61, 0.81, 1.09, 1.35]
    if spec.get('nylon'):
        gauges = [0.71, 0.81, 1.00, 0.80, 0.90, 1.05]
    string_lines = []
    for i, g in enumerate(gauges):
        t_i = i / (len(gauges) - 1)
        y_at = lambda x: (-strings_at(np.clip(x, 0, None)) / 2.0
                          + strings_at(np.clip(x, 0, None)) * t_i)
        yy = y_at(X)
        string_lines.append((y_at(np.array([0.0]))[0], y_at(np.array([fret_mm(scale, last)]))[0]))
        rad = g / 2.0 + 0.10
        u = (Y - yy) / rad
        inside = np.abs(u) <= 1.0
        nz = np.sqrt(np.clip(1 - u ** 2, 0, 1))
        wound = i >= (len(gauges) - spec['wound']) and not spec.get('nylon')
        base = 0.55 + 0.30 * nz + 0.85 * np.clip(nz, 0, 1) ** 26
        if wound:
            # The winding: a ridge every wrap of the wire round the
            # core. Never finer than three pixels, or it turns into a
            # moire pattern instead of a string.
            period = max(g * 0.55, 3.0 / ppm)
            ridge = 0.5 + 0.5 * np.sin(X * (2 * math.pi / period))
            base = base * (0.88 + 0.18 * ridge)
            tint = np.array([0.74, 0.70, 0.60])
        else:
            tint = np.array([0.88, 0.88, 0.90]) if not spec.get('nylon') else np.array([0.93, 0.90, 0.80])
        line = np.clip(tint[None, None, :] * base[:, :, None], 0, 1)
        # Its shadow, a hair below it and soft at the edges: a hard
        # band reads as a second, darker string.
        d = (Y - yy - rad * 1.6) / (rad * 2.2)
        sh = np.clip(1.0 - d * d, 0, 1) * on_board
        colour = colour * (1.0 - 0.45 * sh)[:, :, None]
        colour = np.where((inside & (X > -1.0))[:, :, None], line, colour)

    # --- the edges of the board, and what is beyond them -----------
    edge = np.clip((half - np.abs(Y)) * ppm, 0, 6) / 6.0
    colour *= (0.72 + 0.28 * edge)[:, :, None]
    if spec['binding_mm'] > 0:
        b = (np.abs(Y) <= half) & (np.abs(Y) >= half - spec['binding_mm'])
        colour = np.where(b[:, :, None], np.array(spec['binding'])[None, None, :] * (0.8 + 0.3 * edge)[:, :, None], colour)

    # Outside the board: the neck's own wood at the very edge, then
    # away into the dark. The plugins all float the board on a dark
    # surround, and it is the surround that makes the board read as a
    # thing with a thickness rather than a picture pasted down.
    neck = np.array(spec['board']) * 1.9
    outside = ~on_board
    beyond = np.clip((np.abs(Y) - half) / 2.5, 0, 1)
    away = np.clip((np.abs(Y) - half - 2.5) / 7.0, 0, 1)
    behind = neck[None, None, :] * (1 - beyond * 0.35)[:, :, None]
    behind = behind * (1 - away * 0.92)[:, :, None] + 0.035
    colour = np.where(outside[:, :, None], behind, colour)

    # --- the studio: one broad sheen and a vignette ---------------
    sheen = np.clip(1.0 - np.abs((X - x_from) / span - 0.34) * 1.5, 0, 1) ** 2
    colour += (sheen * 0.05)[:, :, None]
    vx = np.clip(1.0 - np.abs((X - x_from) / span * 2 - 1) ** 3 * 0.30, 0, 1)
    vy = np.clip(1.0 - np.abs(Y / (H / 2 / ppm)) ** 3 * 0.28, 0, 1)
    colour *= (vx * vy)[:, :, None]

    # A little ambient, so the dark end of the grain is wood
    # rather than a hole in the picture.
    colour = np.clip(colour + 0.035, 0, 1)
    img = np.clip(colour, 0, 1)
    # A touch of grain, because a rendered surface with none reads as
    # plastic.
    img += (rng.random(img.shape) - 0.5) * 0.012
    out = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8), 'RGB')
    path = args.out or f'/tmp/fretboard-{args.model}.png'
    out.save(path)

    to_px_x = lambda mm: round((mm - x_from) * ppm, 1)
    to_px_y = lambda mm: round(mid + mm * ppm, 1)
    calib = {
        'width': W,
        'height': H,
        'frets': [to_px_x(w) for w in wires],
        'boardEndX': to_px_x(x_to),
        'stringsAtNut': [to_px_y(string_lines[0][0]), to_px_y(string_lines[-1][0])],
        'stringsAtEnd': [to_px_y(string_lines[0][1]), to_px_y(string_lines[-1][1])],
        'boardAtNut': [to_px_y(-board_at(0) / 2), to_px_y(board_at(0) / 2)],
        'boardAtEnd': [to_px_y(-board_at(x_to) / 2), to_px_y(board_at(x_to) / 2)],
    }
    print(path, f'{W}x{H}', f'{ppm:.2f} px/mm')
    print(json.dumps(calib))


if __name__ == '__main__':
    main()
