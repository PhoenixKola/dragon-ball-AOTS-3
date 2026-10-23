"""Single source of truth for on-screen proportions (applied last by build_art.py).
BATTLE: displayHeight = px height of the idle frame's bbox at 720p (hair/aura inflate bbox, so values are tuned by eye on docs/art-evidence/proportions-*.png).
OVERWORLD: owHeight = px height in map space (tile = 32px, zoom 2)."""
from __future__ import annotations

BATTLE = {
    # heroes (Gohan is a kid: clearly smaller than Goku/Vegeta/Trunks; SSJ forms only gain height through hair)
    'goku-base': 175, 'goku-ssj': 190, 'goku-weakened': 175,
    'gohan-base': 150, 'gohan-training': 150, 'gohan-wounded': 150, 'gohan-ssj': 168, 'gohan-ssj2': 172,
    'vegeta-base': 168, 'vegeta-ssj': 186, 'vegeta-ascended': 192,
    'trunks-base': 178, 'trunks-ssj': 194, 'trunks-ultra': 200,
    'piccolo-base': 212, 'piccolo-kami': 222,
    'krillin-base': 128, 'tien-base': 188,
    # villains / bosses
    'android-16': 215, 'android-17': 176, 'android-18': 168, 'android-19': 172, 'android-20': 160,
    'mecha-frieza': 200, 'king-cold': 240,
    'cell-imperfect': 215, 'cell-semi-perfect': 235, 'cell-perfect': 250, 'cell-super-perfect': 262, 'cell-junior': 112,
    # minions
    'landing-security': 150, 'recon-probe': 100, 'drain-drone': 108, 'armored-sentinel': 170, 'security-grid': 150,
    'cell-husk': 150, 'absorbed-shadow': 150, 'cell-probe': 100, 'training-sentinel': 150, 'chamber-guardian': 205,
}

OVERWORLD = {
    'goku-base': 54, 'goku-ssj': 54, 'goku-weakened': 54,
    'gohan-base': 46, 'gohan-training': 46, 'gohan-wounded': 46, 'gohan-ssj': 48, 'gohan-ssj2': 49,
    'vegeta-base': 52, 'vegeta-ssj': 54, 'vegeta-ascended': 55,
    'trunks-base': 55, 'trunks-ssj': 57, 'trunks-ultra': 58,
    'piccolo-base': 62, 'piccolo-kami': 64, 'krillin-base': 44, 'tien-base': 56,
    'bulma': 52, 'chi-chi': 50, 'yamcha': 54, 'kami': 56, 'king-kai': 40, 'mr-satan': 56,
    'researcher': 52, 'civilian': 50, 'civilian-apron': 50, 'announcer': 54,
    'android-16': 76, 'android-17': 56, 'android-18': 54, 'android-19': 54, 'android-20': 48,
    'mecha-frieza': 62, 'king-cold': 76,
    'cell-imperfect': 70, 'cell-semi-perfect': 76, 'cell-perfect': 80, 'cell-super-perfect': 84, 'cell-junior': 38,
    'landing-security': 54, 'recon-probe': 34, 'drain-drone': 36, 'armored-sentinel': 56, 'security-grid': 46,
    'cell-husk': 50, 'absorbed-shadow': 52, 'cell-probe': 38, 'training-sentinel': 54, 'chamber-guardian': 64,
}


def apply(reg, log=print):
    missing = []
    for aid, a in reg['actors'].items():
        if aid in BATTLE:
            a['displayHeight'] = BATTLE[aid]
        else:
            missing.append(aid)
        if aid in OVERWORLD:
            a['owHeight'] = OVERWORLD[aid]
    for aid in list(BATTLE) + list(OVERWORLD):
        if aid not in reg['actors']:
            log(f'[proportions] WARNING unknown actor {aid}')
    if missing:
        log(f'[proportions] no battle height for: {missing}')
    return reg
