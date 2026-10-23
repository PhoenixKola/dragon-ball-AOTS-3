import { describe, expect, it } from 'vitest';
import { registry } from '../../src/engine/assets';

// With one scale per actor (derived from its idle frame), no pose may render absurdly larger than idle, and
// no frame may have its feet anchor outside its own PNG - these are the causes of visible size jumps / popping.
describe('sprite stability (one scale per actor)', () => {
  const rows: string[] = [];
  for (const a of Object.values(registry.actors)) {
    const idle = a.battle.idle;
    if (!idle) continue;
    for (const [state, f] of Object.entries(a.battle)) {
      if (!f) continue;
      it(`${a.id}/${state} anchor inside frame and sane size`, () => {
        expect(f.feet[0]).toBeGreaterThanOrEqual(0);
        expect(f.feet[0]).toBeLessThanOrEqual(f.w);
        expect(f.feet[1]).toBeGreaterThanOrEqual(0);
        expect(f.feet[1]).toBeLessThanOrEqual(f.h);
        const hr = f.bbox[3] / idle.bbox[3];
        const wr = f.bbox[2] / idle.bbox[3];
        if (hr > 1.7 || wr > 3.2) rows.push(`${a.id}/${state}: h x${hr.toFixed(2)} w x${wr.toFixed(2)}`);
        expect(hr, `${a.id}/${state} height ratio`).toBeLessThan(2.2);
        expect(wr, `${a.id}/${state} width ratio`).toBeLessThan(4.5);
      });
    }
  }
});
