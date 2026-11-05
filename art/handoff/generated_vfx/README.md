# Generated combat VFX source

## `impact-blue-contact-4f.png`

- Generator: built-in Codex image generation (no API key or external service)
- Generated: 2026-11-05
- Reference: installed `public/assets/vfx/impact-hit/0.png` (palette, pixel density, outline and scale)
- Output: transparent RGBA, 2172x724, four equal 543px-wide horizontal cells
- SHA-256: `2b1014dbf05f80b1718735889edf6effc680543874cad819125e4baee8f1461b`
- Status: generated candidate; human art approval pending
- Integration: `tools/art_vfx.py` crops the four stages, aligns each on a 128x128 canvas and downsamples with nearest-neighbour sampling to build `impact-hit`.

Prompt:

> Use case: stylized-concept. Asset type: transparent pixel-art VFX sprite sheet for a polished 16-bit-inspired JRPG. Input image: Image 1 is the installed AOTS3 blue-white impact star; use it as the exact palette, pixel density, outline, glow, and scale reference, not as a frame to copy. Primary request: create one coherent four-frame temporal melee impact burst, arranged left-to-right in a single horizontal strip, with equal frame boxes and a shared center point. Animation progression: frame 1 a tight white-blue contact flash; frame 2 the cobalt jagged star burst expands; frame 3 the star breaks into a few small blue-white sparks around an open center; frame 4 only a few tiny fading sparks remain. Style: crisp detailed pixel art, hard-edged pixels, bright white core, electric cobalt and cyan rays, restrained glow matching the reference. Composition: each frame self-contained in its own quarter of the canvas, same size and alignment, generous transparent gutters, no pixels crossing into neighboring frames. Constraints: truly transparent background; no panels, dividers, background color, floor shadow, text, letters, logos, watermark, characters, or extra effects; keep each stage visually distinct and readable when cropped into four equal cells.
