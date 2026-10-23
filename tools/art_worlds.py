"""World art: opaque battle backdrops, seamless 32px ground tiles, discrete props.  Curated component indices come from
components(sheet, dil=2, min_area=300, thr=128) (same call as tools/art_catalog in docs/art-evidence review sheets).
All world art is stored at 1/2 source resolution (integer NEAREST) so that one prop pixel ~ one screen pixel at 1280x720."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import SRC, OUT, clean_alpha, components, dilate, frame_meta, save_frame, trim_pad, alpha_mask

WORLD_SRC = SRC / '04-worlds' / 'source-sheets'
TILE = 32
_cache: dict = {}


def sheet(stem):
    if stem not in _cache:
        raw = Image.open(WORLD_SRC / f'{stem}.png').convert('RGBA')
        boxes = components(raw, dil=2, min_area=300, thr=128)
        _cache[stem] = (clean_alpha(raw, 128, 128), boxes)
    return _cache[stem]


def half(im):
    return im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.NEAREST)


def opaque_fill(im: Image.Image) -> Image.Image:
    """Make an image fully opaque by propagating nearest opaque colours into transparent holes (corners)."""
    a = np.array(im.convert('RGBA'))
    m = a[..., 3] > 0
    if m.all():
        return Image.fromarray(a, 'RGBA')
    for _ in range(80):
        if m.all():
            break
        p = np.pad(a, ((1, 1), (1, 1), (0, 0)))
        pm = np.pad(m, 1)
        new = ~m
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nb = pm[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]
            nc = p[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]
            take = new & nb
            a[take] = nc[take]
            m = m | take
            new = ~m
    a[..., 3] = 255
    return Image.fromarray(a, 'RGBA')


def crop_comp(stem, idx, margin=0):
    im, boxes = sheet(stem)
    x, y, w, h = boxes[idx]
    win = im.crop((x - margin, y - margin, x + w + margin, y + h + margin))
    return win, (x, y, w, h)


def prop_image(stem, idx):
    """Component crop with neighbour fragments removed (keep the largest components touching the bbox centre)."""
    from art_lib import label_components
    im, boxes = sheet(stem)
    x, y, w, h = [int(v) for v in boxes[idx]]
    win = im.crop((x, y, x + w, y + h))
    a = np.array(win)
    m = a[..., 3] > 0
    lab, n = label_components(m)
    if n > 1:
        sizes = [int((lab == i).sum()) for i in range(1, n + 1)]
        big = max(sizes)
        keep = np.zeros(m.shape, bool)
        for i in range(1, n + 1):
            if sizes[i - 1] >= 0.08 * big:
                keep |= lab == i
        a[~keep, 3] = 0
    return trim_pad(Image.fromarray(a, 'RGBA'), 0)


def seamless(t: np.ndarray) -> np.ndarray:
    """Cross-blend with a half-shifted copy so opposite edges match (derived). t: HxWx3 float."""
    h, w, _ = t.shape
    sh = np.roll(t, (h // 2, w // 2), (0, 1))
    wy = np.sin(np.linspace(0, np.pi, h, endpoint=False)) ** 2
    wx = np.sin(np.linspace(0, np.pi, w, endpoint=False)) ** 2
    mask = (wy[:, None] * wx[None, :])[..., None]
    # at the border mask=0 -> shifted copy (whose borders are mid-lines of t, which wrap contiguously)
    return t * mask + sh * (1 - mask)


def make_tile(stem, idx, fx, fy, ss=64, flip=False):
    """Sample an ss x ss patch at fractional position inside component idx, reduce 2:1 if ss==64, make seamless."""
    im, boxes = sheet(stem)
    x, y, w, h = [int(v) for v in boxes[idx]]
    ss = min(ss, w - 2, h - 2)
    ss -= ss % 2
    cx, cy = x + fx * w, y + fy * h
    x0 = int(round(min(max(cx - ss / 2, x + 1), x + w - ss - 1)))
    y0 = int(round(min(max(cy - ss / 2, y + 1), y + h - ss - 1)))
    crop = opaque_fill(im.crop((x0, y0, x0 + ss, y0 + ss)))
    if ss != TILE:
        crop = crop.resize((TILE, TILE), Image.NEAREST)
    a = np.array(crop)[..., :3].astype(float)
    out = seamless(a).round().clip(0, 255).astype(np.uint8)
    rgba = np.dstack([out, np.full(out.shape[:2], 255, np.uint8)])
    return Image.fromarray(rgba, 'RGBA'), (x0, y0, ss)


def fixed_tile(color_a, color_b):
    """Procedural fallback tile (checker/noise) when a sheet offers nothing usable."""
    rng = np.random.default_rng(5)
    a = np.zeros((TILE, TILE, 4), np.uint8)
    a[..., :3] = color_a
    n = rng.random((TILE, TILE)) < 0.18
    a[n, :3] = color_b
    a[..., 3] = 255
    return Image.fromarray(a, 'RGBA')


# --------------------------------------------------------------------------------------------- specs
# props: (name, idx, solid, footW|None, footH|None)    tiles: cls -> (idx, fx, fy, ss)  or ('proc', colA, colB)
# backdrops: ('rect', x, y, w, h) | ('rectx', x, y, w, h, [(x0,x1),..]) -> sub-ranges of the rect
W = {}

W['landing_future'] = dict(
    sheet='future-landing', note='Wasteland plateau theme; backdrop strip holds 4 weather/time variants (day, noon, storm, sunset).',
    backdrops=[('split', 11, 766, 1426, 306, [(0, 362), (372, 712), (726, 1066), (1080, 1426)], ['day', 'noon', 'storm', 'sunset'])],
    tiles=dict(floor=(0, .5, .5, 64), floor2=(15, .5, .5, 64), path=(17, .5, .45, 64), wall=(65, .5, .72, 64), water=(101, .5, .5, 32), edge=(83, .5, .62, 32)),
    props=[('rock_big', 14, True, None, None), ('rock', 8, True, None, None), ('rock_small', 10, False, None, None), ('rock_pile', 11, True, None, None),
           ('tree', 39, True, 1, 1), ('tree_round', 111, True, 1, 1), ('tree_dead', 41, True, 1, 1), ('bush', 38, False, None, None), ('bush_small', 40, False, None, None),
           ('cliff', 65, True, None, None), ('cliff_cave', 80, True, None, None), ('cliff_block', 84, True, None, None),
           ('sign', 97, True, 1, 1), ('chest_red', 93, True, 1, 1), ('chest_steel', 94, True, 1, 1), ('ruin_pillar', 91, True, 1, 1),
           ('crater', 56, False, None, None), ('pond', 105, True, None, None), ('stump', 96, True, 1, 1)])

W['capsule_corp'] = dict(
    sheet='capsule-corporation', note='Capsule Corporation grounds; hub.',
    backdrops=[('rect', 19, 885, 947, 194)],
    tiles=dict(floor=(7, .5, .5, 32), floor2=(0, .5, .5, 64), path=(43, .5, .5, 64), wall=(114, .5, .5, 64), water=(88, .5, .5, 32), edge=(115, .5, .5, 64)),
    props=[('dome_house', 9, True, None, None), ('main_building', 41, True, None, None), ('tower', 42, True, None, None), ('dome_blue', 70, True, None, None),
           ('hall_yellow', 71, True, None, None), ('door_building', 121, True, None, None), ('palm', 8, True, 1, 1), ('tree', 23, True, 1, 1), ('tree_b', 24, True, 1, 1),
           ('lamp', 33, True, 1, 1), ('fountain', 86, True, None, None), ('hedge', 7, True, None, 1), ('flowerbed', 26, True, None, 1), ('bench', 60, True, None, 1),
           ('hovercar', 109, True, None, None), ('landing_pad', 107, False, None, None), ('gate', 77, True, None, None), ('capsule_tube', 130, True, 1, 1),
           ('crate', 126, True, 1, 1), ('pool', 88, True, None, None), ('planter', 52, True, 1, 1), ('terminal', 125, True, 1, 1), ('pylon', 66, True, 1, 1)])

W['south_city'] = dict(
    sheet='south-city', note='Ruined city streets; two backdrop strips (intact skyline / ruined skyline).',
    backdrops=[('rect', 17, 817, 707, 251), ('rect', 735, 817, 697, 251)],
    tiles=dict(floor=(1, .3, .62, 64), floor2=(5, .5, .5, 32), path=(47, .5, .5, 32), wall=(103, .35, .5, 32), water=('proc', (42, 90, 130), (70, 130, 175)), edge=(44, .35, .35, 32)),
    props=[('shop_red', 80, True, None, None), ('shop_blue', 81, True, None, None), ('shop_grey', 83, True, None, None), ('shop_green', 84, True, None, None),
           ('tree_tall', 20, True, 1, 1), ('tree_planter', 24, True, 1, 1), ('lamp', 17, True, 1, 1), ('lamp_b', 18, True, 1, 1), ('traffic_light', 33, True, 1, 1),
           ('bench', 41, True, None, 1), ('vending_red', 91, True, 1, 1), ('vending_blue', 92, True, 1, 1), ('bus_stop', 68, True, None, None),
           ('car_red', 109, True, None, None), ('car_yellow', 110, True, None, None), ('truck', 97, True, None, None), ('barrier', 61, True, None, 1), ('cone', 60, False, None, None),
           ('rubble', 75, True, None, None), ('rubble_b', 130, True, None, None), ('fence', 100, True, None, 1), ('crate', 124, True, 1, 1), ('chest_red', 125, True, 1, 1),
           ('chest_gold', 126, True, 1, 1), ('hedge', 77, True, None, 1), ('billboard', 67, True, 1, 1), ('hover_pod', 127, True, None, None)])

W['rocky_outskirts'] = dict(
    sheet='rocky-outskirts', note='Rocky wasteland; backdrop strip holds six weather/time variants (3 day, sunset, storm, dusk).',
    backdrops=[('rect', 17, 785, 478, 120), ('rect', 503, 786, 453, 119), ('rect', 964, 786, 468, 119), ('rect', 18, 912, 465, 157), ('rect', 492, 912, 459, 157), ('rect', 960, 912, 472, 157)],
    tiles=dict(floor=(15, .5, .5, 64), floor2=(16, .5, .5, 64), path=(1, .5, .5, 64), wall=(0, .5, .75, 64), water=(124, .5, .45, 32), edge=(5, .5, .72, 32)),
    props=[('cliff_a', 0, True, None, None), ('cliff_b', 5, True, None, None), ('cliff_c', 6, True, None, None), ('cliff_wide', 2, True, None, None),
           ('mountain', 7, True, None, None), ('rock', 8, True, None, None), ('rock_b', 10, True, None, None), ('rock_c', 11, True, None, None), ('bush', 22, False, None, None),
           ('dead_tree', 25, True, 1, 1), ('dead_tree_b', 43, True, 1, 1), ('pillar_ruin', 47, True, 1, 1), ('pillar_b', 60, True, 1, 1), ('silo', 89, True, None, None),
           ('silo_small', 109, True, None, None), ('dome_hut', 110, True, None, None), ('pond', 124, True, None, None), ('chest', 135, True, 1, 1), ('crater', 139, False, None, None),
           ('ruin_ring', 91, False, None, None), ('ruins', 79, True, None, None), ('cliff_cave', 80, True, None, None), ('tower_rock', 72, True, None, None)])

W['mountain_lab'] = dict(
    sheet='gero-mountain-exterior', note='Gero mountain exterior; backdrop is the lab gate vista (also contains the lab gate).',
    backdrops=[('rectcrop', 8, 704, 1432, 372, (0, 120, 1432, 372))],
    tiles=dict(floor=(34, .5, .5, 64), floor2=(51, .5, .5, 64), path=(81, .3, .5, 64), wall=(0, .5, .78, 64), water=('proc', (60, 80, 110), (100, 130, 160)), edge=(52, .5, .5, 32)),
    props=[('cliff', 3, True, None, None), ('cliff_b', 0, True, None, None), ('rock', 7, True, None, None), ('rock_b', 8, True, None, None), ('snow_spire', 11, True, None, None),
           ('snow_peaks', 32, True, None, None), ('pine_snow', 59, True, 1, 1), ('pine_small', 40, True, 1, 1), ('bush', 58, False, None, None), ('cave', 56, True, None, None),
           ('lab_gate', 92, True, None, None), ('lab_gate_open', 93, True, None, None), ('lab_gate_cliff', 84, True, None, None), ('platform', 96, True, None, None),
           ('camera', 97, True, 1, 1), ('camera_b', 100, True, 1, 1), ('radio_tower', 102, True, 1, 1), ('elevator_door', 103, True, None, None), ('console', 99, True, 1, 1),
           ('crate_green', 120, True, 1, 1), ('crate_yellow', 125, True, 1, 1), ('machine', 126, True, None, None), ('barrel_grey', 127, True, 1, 1), ('barrel_blue', 128, True, 1, 1),
           ('barrel_red', 129, True, 1, 1), ('chest', 130, True, 1, 1), ('terminal', 131, True, 1, 1), ('fence', 89, True, None, 1), ('beacon', 91, True, 1, 1), ('vent', 85, False, None, None)])

W['lab_inner'] = dict(
    sheet='gero-laboratory-interior', note='Gero laboratory interior; floor tiles are cut from the 4x4 metal-floor block (genuine tile grid).',
    backdrops=[('rect', 17, 762, 958, 310), ('rect', 984, 903, 283, 167)],
    tiles=dict(floor=(6, .13, .13, 64), floor2=(6, .38, .13, 64), path=(6, .62, .88, 64), wall=(1, .5, .6, 32), water=('proc', (30, 60, 50), (60, 110, 90)), edge=(6, .87, .62, 64)),
    props=[('wall_door', 2, True, None, None), ('wall_terminal', 7, True, None, None), ('elevator_door', 13, True, None, None), ('wall_panel', 12, True, None, None),
           ('tube_dark', 4, True, 1, 1), ('tube_red', 5, True, 1, 1), ('pod_purple', 9, True, None, None), ('pod_pair', 10, True, None, None), ('computer', 23, True, None, 1),
           ('console_chair', 27, True, None, 1), ('console_b', 28, True, None, 1), ('console_c', 29, True, None, 1), ('server', 26, True, 1, 1), ('server_tall', 24, True, 1, 1),
           ('capsule_blue', 30, True, 1, 1), ('crate_green', 50, True, 1, 1), ('crate_big', 52, True, None, 1), ('barrel_green', 66, True, 1, 1), ('barrel_red', 67, True, 1, 1),
           ('barrel_blue', 68, True, 1, 1), ('crate_red', 86, True, 1, 1), ('crate_red_b', 70, True, 1, 1), ('laser_gate', 75, True, None, None), ('hazard_barrier', 83, True, None, 1),
           ('fence', 85, True, None, 1), ('platform', 79, True, None, None), ('platform_stairs', 80, True, None, None), ('android_pod', 46, True, None, None), ('table_parts', 34, True, None, None),
           ('table_parts_b', 35, True, None, None), ('cart', 89, True, None, None), ('canister', 71, True, 1, 1)])

W['gingertown'] = dict(
    sheet='ginger-town', note='Ruined suburb; three backdrop strips.',
    backdrops=[('rect', 14, 850, 506, 216), ('rect', 529, 851, 393, 215), ('rect', 930, 851, 502, 215)],
    tiles=dict(floor=(34, .5, .5, 32), floor2=(41, .5, .5, 32), path=(31, .5, .5, 32), wall=(83, .5, .55, 32), water=(92, .5, .6, 32), edge=(85, .5, .6, 32)),
    props=[('house_red', 0, True, None, None), ('dome_pink', 1, True, None, None), ('house_green', 6, True, None, None), ('house_small', 8, True, None, None), ('dome_white', 9, True, None, None),
           ('ruin', 10, True, None, None), ('tree', 14, True, 1, 1), ('tree_b', 19, True, 1, 1), ('tree_c', 26, True, 1, 1), ('cypress', 17, True, 1, 1), ('cypress_b', 27, True, 1, 1),
           ('dead_tree', 18, True, 1, 1), ('bush', 21, False, None, None), ('bush_small', 20, False, None, None), ('mailbox_red', 23, True, 1, 1), ('mailbox_blue', 47, True, 1, 1),
           ('fence', 16, True, None, 1), ('trashcan', 46, True, 1, 1), ('trashcan_b', 59, True, 1, 1), ('car_beige', 55, True, None, None), ('car_red', 56, True, None, None),
           ('rock', 35, True, 1, 1), ('billboard', 75, True, 1, 1), ('ladder', 88, True, 1, 1), ('canal', 92, True, None, None), ('wall_ruin', 80, True, None, 1), ('lamp', 76, True, 1, 1)])

W['android_island'] = dict(
    sheet='android-island', note='Tropical island + Red-Ribbon-style bunker ruins; two backdrop strips.',
    backdrops=[('rect', 15, 821, 698, 252), ('rect', 735, 821, 698, 252)],
    tiles=dict(floor=(17, .5, .5, 64), floor2=(19, .62, .6, 32), path=(28, .5, .5, 32), wall=(4, .5, .75, 64), water=(0, .5, .5, 64), edge=(9, .85, .5, 32)),
    props=[('palm', 13, True, 1, 1), ('palm_small', 18, True, 1, 1), ('tree', 22, True, 1, 1), ('bush', 11, False, None, None), ('bush_b', 12, False, None, None),
           ('cliff', 4, True, None, None), ('cliff_big', 16, True, None, None), ('cliff_cave', 42, True, None, None), ('rock', 34, True, None, None), ('rock_b', 33, True, None, None),
           ('boulders', 52, True, None, None), ('bunker_wall', 45, True, None, None), ('bunker_wall_b', 46, True, None, None), ('hazard_box', 47, True, None, None),
           ('tunnel_door', 50, True, None, None), ('terminal', 60, True, 1, 1), ('console', 62, True, 1, 1), ('slab', 66, True, None, 1), ('crate', 67, True, 1, 1), ('chest', 68, True, 1, 1),
           ('pillar_ruin', 59, True, 1, 1), ('cell_pod', 72, True, None, None), ('pillars_broken', 78, True, None, None), ('stone_pillar', 87, True, 1, 1), ('sea_rock', 89, True, 1, 1),
           ('mailbox_button_red', 79, True, 1, 1), ('mailbox_button_green', 80, True, 1, 1), ('pipe', 74, True, None, None)])

W['lookout'] = dict(
    sheet='lookout-and-time-chamber', note="Kami's Lookout. Shares one source sheet with time_chamber (documented reuse); sky-and-clouds backdrop.",
    backdrops=[('rect', 1039, 45, 399, 327)],
    tiles=dict(floor=(2, .5, .22, 64), floor2=(61, .5, .18, 64), path=(17, .5, .5, 64), wall=(54, .5, .3, 32), water=('proc', (150, 190, 235), (210, 230, 250)), edge=(18, .5, .5, 32)),
    props=[('palace', 9, True, None, None), ('palace_tower', 15, True, None, None), ('planter_cypress', 12, True, None, None), ('cypress', 25, True, 1, 1), ('cypress_b', 37, True, 1, 1),
           ('cypress_pot', 30, True, 1, 1), ('flower_bed', 31, True, None, 1), ('pot_round', 13, True, 1, 1), ('pot_tall', 24, True, 1, 1), ('column_a', 0, True, 1, 1), ('column_b', 7, True, 1, 1),
           ('column_c', 27, True, 1, 1), ('column_d', 45, True, 1, 1), ('balustrade', 10, True, None, 1), ('balustrade_b', 53, True, None, 1), ('stairs', 22, True, None, None),
           ('stairs_curved', 29, True, None, None), ('fountain_pad', 43, False, None, None), ('hourglass_shrine', 46, True, None, None), ('palm', 36, True, 1, 1), ('platform_oval', 17, False, None, None),
           ('pavilion', 59, True, None, None), ('cloud_a', 38, False, None, None), ('cloud_b', 39, False, None, None), ('cloud_c', 49, False, None, None), ('cloud_d', 51, False, None, None)])

W['time_chamber'] = dict(
    sheet='lookout-and-time-chamber', note='Hyperbolic Time Chamber: white void floor; shares the lookout source sheet (documented reuse); backdrop is the white-void panel.',
    backdrops=[('rect', 1028, 610, 410, 299)],
    tiles=dict(floor=(74, .3, .75, 64), floor2=(74, .7, .3, 64), path=(17, .5, .5, 64), wall=(65, .5, .3, 32), water=(65, .5, .55, 32), edge=(66, .5, .5, 32)),
    props=[('pavilion_exit', 59, True, None, None), ('arch_wall', 55, True, None, None), ('arch_tall', 56, True, None, None), ('arch_door', 77, True, None, None), ('pillar_a', 64, True, 1, 1),
           ('pillar_b', 73, True, 1, 1), ('pillar_c', 60, True, 1, 1), ('orb', 72, True, 1, 1), ('pad_blue', 69, False, None, None), ('pad_small', 70, False, None, None),
           ('pad_large', 71, False, None, None), ('floor_oval', 74, False, None, None), ('hourglass', 46, True, None, None), ('column', 47, True, 1, 1), ('fade_a', 83, False, None, None),
           ('fade_b', 86, False, None, None)])

W['cell_games_approach'] = dict(
    sheet='cell-games-approach-and-arena', note='Cell Games approach: festival tents, banners, trucks. Shares source sheet with the arena (documented reuse).',
    backdrops=[('rect', 14, 870, 684, 205)],
    tiles=dict(floor=(0, .45, .35, 64), floor2=(9, .5, .5, 64), path=(33, .5, .5, 32), wall=(1, .5, .85, 32), water=('proc', (48, 110, 160), (90, 160, 210)), edge=(3, .5, .8, 32)),
    props=[('tree', 4, True, 1, 1), ('tree_round', 5, True, 1, 1), ('tree_b', 6, True, 1, 1), ('cypress', 7, True, 1, 1), ('cypress_b', 13, True, 1, 1), ('tree_big', 12, True, 1, 1),
           ('palm', 14, True, 1, 1), ('rock', 26, True, None, None), ('rock_b', 34, True, None, None), ('rock_c', 37, True, None, None), ('rock_d', 54, True, None, None),
           ('banner_blue', 61, True, 1, 1), ('banner_red', 62, True, 1, 1), ('banner_yellow', 63, True, 1, 1), ('banner_pink', 64, True, 1, 1), ('barrier', 45, True, None, 1),
           ('barrier_b', 46, True, None, 1), ('tent_white', 81, True, None, None), ('tent_blue', 82, True, None, None), ('crate_steel', 83, True, 1, 1), ('crate_red', 84, True, 1, 1),
           ('truck', 93, True, None, None), ('van', 95, True, None, None), ('light_tower', 94, True, 1, 1), ('light_tower_b', 99, True, 1, 1), ('barrel_red', 100, True, 1, 1),
           ('barrel_blue', 102, True, 1, 1), ('portapotty', 101, True, 1, 1), ('truss', 98, True, None, None), ('jeep', 116, True, None, None), ('capsule_car', 117, True, None, None),
           ('obelisk', 56, True, 1, 1), ('rope_posts', 79, True, None, 1), ('rubble', 51, True, None, None), ('stage_small', 110, True, None, None)])

W['cell_games_arena'] = dict(
    sheet='cell-games-approach-and-arena', note='Cell Games arena: ring tiles from the real tile block, stands, obelisks. Shares source sheet with the approach (documented reuse).',
    backdrops=[('rect', 721, 804, 713, 275)],
    tiles=dict(floor=(15, .27, .17, 64), floor2=(17, .5, .13, 64), path=(15, .78, .17, 64), wall=(29, .5, .5, 32), water=('proc', (48, 110, 160), (90, 160, 210)), edge=(31, .5, .5, 32)),
    props=[('ring_block', 15, False, None, None), ('ring_cracked', 17, False, None, None), ('ring_crater', 18, False, None, None), ('ring_rubble', 19, False, None, None),
           ('stage', 58, True, None, None), ('stands', 91, True, None, None), ('stands_corner', 92, True, None, None), ('obelisk', 56, True, 1, 1), ('obelisk_b', 57, True, 1, 1),
           ('obelisk_c', 74, True, 1, 1), ('stairs', 40, True, None, None), ('stairs_b', 42, True, None, None), ('wall', 43, True, None, None), ('wall_flat', 29, True, None, 1),
           ('announcer_stage', 110, True, None, None), ('gate_wall', 111, True, None, None), ('crater_ring', 70, False, None, None), ('rubble', 72, True, None, None),
           ('rubble_b', 105, False, None, None), ('banner_blue', 61, True, 1, 1), ('banner_red', 62, True, 1, 1), ('barrier', 45, True, None, 1), ('palm', 14, True, 1, 1),
           ('cypress', 7, True, 1, 1), ('tree', 4, True, 1, 1), ('crate_steel', 83, True, 1, 1), ('rock', 26, True, None, None)])


def build_worlds(reg, log):
    for map_id, spec in W.items():
        stem = spec['sheet']
        im, boxes = sheet(stem)
        out = {'mapId': map_id, 'backdrops': [], 'tileSize': TILE, 'tiles': {}, 'props': {}, 'quality': 'genuine', 'note': spec['note']}
        # ---- backdrops
        n = 0
        for bd in spec['backdrops']:
            kind = bd[0]
            if kind == 'split':
                _, x, y, w, h, ranges, names = bd
                for (a, b), nm in zip(ranges, names):
                    c = im.crop((x + a + 3, y + 3, x + b - 3, y + h - 3))
                    c = opaque_fill(c)
                    out['backdrops'].append(save_frame(c, f'worlds/{map_id}/backdrop-{nm}.png', 'genuine', 'front', f'battle backdrop ({nm}); crop of {stem}.png'))
                    n += 1
            else:
                if kind == 'rectcrop':
                    _, x, y, w, h, (cx0, cy0, cx1, cy1) = bd
                    c = im.crop((x + cx0, y + cy0, x + cx1, y + cy1))
                else:
                    _, x, y, w, h = bd
                    c = im.crop((x + 3, y + 3, x + w - 3, y + h - 3))
                c = opaque_fill(c)
                out['backdrops'].append(save_frame(c, f'worlds/{map_id}/backdrop-{n+1}.png', 'genuine', 'front', f'battle backdrop; crop of {stem}.png (opaque_fill on rounded corners)'))
                n += 1
        # ---- tiles
        tdesc = {}
        for cls, t in spec['tiles'].items():
            if t[0] == 'proc':
                tile = fixed_tile(t[1], t[2])
                q, why = 'procedural_fallback', 'procedural tile (no suitable patch in sheet)'
            else:
                idx, fx, fy, ss = t
                tile, org = make_tile(stem, idx, fx, fy, ss)
                q, why = 'derived', f'{ss}px patch of {stem} comp#{idx} @({org[0]},{org[1]}) -> 32px, cross-blended seamless'
            f = save_frame(tile, f'worlds/{map_id}/tiles/{cls}.png', q, 'front', why)
            out['tiles'][cls] = f['path']
            tdesc[cls] = (q, why)
        # ---- props
        for name, idx, solid, fw, fh in spec['props']:
            pim = half(prop_image(stem, idx))
            if pim.width < 2 or pim.height < 2:
                continue
            m = frame_meta(pim)
            pw, ph = pim.width, pim.height
            footW = fw if fw else max(1, round(pw / TILE))
            footH = fh if fh else (1 if ph > 56 else max(1, round(ph / TILE)))
            f = save_frame(pim, f'worlds/{map_id}/props/{name}.png', 'genuine', 'front', f'{stem}.png comp#{idx}, 2:1 NEAREST')
            out['props'][name] = dict(path=f['path'], w=f['w'], h=f['h'], footW=int(footW), footH=int(footH), solid=bool(solid))
        reg['worlds'][map_id] = out
        log(f'[world] {map_id}: {len(out["backdrops"])} backdrops, {len(out["tiles"])} tiles, {len(out["props"])} props')
