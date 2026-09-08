import { spawnSync } from 'node:child_process';
const jobs = [
  ['tests/e2e/foundation.mjs'],
  ['tests/e2e/hit-agreement.mjs'],
  ['tests/e2e/presentation.mjs'],
  ['tests/e2e/localization-audio.mjs'],
  ['tests/e2e/cups.mjs'],
];
for (const args of jobs) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
