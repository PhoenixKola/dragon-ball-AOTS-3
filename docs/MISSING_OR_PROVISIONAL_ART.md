# Missing or provisional art

Nothing in this project is human-approved (`approved=false` everywhere). Outcomes: **resolved-derived** (usable derived art, not authentic), **provisional-fallback** (tool-drawn or tinted stand-in), **missing** (no art produced).

| class | id | requirement | outcome | detail |
|---|---|---|---|---|
| hero-form | gohan-ssj | Distinct golden-haired Gohan SSJ combat + 4-way overworld | **resolved-derived** | actor `gohan-ssj`: gohan-base with recoloured gold hair + yellow aura rim (hair-region heuristic; not redrawn) |
| hero-form | gohan-ssj2 | Gohan SSJ2 true sprites with lightning and distinct hair | **resolved-derived** | actor `gohan-ssj2`: gold hair + wider aura + baked procedural lightning; real SSJ2 hair/pose art still missing |
| hero-form | vegeta-ascended | Vegeta Grade 2 distinct expanded musculature | **resolved-derived** | actor `vegeta-ascended`: vegeta-ssj stretched 1.3x (NEAREST) + orange aura; no real expanded musculature |
| hero-form | trunks-ultra-grade3 | Trunks Grade 3 bulky authentic form with speed penalty pose | **resolved-derived** | actor `trunks-ultra`: trunks-ssj stretched 1.4x + red aura + sparks; no real Grade 3 art |
| hero-story | goku-virus-weakened | Injured/virus Goku in story and battle | **provisional-fallback** | actor `goku-weakened`: desaturated/green tint of goku-base only; no ill/slumped poses |
| hero-story | gohan-wounded-arm | One-armed wounded Gohan for finale | **provisional-fallback** | actor `gohan-wounded`: heuristic bandage/blood overlay on gohan-base; not a real one-armed pose |
| hero-story | gohan-alternate-clothing | Gohan alternate training outfit | **provisional-fallback** | actor `gohan-training`: purple gi hue-shifted to green (recolour only) |
| enemy | super-perfect-cell | Distinct lightning/aura final Cell variant; do not alias Perfect Cell without explicit fallback | **provisional-fallback** | actor `cell-super-perfect`: Perfect Cell yellow-shifted + gold aura rim + baked lightning; distinct but derived |
| enemy | cell-junior | Distinct small Cell Junior, multiple units | **provisional-fallback** | actor `cell-junior`: Perfect Cell hue-shifted blue, 2:1 NEAREST reduction |
| enemy | landing-security | Landing security and Frieza Force troopers | **provisional-fallback** | procedural trooper |
| enemy | recon-probe | Reconnaissance probe enemy | **provisional-fallback** | procedural probe |
| enemy | drain-drone | Android Ki absorption drone | **provisional-fallback** | procedural drone |
| enemy | android-19-scout | Android 19 scout helper | **resolved-derived** | no separate scout art: runtime should reuse `android-19` (genuine sheet) or `recon-probe`; no new file |
| enemy | armored-sentinel | Armored security sentinels | **provisional-fallback** | procedural sentinel |
| enemy | security-grid | Security grid enemy | **provisional-fallback** | procedural grid panel |
| enemy | cell-husk | Cell husk enemy | **provisional-fallback** | procedural husk |
| enemy | absorbed-shadow | Absorbed-human shadow enemy | **provisional-fallback** | procedural shadow silhouette |
| enemy | cell-probe | Cell probe enemy | **provisional-fallback** | procedural probe |
| enemy | training-sentinel | Training enemy | **provisional-fallback** | procedural sentinel |
| enemy | chamber-guardian | Time Chamber guardian | **provisional-fallback** | procedural guardian |
| npc | bulma | Full overworld directional sprites and expressive portraits | **provisional-fallback** | procedural NPC `bulma`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | chi-chi | Full overworld directional sprites and expressive portraits | **provisional-fallback** | procedural NPC `chi-chi`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | yamcha | Full overworld and expressive portrait | **provisional-fallback** | procedural NPC `yamcha`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | kami | Dialogue + assimilation cutscene portraits | **provisional-fallback** | procedural NPC `kami`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | king-kai | Story sacrifice context portrait/overworld | **provisional-fallback** | procedural NPC `king-kai`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | mr-satan | Cell Games cinematic sprites/portrait | **provisional-fallback** | procedural NPC `mr-satan`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | researchers | Distinct research NPCs and lab scientists | **provisional-fallback** | procedural NPC `researcher`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| npc | civilians | Rescue civilians town and city | **provisional-fallback** | procedural NPC `civilian`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn) |
| story | future-trunks-arrival | Scripted cutscene sprites/sequence | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | androids-awakened | 17/18/16 awakening cutscene | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | piccolo-kami-assimilation | Kami merge unique effect/cutscene | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | cell-absorbs-17 | Absorption unique VFX and anatomy stage transition | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | cell-absorbs-18 | Absorption to perfect unique sequence | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | gohan-ssj2-awakening | Android 16 destruction, SSJ2 awakening sequence | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | goku-sacrifice | Teleport/self-destruct with Goku and King Kai | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | cell-returns | Super Perfect Cell return cinematic | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | father-son-finale | Final struggle, wounded Gohan and Goku silhouette | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| story | trunks-departure-credits | Chronology-safe goodbye and credits | **missing** | no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used |
| vfx | character-specific-markers | Per-skill animation semantic hit markers + clip timing not authored | **missing** | hit markers/clip timing are engine data (not art); 35 VFX ids registered, frames mostly `variants_not_sequence` |
| map | collision-maps | Actual navigable tilemap data, collision layers, transition markers, enemy placements | **missing** | art side supplies tiles/props/backdrops + MAP_ART_INDEX.md; collision/triggers are authored in src/data/maps by the engine |
| audio | music-and-sfx | Original music and effects not included | **missing** | out of scope for the art pipeline; runtime synthesizes audio |

## 13 exact duplicate-frame slots (art/source/manifest/DUPLICATE-FRAMES-TO-FIX.md)

Groups 1-4,8-12 are overworld slots; 5 = piccolo portrait; 6-7 = tien battle. Handling (see `note` fields in the registry):

| group | slot | outcome |
|---|---|---|
| 1-4 | gohan-base overworld down/idle~walk-02, down/walk-01~right/walk-03, left/idle~walk-02, right/idle~walk-02 | walk slots replaced by derived frames (mirrored alternate leg / 2px bob), note `duplicate_slot`; the genuine idle frames stay; **down/idle, left/idle, right/idle remain duplicates of walk frames only in the bundle, not in the registry** |
| 5 | piccolo portrait base == kami-merged | piccolo-kami portrait replaced by a head crop of its own battle idle (derived) |
| 6 | tien battle idle == charge | charge = idle + blue rim (derived) |
| 7 | tien battle attack == special | special = attack + gold rim (derived) |
| 8-12 | tien overworld duplicates | duplicate walk/idle slots replaced by mirrored/bob derived frames; tien down/idle, up/walk-01 kept genuine |

Derived replacements are labelled `derived`, never `genuine`, and are NOT unique animation.

## Other provisional/known defects
- 84 skill icons: copied verbatim; every 49x49 crop contains slivers of neighbouring atlas icons (crop bleed) and several icons are cut off by the crop. Semantic match to skills is unverified. No near-duplicate pairs (MAD<6 on 12x12 thumbs).
- 15 item ids use stand-in icons (see itemIcons list in ART_INTEGRATION_REPORT.md).
- SSJ / Kami hero sheets: sprite cells in the bundle clip the character at the 418x418 cell edge (flagged `edge_touch` in frame notes: gohan-base, goku-ssj, trunks-ssj, vegeta-ssj, piccolo-kami, tien-base overworld). Where the source sheet itself continues the sprite the build re-extracts it; otherwise the clipped bundle crop is kept.
- Enemy sheets: frames hand-assigned; most enemy sprites are front/three-quarter views (facing=`front`).
- World tiles: 32px tiles are cross-blended crops (derived); water tiles for 6 maps are procedural fallback.