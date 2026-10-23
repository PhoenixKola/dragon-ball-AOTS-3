"""Procedural (tool-drawn) pixel art: provisional NPC sprites/portraits and minion enemies.
Everything here is quality='procedural_fallback', approved=False. No text is ever drawn into a sprite."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import alpha_mask, dilate, save_frame, trim_pad, flip

OUTLINE = (26, 20, 34, 255)


class Pix:
    """Tiny logical-pixel canvas; upscaled with nearest-neighbour on render."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), dtype=np.uint8)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = (*c[:3], 255)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.px(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / max(rx, 0.5)) ** 2 + ((y - cy) / max(ry, 0.5)) ** 2 <= 1.0:
                    self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c, t=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / max(n, 1)
            y = y0 + (y1 - y0) * i / max(n, 1)
            for dx in range(t):
                for dy in range(t):
                    self.px(round(x) + dx, round(y) + dy, c)

    def shade(self, c_light=None, c_dark=None):
        """Cheap two-tone shading: lighten the top-left rim, darken the bottom-right rim of every opaque pixel run."""
        al = self.a[..., 3] > 0
        up = np.zeros_like(al); up[1:] = al[:-1]
        left = np.zeros_like(al); left[:, 1:] = al[:, :-1]
        dn = np.zeros_like(al); dn[:-1] = al[1:]
        rt = np.zeros_like(al); rt[:, :-1] = al[:, 1:]
        light = al & (~up | ~left)
        dark = al & (~dn | ~rt) & ~light
        rgb = self.a[..., :3].astype(int)
        rgb[light] = np.minimum(rgb[light] + 38, 255)
        rgb[dark] = np.maximum(rgb[dark] - 38, 0)
        self.a[..., :3] = rgb.astype(np.uint8)

    def outline(self, c=OUTLINE):
        al = self.a[..., 3] > 0
        ring = dilate(np.pad(al, 1), 1)[1:-1, 1:-1] & ~al
        # pad canvas implicitly: ring pixels are only drawn inside bounds
        self.a[ring] = c

    def image(self, scale=1):
        im = Image.fromarray(self.a, 'RGBA')
        return im.resize((self.w * scale, self.h * scale), Image.NEAREST) if scale != 1 else im


def flash(im, amt=0.55):
    a = np.array(im.convert('RGBA')).astype(float)
    m = a[..., 3] > 0
    a[m, :3] = a[m, :3] * (1 - amt) + 255 * amt
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def darken(im, k=0.6):
    a = np.array(im.convert('RGBA')).astype(float)
    m = a[..., 3] > 0
    a[m, :3] *= k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


def shift(im, dx, dy, pad=40):
    c = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    c.alpha_composite(im, (pad + dx, pad + dy))
    return c


def smoke(im, n=6, seed=1):
    rng = np.random.default_rng(seed)
    c = shift(im, 0, 0, 20)
    a = np.array(c)
    ys, xs = np.where(a[..., 3] > 0)
    for _ in range(n):
        x = int(rng.integers(xs.min(), xs.max())); y = int(rng.integers(max(0, ys.min() - 12), ys.min() + 6))
        r = int(rng.integers(3, 7))
        a[max(0, y - r):y + r, max(0, x - r):x + r] = (70, 70, 80, 255)
    return Image.fromarray(a, 'RGBA')


# ===================================================================== MINIONS
def _fin(p: Pix, scale=4):
    p.shade()
    p.outline()
    return p.image(scale)


def d_probe(pose):
    p = Pix(48, 48)
    cx, cy = 22, 28
    p.line(cx, cy - 14, cx, cy - 20, (150, 160, 170)); p.rect(cx - 1, cy - 22, cx + 1, cy - 20, (255, 90, 90))
    p.ellipse(cx, cy, 13, 12, (116, 138, 160))
    p.ellipse(cx - 4, cy - 5, 5, 3, (170, 190, 208))
    p.rect(cx - 9, cy - 1, cx + 9, cy + 1, (84, 100, 120))
    ex = cx + (3 if pose == 'attack' else 0)
    p.ellipse(ex, cy, 5 if pose != 'attack' else 6, 5 if pose != 'attack' else 6, (232, 40, 40))
    p.px(ex - 2, cy - 2, (255, 255, 255)); p.px(ex - 1, cy - 2, (255, 255, 255))
    p.rect(cx - 9, cy + 11, cx - 6, cy + 14, (255, 150, 40)); p.rect(cx + 6, cy + 11, cx + 9, cy + 14, (255, 150, 40))
    if pose == 'attack':
        p.line(cx + 8, cy, 46, cy, (255, 80, 80), 2)
    return _fin(p)


def d_drain(pose):
    p = Pix(56, 48)
    cx, cy = 26, 18
    p.ellipse(cx, cy, 20, 7, (78, 62, 116))
    p.ellipse(cx, cy - 3, 14, 4, (116, 98, 158))
    p.ellipse(cx, cy + 1, 6, 4, (70, 210, 240)); p.px(cx - 2, cy - 1, (255, 255, 255))
    ext = 8 if pose == 'attack' else 0
    for i, ox in enumerate((-14, -6, 6, 14)):
        x = cx + ox
        for k in range(6 + ext):
            p.px(x + (k // 3 if ox > 0 else -(k // 3)) + (k * 0 if pose != 'attack' else k // 2), cy + 7 + k, (60, 170, 200))
        p.rect(x - 1, cy + 13 + ext, x + 1, cy + 14 + ext, (130, 240, 255))
    return _fin(p)


def d_sentinel(pose):
    p = Pix(48, 56)
    p.rect(14, 44, 21, 52, (84, 92, 104)); p.rect(26, 44, 33, 52, (84, 92, 104))
    p.rect(12, 52, 22, 54, (60, 66, 76)); p.rect(25, 52, 35, 54, (60, 66, 76))
    p.rect(12, 22, 35, 44, (126, 136, 148))
    p.rect(16, 26, 31, 32, (96, 106, 120)); p.rect(21, 34, 26, 38, (240, 190, 40))
    p.ellipse(23, 15, 8, 7, (138, 148, 160)); p.rect(18, 14, 29, 17, (255, 196, 40))
    p.ellipse(10, 24, 5, 5, (150, 160, 172)); p.ellipse(37, 24, 5, 5, (150, 160, 172))
    if pose == 'attack':
        p.rect(37, 26, 46, 33, (110, 120, 134)); p.rect(44, 25, 47, 34, (200, 210, 220))
    else:
        p.rect(5, 26, 9, 38, (110, 120, 134)); p.rect(37, 26, 41, 38, (110, 120, 134))
    return _fin(p)


def d_grid(pose):
    p = Pix(48, 56)
    p.rect(8, 50, 12, 54, (70, 74, 90)); p.rect(34, 50, 38, 54, (70, 74, 90))
    p.rect(8, 6, 38, 50, (54, 58, 74))
    p.rect(11, 9, 35, 47, (14, 16, 24))
    col = (255, 80, 80) if pose == 'attack' else (80, 240, 130)
    for x in range(12, 35, 5):
        p.line(x, 10, x, 46, col)
    for y in range(12, 46, 6):
        p.line(12, y, 34, y, col)
    for (x, y) in ((8, 6), (36, 6), (8, 48), (36, 48)):
        p.ellipse(x + 1, y + 1, 2, 2, (250, 220, 70))
    return _fin(p)


def d_husk(pose):
    p = Pix(48, 56)
    g, g2 = (92, 168, 64), (58, 118, 46)
    p.ellipse(22, 36, 12, 14, g)
    p.ellipse(22, 22, 9, 8, g)
    p.line(16, 14, 12, 6, g2, 2); p.line(28, 14, 32, 6, g2, 2)
    p.ellipse(22, 40, 6, 9, (30, 22, 44))
    p.rect(17, 21, 19, 23, (20, 14, 30)); p.rect(25, 21, 27, 23, (20, 14, 30))
    for (x, y) in ((16, 32), (28, 30), (20, 44), (26, 46), (14, 40), (30, 40)):
        p.px(x, y, g2); p.px(x + 1, y, g2)
    p.rect(14, 48, 18, 54, g2); p.rect(26, 48, 30, 54, g2)
    ax = 36 if pose == 'attack' else 31
    p.line(30, 30, ax, 34, g, 3)
    return _fin(p)


def d_shadow(pose):
    p = Pix(48, 56)
    s, s2 = (44, 30, 70), (70, 50, 108)
    p.ellipse(22, 14, 7, 7, s)
    p.ellipse(22, 32, 9, 13, s)
    for i in range(7):
        p.rect(14 + i * 3, 42 + (i % 2) * 3, 16 + i * 3, 52 + (i % 3), s)
    ax = 38 if pose == 'attack' else 31
    p.line(28, 26, ax, 32, s, 3); p.line(16, 26, 10, 34, s, 3)
    p.rect(18, 12, 20, 14, (255, 70, 220)); p.rect(24, 12, 26, 14, (255, 70, 220))
    p.shade()
    out = p.image(4)
    return glow_rim(out, (170, 70, 220))


def glow_rim(im, color):
    c = shift(im, 0, 0, 16)
    m = alpha_mask(c, 40)
    ring = dilate(m, 4) & ~m
    a = np.array(c)
    a[ring] = (*color, 150)
    out = Image.fromarray(a, 'RGBA')
    out.alpha_composite(c)
    return out


def d_cellprobe(pose):
    p = Pix(44, 44)
    g, g2 = (112, 190, 70), (62, 130, 46)
    p.ellipse(20, 24, 10, 10, g)
    for ang in range(0, 360, 45):
        x = 20 + int(round(13 * np.cos(np.radians(ang)))); y = 24 + int(round(13 * np.sin(np.radians(ang))))
        p.line(20, 24, x, y, g2, 2)
    p.ellipse(20, 24, 5, 5, (252, 240, 255)); p.ellipse(21 + (2 if pose == 'attack' else 0), 24, 2, 2, (150, 20, 120))
    p.line(8, 30, 2, 38, g2, 2)
    return _fin(p)


def d_trainer(pose):
    p = Pix(48, 52)
    y, y2 = (214, 200, 128), (150, 140, 84)
    p.ellipse(22, 40, 14, 5, (70, 70, 80))
    p.ellipse(22, 28, 12, 11, y)
    p.ellipse(22, 12, 8, 8, y)
    p.rect(17, 11, 27, 13, (40, 60, 90))
    p.ellipse(7, 28, 4, 4, y2); p.ellipse(37, 28 - (4 if pose == 'attack' else 0), 4, 4, y2)
    if pose == 'attack':
        p.ellipse(44, 22, 4, 4, y2)
    p.rect(20, 25, 25, 31, (240, 120, 40))
    return _fin(p)


def d_guardian(pose):
    p = Pix(52, 64)
    w, g = (232, 232, 244), (232, 190, 60)
    p.rect(14, 28, 36, 56, w)
    p.rect(10, 30, 15, 58, (206, 206, 224)); p.rect(35, 30, 40, 58, (206, 206, 224))
    p.rect(14, 28, 36, 31, g); p.rect(23, 31, 26, 56, g)
    p.rect(16, 56, 22, 62, (180, 150, 50)); p.rect(28, 56, 34, 62, (180, 150, 50))
    p.ellipse(25, 18, 8, 9, (212, 212, 226))
    p.rect(17, 7, 33, 12, g); p.rect(23, 1, 27, 8, (230, 60, 60))
    p.rect(20, 18, 22, 20, (60, 160, 255)); p.rect(28, 18, 30, 20, (60, 160, 255))
    if pose == 'attack':
        p.line(36, 34, 50, 22, (200, 210, 230), 2); p.rect(34, 33, 38, 36, g)
    else:
        p.line(38, 34, 40, 54, (200, 210, 230), 2); p.rect(36, 33, 41, 36, g)
    return _fin(p)


def d_soldier(pose):
    p = Pix(44, 56)
    pu, wh = (120, 70, 170), (236, 236, 246)
    p.rect(14, 44, 19, 53, (70, 50, 100)); p.rect(25, 44, 30, 53, (70, 50, 100))
    p.rect(12, 52, 20, 54, (50, 40, 70)); p.rect(24, 52, 32, 54, (50, 40, 70))
    p.rect(12, 26, 32, 44, wh); p.rect(14, 28, 30, 36, pu)
    p.rect(8, 24, 14, 30, (240, 160, 50)); p.rect(30, 24, 36, 30, (240, 160, 50))
    p.ellipse(22, 16, 8, 8, (200, 160, 220)); p.rect(14, 8, 30, 12, wh)
    p.rect(26, 14, 29, 17, (80, 255, 120))
    p.rect(19, 15, 21, 17, (20, 20, 30))
    if pose == 'attack':
        p.line(32, 30, 44, 20, (120, 90, 60), 1); p.rect(42, 17, 44, 21, (200, 210, 230))
    else:
        p.line(34, 30, 36, 50, (120, 90, 60), 1); p.rect(34, 25, 37, 28, (200, 210, 230))
    return _fin(p)


MINIONS = {
    'landing-security': (d_soldier, 'Landing Security Trooper', 150),
    'recon-probe': (d_probe, 'Reconnaissance Probe', 110),
    'drain-drone': (d_drain, 'Drain Drone', 115),
    'armored-sentinel': (d_sentinel, 'Armored Sentinel', 175),
    'security-grid': (d_grid, 'Security Grid', 165),
    'cell-husk': (d_husk, 'Cell Husk', 160),
    'absorbed-shadow': (d_shadow, 'Absorbed Shadow', 160),
    'cell-probe': (d_cellprobe, 'Cell Probe', 105),
    'training-sentinel': (d_trainer, 'Training Sentinel', 140),
    'chamber-guardian': (d_guardian, 'Chamber Guardian', 215),
}
FLOATERS = {'recon-probe', 'drain-drone', 'cell-probe', 'absorbed-shadow'}


def build_minions(reg, log):
    from art_enemies import store_actor
    for aid, (fn, display, dh) in MINIONS.items():
        idle = fn('idle')
        atk = fn('attack')
        frames = {
            'idle': idle,
            'attack': atk,
            'guard': glow_rim(idle, (120, 200, 255)),
            'charge': glow_rim(idle, (255, 210, 90)),
            'beam': atk,
            'special': atk,
            'hurt': flash(shift(idle, -6, 2)),
        }
        ko = idle.rotate(-90, expand=True, resample=Image.NEAREST) if aid not in FLOATERS else idle.rotate(-70, expand=True, resample=Image.NEAREST)
        frames['ko'] = smoke(darken(ko, 0.55), 5, seed=len(aid))
        notes = {'idle': 'procedural_fallback: tool-drawn placeholder, no source art exists', 'beam': 'alias of attack pose', 'special': 'alias of attack pose',
                 'guard': 'idle + cyan rim', 'charge': 'idle + gold rim', 'hurt': 'idle flashed white + recoil', 'ko': 'idle rotated, darkened, smoke'}
        store_actor(reg, aid, 'enemy', display, dh, frames, 'procedural_fallback', 'right',
                    'tool-drawn pixel art (tools/art_procedural.py); original design',
                    notes, fallback=f'missing-art: {aid} (no source sheet; procedural silhouette)',
                    portrait=idle, provisional=True)
        log(f'[minion] {aid}')


# ===================================================================== NPCs
SKIN = (250, 214, 184)

NPCS = {
    'bulma': dict(name='Bulma', hair=(70, 200, 196), style='bob', skin=SKIN, top=(244, 130, 170), bottom=(70, 110, 210), extras=['ribbon']),
    'chi-chi': dict(name='Chi-Chi', hair=(34, 28, 44), style='bun', skin=SKIN, top=(226, 52, 64), bottom=(226, 52, 64), extras=['belt']),
    'yamcha': dict(name='Yamcha', hair=(30, 26, 36), style='long', skin=SKIN, top=(250, 168, 50), bottom=(250, 168, 50), extras=['scar', 'sash']),
    'kami': dict(name='Kami', hair=None, style='bald', skin=(110, 192, 92), top=(236, 236, 246), bottom=(236, 236, 246), extras=['antennae', 'staff', 'robe']),
    'king-kai': dict(name='King Kai', hair=None, style='bald', skin=(82, 124, 222), top=(36, 36, 70), bottom=(36, 36, 70), extras=['antennae', 'shades']),
    'mr-satan': dict(name='Mr. Satan', hair=(56, 38, 32), style='afro', skin=SKIN, top=(246, 246, 246), bottom=(246, 246, 246), extras=['moustache', 'champ-belt']),
    'researcher': dict(name='Researcher', hair=(112, 76, 50), style='short', skin=SKIN, top=(238, 240, 246), bottom=(70, 80, 100), extras=['glasses', 'coat']),
    'civilian': dict(name='Civilian', hair=(110, 70, 44), style='short', skin=SKIN, top=(92, 164, 104), bottom=(176, 146, 100), extras=[]),
}


def chibi(spec, d, step):
    """Overworld chibi, logical 26x36. d in down/up/left/right; step 0=idle,1..3 walk."""
    p = Pix(26, 36)
    cx = 13
    off = {0: (0, 0), 1: (1, 0), 2: (0, 0), 3: (0, 1)}[step]
    swing = {0: 0, 1: 1, 2: 0, 3: -1}[step]
    side = d in ('left', 'right')
    sgn = -1 if d == 'left' else 1
    top, bottom, skin = spec['top'], spec['bottom'], spec['skin']
    hair = spec['hair']
    ex = spec['extras']
    # legs
    if side:
        p.rect(cx - 3 + swing * 2, 26, cx - 1 + swing * 2, 32, bottom)
        p.rect(cx + 0 - swing * 2, 26, cx + 2 - swing * 2, 32, bottom)
        p.rect(cx - 3 + swing * 2, 32, cx + (1 if sgn > 0 else -1) + swing * 2, 33, (70, 50, 40))
        p.rect(cx - 1 - swing * 2, 32, cx + (3 if sgn > 0 else 1) - swing * 2, 33, (70, 50, 40))
    else:
        p.rect(cx - 4, 26 + (1 if off[0] else 0), cx - 1, 32, bottom)
        p.rect(cx + 1, 26 + (1 if off[1] else 0), cx + 4, 32, bottom)
        p.rect(cx - 4, 32, cx - 1, 33, (70, 50, 40)); p.rect(cx + 1, 32, cx + 4, 33, (70, 50, 40))
    # long garments
    if 'robe' in ex or 'coat' in ex:
        p.rect(cx - 5, 17, cx + 5, 30, top)
        if 'robe' in ex:
            p.rect(cx - 1, 17, cx + 1, 30, (200, 190, 220))
        else:
            p.rect(cx - 1, 18, cx, 30, (180, 190, 205))
    else:
        bw = 4 if side else 5
        p.rect(cx - bw, 17, cx + bw, 26, top)
    if 'belt' in ex or 'sash' in ex or 'champ-belt' in ex:
        col = (30, 30, 40) if 'belt' in ex else ((50, 90, 200) if 'sash' in ex else (240, 200, 40))
        p.rect(cx - 5, 23, cx + 5, 24, col)
    # arms
    if side:
        p.rect(cx - 1 + swing, 18, cx + 1 + swing, 24, top); p.rect(cx - 1 + swing, 24, cx + 1 + swing, 25, skin)
    else:
        p.rect(cx - 7, 18 + (swing > 0), cx - 5, 24 + (swing > 0), top); p.rect(cx - 7, 24 + (swing > 0), cx - 5, 25 + (swing > 0), skin)
        p.rect(cx + 5, 18 + (swing < 0), cx + 7, 24 + (swing < 0), top); p.rect(cx + 5, 24 + (swing < 0), cx + 7, 25 + (swing < 0), skin)
    if 'staff' in ex:
        sx = cx + 9 if d != 'left' else cx - 9
        p.line(sx, 8, sx, 33, (140, 96, 56)); p.ellipse(sx, 8, 1.5, 1.5, (240, 200, 60))
    # head
    hy = 10
    hw = 7 if not side else 6
    if hair is not None and spec['style'] == 'afro':
        p.ellipse(cx, 8, 10, 8, hair)
    p.ellipse(cx, hy, hw, 6.5, skin)
    if 'antennae' in ex:
        p.line(cx - 2, 4, cx - 4, 0, skin); p.line(cx + 2, 4, cx + 4, 0, skin)
    if hair is not None:
        st = spec['style']
        if d == 'up':
            p.ellipse(cx, hy, hw, 6.5, hair)
        else:
            if st in ('bob', 'long'):
                p.rect(cx - hw, hy - 6, cx + hw, hy - 2, hair)
                p.rect(cx - hw, hy - 2, cx - hw + 1, hy + (6 if st == 'bob' else 10), hair); p.rect(cx + hw - 1, hy - 2, cx + hw, hy + (6 if st == 'bob' else 10), hair)
            elif st == 'bun':
                p.rect(cx - hw, hy - 6, cx + hw, hy - 2, hair); p.ellipse(cx, 2, 3, 3, hair)
            elif st == 'short':
                p.rect(cx - hw, hy - 6, cx + hw, hy - 3, hair); p.rect(cx - hw, hy - 3, cx - hw + 1, hy, hair); p.rect(cx + hw - 1, hy - 3, cx + hw, hy, hair)
            elif st == 'afro':
                p.rect(cx - hw, hy - 6, cx + hw, hy - 3, hair)
        if side and hair is not None:
            bx = cx - sgn * (hw - 1)
            p.rect(min(bx, bx - sgn * 2), hy - 5, max(bx, bx - sgn * 2), hy + 2, hair)
    # face
    if d == 'down':
        p.rect(cx - 4, hy, cx - 3, hy + 1, (24, 20, 30)); p.rect(cx + 3, hy, cx + 4, hy + 1, (24, 20, 30))
        p.px(cx, hy + 3, (200, 110, 110))
        if 'glasses' in ex:
            p.rect(cx - 5, hy - 1, cx - 2, hy + 2, (120, 190, 230)); p.rect(cx + 2, hy - 1, cx + 5, hy + 2, (120, 190, 230))
            p.rect(cx - 2, hy, cx + 2, hy, (40, 40, 60))
        if 'shades' in ex:
            p.rect(cx - 5, hy - 1, cx + 5, hy + 1, (20, 20, 30))
        if 'moustache' in ex:
            p.rect(cx - 3, hy + 2, cx + 3, hy + 2, (40, 28, 24))
        if 'scar' in ex:
            p.line(cx + 2, hy - 1, cx + 4, hy + 3, (200, 60, 60))
    elif side:
        fx = cx + sgn * 4
        p.rect(fx, hy, fx, hy + 1, (24, 20, 30)); p.px(cx + sgn * 6, hy + 2, skin)
        if 'glasses' in ex or 'shades' in ex:
            p.rect(fx - (1 if sgn > 0 else 0), hy - 1, fx + (1 if sgn > 0 else 2) * 1, hy + 1, (60, 120, 180))
        if 'moustache' in ex:
            p.rect(fx - 1, hy + 3, fx + 1, hy + 3, (40, 28, 24))
        if 'scar' in ex:
            p.px(cx + sgn * 3, hy + 2, (200, 60, 60))
    if 'ribbon' in ex and d != 'up':
        p.rect(cx - 2, hy - 7, cx + 2, hy - 6, (240, 90, 120))
    p.shade()
    p.outline()
    return p.image(3)


def portrait(spec):
    """Front bust, logical 34x30 scaled x7 -> 238x210."""
    p = Pix(34, 30)
    cx = 17
    skin, hair, top = spec['skin'], spec['hair'], spec['top']
    ex = spec['extras']
    st = spec['style']
    # shoulders / body
    p.rect(4, 22, 29, 29, top); p.rect(12, 20, 21, 23, skin)
    if 'robe' in ex or 'coat' in ex:
        p.rect(14, 22, 19, 29, (210, 200, 230) if 'robe' in ex else (180, 190, 205))
    if 'champ-belt' in ex:
        p.rect(4, 27, 29, 29, (240, 200, 40))
    # hair behind
    if hair is not None and st in ('bob', 'long', 'afro'):
        if st == 'afro':
            p.ellipse(cx, 9, 15, 10, hair)
        else:
            p.rect(cx - 10, 4, cx + 10, 21 if st == 'long' else 17, hair)
    # head
    p.ellipse(cx, 13, 9.5, 9, skin)
    if 'antennae' in ex:
        p.line(cx - 3, 5, cx - 7, 0, skin, 2); p.line(cx + 3, 5, cx + 7, 0, skin, 2)
    if hair is not None:
        if st == 'bun':
            p.ellipse(cx, 2, 4, 3.5, hair)
        p.rect(cx - 9, 4, cx + 9, 8, hair)
        p.rect(cx - 9, 8, cx - 7, 13, hair); p.rect(cx + 7, 8, cx + 9, 13, hair)
        if st == 'short':
            p.rect(cx - 6, 8, cx + 6, 9, hair)
    # face
    eye = (24, 20, 30)
    p.rect(cx - 6, 12, cx - 3, 14, (255, 255, 255)); p.rect(cx + 3, 12, cx + 6, 14, (255, 255, 255))
    p.rect(cx - 5, 12, cx - 4, 14, eye); p.rect(cx + 4, 12, cx + 5, 14, eye)
    p.rect(cx - 7, 10, cx - 3, 10, hair if hair else (50, 70, 50)); p.rect(cx + 3, 10, cx + 7, 10, hair if hair else (50, 70, 50))
    p.rect(cx - 2, 19, cx + 2, 19, (190, 90, 96))
    p.px(cx, 16, tuple(max(0, c - 40) for c in skin))
    if 'glasses' in ex:
        p.rect(cx - 7, 11, cx - 2, 15, (140, 200, 235)); p.rect(cx + 2, 11, cx + 7, 15, (140, 200, 235)); p.rect(cx - 2, 12, cx + 2, 12, (40, 40, 60))
        p.rect(cx - 5, 12, cx - 4, 14, eye); p.rect(cx + 4, 12, cx + 5, 14, eye)
    if 'shades' in ex:
        p.rect(cx - 8, 11, cx + 8, 14, (20, 20, 30))
    if 'moustache' in ex:
        p.rect(cx - 5, 17, cx + 5, 18, (40, 28, 24))
    if 'scar' in ex:
        p.line(cx + 3, 11, cx + 6, 17, (196, 60, 60))
    if 'ribbon' in ex:
        p.rect(cx - 4, 3, cx + 4, 4, (240, 90, 120))
    p.shade()
    p.outline()
    return p.image(7)


def build_npcs(reg, log):
    for nid, spec in NPCS.items():
        ow = {}
        for d in ('down', 'left', 'right', 'up'):
            fr = {}
            for step, key in enumerate(['idle', 'walk-01', 'walk-02', 'walk-03']):
                im = chibi(spec, d, step)
                fr[key] = save_frame(im, f'npcs/{nid}/overworld/{d}/{key}.png', 'procedural_fallback',
                                     {'down': 'front', 'up': 'back'}.get(d, d), 'tool-drawn placeholder chibi' if key == 'idle' else '', trim=True)
            ow[d] = {'idle': fr['idle'], 'walk': [fr['walk-01'], fr['walk-02'], fr['walk-03']]}
        por = save_frame(portrait(spec), f'npcs/{nid}/portrait.png', 'procedural_fallback', 'front',
                         'tool-drawn placeholder portrait (single expression)', trim=True)
        idle_b = save_frame(chibi(spec, 'right', 0).resize((156, 204), Image.NEAREST), f'npcs/{nid}/battle/idle.png', 'procedural_fallback', 'right',
                            'NPC has no battle art; scaled overworld idle', trim=True)
        reg['actors'][nid] = dict(id=nid, kind='npc', displayName=spec['name'], facing='front', displayHeight=100,
                                  battle={'idle': idle_b}, overworld=ow, portrait=por, approved=False, provisional=True,
                                  fallbackReason=f'missing-art: {nid} npc (05-story is REVIEW-ONLY; procedural placeholder)',
                                  provenance='tool-drawn pixel art (tools/art_procedural.py); original design, no source art used')
        log(f'[npc] {nid}')
