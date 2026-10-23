// Browser release checks. The Windows Electron package has its own smoke test.
import { spawnSync } from 'node:child_process';

const node = process.execPath;
const steps = [
  [node, ['node_modules/typescript/bin/tsc', '--noEmit']],
  [node, ['node_modules/vite/bin/vite.js', 'build']],
  [node, ['node_modules/vitest/vitest.mjs', 'run', 'tests/integration/mksave.test.ts']],
  [node, ['tests/e2e/battle-controls.mjs']],
  [node, ['tests/e2e/checks.mjs']],
  [node, ['tests/e2e/playthrough.mjs']],
];
for (const [command, args] of steps) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
