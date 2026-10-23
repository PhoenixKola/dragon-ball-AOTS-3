import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runCampaign } from './simulation.test';

// Natural-progression matrix: fresh save to credits, ordinary XP, real encounters, no debug flags, 6 deterministic seeds per policy.
it('policy matrix', async () => {
  const rows: Record<string, unknown>[] = [];
  for (const pol of ['attentive', 'average', 'noguard_normal', 'noguard_easy']) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { report } = await runCampaign(pol, seed, { quiet: true });
      rows.push({ pol, seed, completed: report.completed, total: report.total, defeats: report.defeats, failed: report.failed ? report.failed.split('\n')[0] : null, level: report.checkpoints.length ? (report.checkpoints[report.checkpoints.length - 1] as { levels: Record<string, number> }).levels : null });
    }
  }
  mkdirSync('tests/logs', { recursive: true });
  writeFileSync('tests/logs/sim-policy-matrix.json', JSON.stringify(rows, null, 1));
  const ok = (p: string) => rows.filter((r) => r.pol === p).every((r) => r.completed === r.total);
  expect(ok('attentive')).toBe(true);
  expect(ok('average')).toBe(true);
  expect(ok('noguard_easy')).toBe(true);
  // documented expectation: Normal + never guarding hits a wall at the late Cell fights
  expect(rows.filter((r) => r.pol === 'noguard_normal').every((r) => r.completed === r.total || typeof r.failed === 'string')).toBe(true);
}, 900000);
