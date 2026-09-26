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
    # An OM with a natural spruce top, a rosewood board with small
    # dots, and a tortoiseshell scratchplate. No cutaway.
    'acoustic': dict(
        scale=645.0, frets=20, nut_width=44.0, width_at_12=53.0,
        string_nut=36.0, string_at_12=45.0,
        board=(0.285, 0.170, 0.108), board_dark=(0.120, 0.066, 0.042),
        binding=(0.92, 0.86, 0.70), binding_mm=0.0,
        inlay='dot', inlay_color=(0.93, 0.92, 0.88),
        wound=3,
        body='acoustic', joint_fret=14, top=(0.86, 0.71, 0.46),
        top_edge=(0.55, 0.36, 0.18), hole=100.0, plate=True,
        plate_color=(0.16, 0.055, 0.035), cutaway=False,
    ),
    'classical': dict(
        scale=650.0, frets=19, nut_width=52.0, width_at_12=62.0,
        string_nut=43.0, string_at_12=56.0,
        board=(0.240, 0.132, 0.080), board_dark=(0.098, 0.050, 0.030),
        binding=(0.86, 0.78, 0.60), binding_mm=0.0,
        inlay='none', inlay_color=(0.93, 0.92, 0.88),
        wound=3, nylon=True,
        body='acoustic', joint_fret=12, top=(0.88, 0.74, 0.47),
        top_edge=(0.58, 0.40, 0.20), hole=87.0, plate=False,
        cutaway=True,
    ),
    'electric': dict(
        scale=628.0, frets=22, nut_width=42.0, width_at_12=51.0,
        string_nut=35.0, string_at_12=44.0,
        board=(0.150, 0.092, 0.062), board_dark=(0.055, 0.032, 0.022),
        binding=(0.95, 0.91, 0.78), binding_mm=1.8,
        inlay='block', inlay_color=(0.95, 0.94, 0.90),
        wound=3,
        body='solid', joint_fret=16, top=(0.70, 0.50, 0.14),
        top_edge=(0.055, 0.035, 0.028), pickups=2, pickup_width=22.0,
        hardware=(0.80, 0.80, 0.82), cutaway=True,
    ),
    # A Stratocaster: transparent red over a double cutaway, a
    # rosewood board with small dots, and three single coils on a
    # cream scratchplate.
    'strat': dict(
        scale=648.0, frets=21, nut_width=42.0, width_at_12=51.5,
        string_nut=35.0, string_at_12=44.0,
        board=(0.230, 0.130, 0.085), board_dark=(0.095, 0.050, 0.032),
        binding=(0.92, 0.88, 0.74), binding_mm=0.0,
        inlay='dot', inlay_color=(0.92, 0.91, 0.86),
        wound=3,
        body='solid', joint_fret=17, top=(0.62, 0.05, 0.075),
        top_edge=(0.20, 0.015, 0.025), pickups=3, pickup_width=10.0,
        hardware=(0.84, 0.84, 0.85), cutaway=False,
        plate=True, plate_color=(0.93, 0.90, 0.78),
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
    ap.add_argument(
        '--view',
        default='guitar',
        choices=('guitar', 'board'),
        help='the whole instrument in a frame-shaped window, or the board on its own',
    )
    ap.add_argument('--aspect', type=float, default=3.4936, help='window width / height')
    ap.add_argument(
        '--strings-at',
        dest='strings_at',
        type=float,
        default=0.53,
        help="where down the window the strings sit: the engine's board band has its middle at 0.53",
    )
    ap.add_argument('--width', type=int, default=3600)
    ap.add_argument('--out', default=None)
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()
    spec = MODELS[args.model]
    rng = np.random.default_rng(args.seed)

    scale = spec['scale']
    last = spec['frets']
    board_at = lambda x: spec['nut_width'] + (spec['width_at_12'] - spec['nut_width']) * (x / fret_mm(scale, 12))
    strings_at = lambda x: spec['string_nut'] + (spec['string_at_12'] - spec['string_nut']) * (x / fret_mm(scale, 12))
    board_end = fret_mm(scale, last) + 8.0
    joint = fret_mm(scale, spec['joint_fret']) if args.view == 'guitar' else None
    hole_x = board_end + (spec.get('hole', 50.0) * 0.52)

    # The window. A bare board is a strip; a whole guitar is a WINDOW
    # on to one, cut to the shape of the frame it will be drawn in, so
    # that the body runs off the top and the bottom the way it does in
    # a photograph of a guitar taken along the neck.
    x_from = -14.0
    if args.view == 'guitar':
        x_to = (hole_x + spec['hole'] * 0.70) if spec['body'] == 'acoustic' else board_end + 118.0
    else:
        x_to = fret_mm(scale, last) + 26.0
    span = x_to - x_from
    W = args.width
    ppm = W / span
    if args.view == 'guitar':
        H = int(round(W / args.aspect))
        H += H % 2
        # The strings sit where the engine's board band has its middle,
        # so the picture fills the frame instead of hanging in it: the
        # hand legend's band above, the fret numbers' strip below.
        mid = H * args.strings_at
    else:
        # Tall enough for the widest end of the board and the shadow round it.
        H = int(round((board_at(x_to) + 14.0) * ppm))
        H += H % 2
        mid = H / 2.0

    # Pixel grids, in millimetres from the nut and from the centre line.
    xs_mm = (np.arange(W) + 0.5) / ppm + x_from
    ys_mm = ((np.arange(H) + 0.5) - mid) / ppm
    X = np.repeat(xs_mm[None, :], H, axis=0)
    Y = np.repeat(ys_mm[:, None], W, axis=1)

    half = board_at(np.clip(X, 0, np.float64(board_end))) / 2.0
    on_board = (np.abs(Y) <= half) & (X >= -1.2) & (X <= board_end)

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
                    # As wide as a third of its own fret and no wider:
                    # a fixed width fills the narrow frets completely
                    # and the board turns into a row of white slabs.
                    gap_mm = fret_mm(scale, n) - fret_mm(scale, n - 1)
                    w2 = min(14.0, gap_mm * 0.40)
                    h2 = board_at(cx) * 0.17
                    d = np.maximum(np.abs(X - cx) / w2, np.abs(Y - cy) / h2)
                    m = np.clip((1.02 - d) * 24, 0, 1)
                else:
                    rad = 6.0 if n not in DOUBLE_INLAY else 5.4
                    d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / rad
                    m = np.clip((1.0 - d) * 18, 0, 1)
                m = m * on_board
                pearl = np.array(spec['inlay_color'])[None, None, :] * (
                    0.68 + 0.26 * fbm((H, W), (2.0, 0.6), rng, octaves=3)
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

    # --- the body -------------------------------------------------
    #
    # A bare fretboard is not a guitar, and it does not read as one.
    # From the joint the instrument opens out into a body far wider
    # than the window, so what is drawn is the part a player sees
    # along their own neck: the cutaway where the two meet, the top,
    # and the soundhole or the pickups on it.
    if joint is not None:
        u = X - joint
        neck_half = board_at(joint) / 2.0 + 2.2
        # The two sides are not the same shape. The bass side climbs
        # away from the heel at once; the treble side hugs the neck
        # first and then flares, which is what a cutaway IS.
        def flare(start, run, to):
            t = np.clip((u - start) / run, 0, 1)
            t = t * t * (3 - 2 * t)
            return neck_half + (to - neck_half) * t

        if spec['body'] == 'acoustic':
            bass = flare(-6.0, 120.0, 165.0)
            # A cutaway is the treble side hugging the neck before it
            # flares. Without one the two sides are the same shape.
            treble = flare(24.0, 130.0, 150.0) if spec.get('cutaway', True) else flare(-6.0, 120.0, 162.0)
        else:
            bass = flare(-4.0, 58.0, 150.0)
            # The horn and the cutaway behind it. The scoop is a
            # gaussian rather than a notch, because a cutaway is a
            # curve and a notch put two corners in the silhouette.
            # A double cutaway has one on the bass side too.
            treble = flare(-2.0, 62.0, 150.0)
            treble = np.maximum(treble - 34.0 * np.exp(-(((u - 46.0) / 30.0) ** 2)), neck_half * 0.96)
            if not spec.get('cutaway', True):
                bass = np.maximum(bass - 30.0 * np.exp(-(((u - 40.0) / 28.0) ** 2)), neck_half * 0.96)
        body_half = np.where(Y < 0, treble, bass)
        on_body = (u > -8.0) & (np.abs(Y) <= body_half)

        # The top. Lit from the left, and darkening towards its edge
        # the way a sunburst or a shaded top does.
        along = np.clip(u / 260.0, 0, 1)
        out = np.clip(np.abs(Y) / 150.0, 0, 1)
        grain_top = fbm((H, W), (0.5, 0.008), rng, octaves=4)
        top_c = np.array(spec['top'])
        edge_c = np.array(spec['top_edge'])
        shade = np.clip(out ** 2.2 * 0.9 + along * 0.10, 0, 1)
        body = top_c[None, None, :] * (1 - shade)[:, :, None] + edge_c[None, None, :] * shade[:, :, None]
        if spec['body'] == 'acoustic':
            # Spruce: fine straight grain running down the top.
            body = body * (0.93 + 0.13 * grain_top)[:, :, None]
        else:
            body = body * (0.97 + 0.06 * grain_top)[:, :, None]
        # A broad highlight where the light lands on it.
        gleam = np.clip(1.0 - np.abs((u - 70.0) / 150.0), 0, 1) ** 2
        gleam = gleam * np.clip(1.0 - np.abs((Y + 40.0) / 90.0), 0, 1)
        body = body + (gleam * 0.10)[:, :, None]

        if spec['body'] == 'acoustic':
            # The soundhole: a shadow with a lip, not a black disc, and
            # the rosette ring round it.
            rh = spec['hole'] / 2.0
            d = np.sqrt((X - hole_x) ** 2 + Y ** 2)
            ring = np.clip(1.0 - np.abs(d - rh * 1.14) / (rh * 0.10), 0, 1)
            rose = np.array([0.30, 0.20, 0.11])
            body = body * (1 - ring * 0.9)[:, :, None] + (rose[None, None, :] * ring[:, :, None]) * 0.9
            hole = np.clip((rh - d) * ppm * 0.5, 0, 1)
            # Inside it: dark, with the light that gets in landing on
            # the far wall low down -- which is what stops a soundhole
            # reading as a black sticker.
            lit = np.clip((Y - rh * 0.25) / (rh * 0.75), 0, 1) ** 1.6
            depth = 0.035 + 0.13 * lit
            inner = np.stack([depth, depth * 0.78, depth * 0.58], axis=2)
            body = body * (1 - hole[:, :, None]) + inner * hole[:, :, None]
            if spec['plate']:
                # The scratchplate: a teardrop below the hole and to
                # the bridge side of it, in dark tortoiseshell.
                pu = (X - hole_x - rh * 0.70) / (rh * 1.30)
                pv = (Y - rh * 1.10) / (rh * 0.64)
                d2 = pu * pu + pv * pv
                plate = np.clip((1.0 - d2) * 9, 0, 1)
                shade = np.array(spec.get('plate_color', (0.075, 0.042, 0.028)))
                # Tortoiseshell is mottled, and it catches the light
                # along its edge, which is what makes it read as a
                # thing stuck on the top rather than a stain in it.
                mottle = 0.72 + 0.55 * fbm((H, W), (1.1, 0.35), rng, octaves=3)
                face = np.clip(shade[None, None, :] * mottle[:, :, None], 0, 1)
                lip = np.clip((1.0 - np.abs(d2 - 0.93) / 0.07), 0, 1) * 0.55
                face = np.clip(face + lip[:, :, None] * 0.35, 0, 1)
                body = body * (1 - plate[:, :, None]) + face * plate[:, :, None]
        else:
            hw = np.array(spec['hardware'])
            count = spec.get('pickups', 2)
            pw = spec.get('pickup_width', 19.0)
            ph = strings_at(board_end) * 0.82
            step = 62.0 if count < 3 else 48.0
            if spec.get('plate'):
                # The scratchplate the pickups are mounted through,
                # which on a Stratocaster is most of what is seen of
                # the body at all.
                px0 = board_end - 2.0
                px1 = board_end + 18.0 + (count - 1) * step + 52.0
                half_pl = ph * 1.30
                # A rounded shape, not a box: squared off nowhere, and
                # narrowing where it passes the neck pocket. A hard
                # corner beside the board is the one thing that says
                # "rectangle" rather than "scratchplate".
                pu = np.clip((X - px0) / (px1 - px0), 0, 1)
                waist = 1.0 - 0.55 * np.exp(-((pu / 0.16) ** 2)) - 0.5 * np.clip((pu - 0.88) / 0.12, 0, 1) ** 2
                pl = (X > px0 - 1.0) & (X < px1) & (np.abs(Y) < half_pl * np.clip(waist, 0, 1))
                shade = np.array(spec.get('plate_color', (0.9, 0.88, 0.78)))
                lit = np.clip(1.0 - np.abs(Y) / (half_pl * 1.35), 0, 1)
                body = np.where(pl[:, :, None], (shade[None, None, :] * (0.80 + 0.28 * lit)[:, :, None]), body)
            for n in range(count):
                cx = board_end + 26.0 + n * step
                inbox = (np.abs(X - cx) <= pw / 2) & (np.abs(Y) <= ph / 2)
                surround = (np.abs(X - cx) <= pw / 2 + 3.5) & (np.abs(Y) <= ph / 2 + 4.0)
                body = np.where(surround[:, :, None], np.array([0.045, 0.045, 0.05])[None, None, :], body)
                across = np.clip(1 - ((Y / (ph / 2)) ** 2), 0, 1)
                cover = hw[None, None, :] * (0.72 + 0.34 * across)[:, :, None]
                body = np.where(inbox[:, :, None], np.clip(cover, 0, 1), body)
                # The pole pieces, one per string, on a single coil.
                if pw < 14.0:
                    for i in range(6):
                        sy = -strings_at(cx) / 2 + strings_at(cx) * (i / 5.0)
                        pole = ((X - cx) ** 2 + (Y - sy) ** 2) < (pw * 0.22) ** 2
                        body = np.where(pole[:, :, None], (hw * 0.62)[None, None, :], body)
            # The bridge, at the end of what is seen.
            bx = board_end + 30.0 + (count - 1) * step + 54.0
            bridge = (np.abs(X - bx) <= 7.0) & (np.abs(Y) <= strings_at(board_end) * 0.75)
            body = np.where(bridge[:, :, None], (hw * 0.8)[None, None, :], body)

        # The binding round the edge, and the shadow the body sits in.
        rim = np.clip((body_half - np.abs(Y)) * ppm, 0, 5) / 5.0
        body = body * (0.55 + 0.45 * rim)[:, :, None]
        bind = (np.abs(Y) <= body_half) & (np.abs(Y) >= body_half - 2.6)
        body = np.where(bind[:, :, None], np.array(spec['binding'])[None, None, :] * 0.92, body)
        behind = np.where(on_body[:, :, None], np.clip(body, 0, 1), behind)

    colour = np.where(outside[:, :, None], behind, colour)

    # --- strings --------------------------------------------------
    gauges = [0.30, 0.38, 0.61, 0.81, 1.09, 1.35]
    if spec.get('nylon'):
        gauges = [0.71, 0.81, 1.00, 0.80, 0.90, 1.05]
    for i, g in enumerate(gauges):
        t_i = i / (len(gauges) - 1)
        y_at = lambda x: (-strings_at(np.clip(x, 0, None)) / 2.0
                          + strings_at(np.clip(x, 0, None)) * t_i)
        yy = y_at(X)
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
    # Measured at the SAME two places the engine interpolates between:
    # the nut, and whatever `boardEndX` says. Reporting the strings at
    # the last fret while pointing boardEndX past the soundhole would
    # stretch the fan over the wrong distance and put every mark on
    # the wrong string at the body end.
    calib = {
        'width': W,
        'height': H,
        'fit': 'frame' if args.view == 'guitar' else 'board',
        'frets': [to_px_x(w) for w in wires],
        'boardEndX': to_px_x(x_to),
        'stringsAtNut': [to_px_y(-strings_at(0.0) / 2), to_px_y(strings_at(0.0) / 2)],
        'stringsAtEnd': [to_px_y(-strings_at(x_to) / 2), to_px_y(strings_at(x_to) / 2)],
        'boardAtNut': [to_px_y(-board_at(0.0) / 2), to_px_y(board_at(0.0) / 2)],
        'boardAtEnd': [to_px_y(-board_at(x_to) / 2), to_px_y(board_at(x_to) / 2)],
    }
    print(path, f'{W}x{H}', f'{ppm:.2f} px/mm')
    print(json.dumps(calib))


if __name__ == '__main__':
    main()
