# Final content art sources

These native-generated images are retained here as compact, reviewable source inputs. `python tools/build_art.py --only finalcontent` slices and installs them into `public/assets` and refreshes the generated art registry. Runtime PNGs are derived build output and can be regenerated.

## Kami overworld sheet

- Source: `characters/kami-overworld-4x4.png`
- Layout: 4 columns by 4 rows; rows face down, left, right, up; each row is idle followed by walk poses 01–03.
- Generation direction: create a transparent-background, pixel-art Kami matching the game's established chibi overworld scale and palette. Preserve the same face, turban, robes, silhouette, and colors across directions and neighboring frames. Keep each pose centered within its cell with clean alpha edges.
- SHA-256: `0E5B263CC883DBB616133EF78D00F8D9CC86C5DD80FD030A988E67500D969856`

## Bulma overworld sheet

- Source: `characters/bulma-overworld-4x4.png`
- Layout: 4 columns by 4 rows; rows face down, left, right, up; each row is idle followed by walk poses 01–03.
- Generation direction: use the installed Bulma sprite as the identity and pixel-scale guide. Preserve the cyan bob, facial features, white top, red scarf, teal trousers and yellow boots in every direction. Transparent cell backgrounds, clean silhouette and continuous foot/arm progression across the three walk poses.
- SHA-256: `A43F961097A4E085D3468F29823F3CE7FF799B31896F6A8B534312A20D1BE4A3`

## Capsule Corp plaza planter

- Source: `worlds/capsule-corp-plaza-planter.png`
- Generation direction: transparent pixel-art prop, low white Capsule Corporation planter with a blue capsule stripe, lush green foliage and small orange flowers. Keep the silhouette broad and low so it reads as a decorative plaza bed and does not block player movement.
- SHA-256: `4F8AB9BC42748AC8FA53A32E16F04A41A237AEE7CFB9964F76C99FE89C9CE93A`

## Cinematic keyframes

- `cinematics/gohan-ssj2-awakening-pixel-v2.png`: pixel-art SSJ2 awakening still composed to match the title-screen art treatment.
- `cinematics/father-son-kamehameha-pixel-v2.png`: pixel-art finale keyframe with Goku's black-haired spirit clearly distinct behind Gohan.
- Their generator prompts and runtime destinations are recorded in `tools/art_cinematics.py` and `src/data/cutscenes.ts`.
