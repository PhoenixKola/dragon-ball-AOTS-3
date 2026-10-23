"""Frieza-force landing troopers: derived from the handoff armored-sentinel sprite set, re-coloured into purple/gold armour.
(No handoff sheet exists for the soldiers; this replaces the old tool-drawn placeholder with real shaded art in every pose.)"""
from __future__ import annotations
import colorsys
import numpy as np
from PIL import Image
from art_lib import OUT, save_frame, clean_alpha

STATES = ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'ko', 'beam', 'victory']


def recolor(im: Image.Image) -> Image.Image:
    a = np.array(im.convert('RGBA')).astype(np.float32) / 255.0
    rgb = a[..., :3]
    out = rgb.copy()
    h = np.zeros(rgb.shape[:2], np.float32); s = np.zeros_like(h); v = np.zeros_like(h)
    flat = rgb.reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat], np.float32).reshape(rgb.shape)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    blue = (h > 0.45) & (h < 0.75) & (s > 0.22)          # the sentinel's blue armour panels / glow
    h2 = np.where(blue, 0.76, h)                            # -> violet
    s2 = np.where(blue, np.minimum(1.0, s * 1.05), s)
    v2 = np.where(blue, v * 0.92, v)
    hsv2 = np.stack([h2, s2, v2], -1).reshape(-1, 3)
    out = np.array([colorsys.hsv_to_rgb(*p) for p in hsv2], np.float32).reshape(rgb.shape)
    res = np.concatenate([out, a[..., 3:4]], -1)
    return Image.fromarray((res * 255).astype(np.uint8), 'RGBA')


def build_troopers(reg, log=print):
    src = reg['actors'].get('armored-sentinel')
    dst = reg['actors'].get('landing-security')
    if not src or not dst:
        log('[troopers] missing source or target actor; skipped')
        return reg
    battle = {}
    for st in STATES:
        f = src['battle'].get(st)
        if not f:
            continue
        im = Image.open(OUT.parent / f['path'])
        im = clean_alpha(recolor(im))
        battle[st] = save_frame(im, f'enemies/landing-security/battle/{st}.png', 'derived', f['facing'], 'recoloured armored-sentinel (Frieza-force purple armour); no dedicated trooper sheet exists')
    dst['battle'] = battle
    if src.get('portrait'):
        pim = clean_alpha(recolor(Image.open(OUT.parent / src['portrait']['path'])))
        dst['portrait'] = save_frame(pim, 'enemies/landing-security/portrait.png', 'derived', src['portrait']['facing'], 'recoloured armored-sentinel portrait')
    dst['facing'] = src['facing']
    dst['provisional'] = False
    dst['fallbackReason'] = 'derived from armored-sentinel (recolour)'
    dst['provenance'] = 'derived: art/handoff/regular_enemies/armored_android_sentinel.png recoloured to purple/gold'
    dst.pop('overworld', None)
    log(f'[troopers] landing-security <- armored-sentinel recolour ({len(battle)} poses)')
    return reg
