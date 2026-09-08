import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
const server = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, THERU_DEV: '1' },
});
const client = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.ts'],
  { stdio: 'inherit' },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill('SIGTERM');
  client.kill('SIGTERM');
  setTimeout(() => process.exit(code), 300).unref();
}
server.on('exit', (code) => stop(code ?? 1));
client.on('exit', (code) => stop(code ?? 1));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('\nTHERU PARTY · Open one of these addresses on the same network:');
for (const [label, values] of Object.entries(networkInterfaces()))
  for (const v of values ?? [])
    if (v.family === 'IPv4')
      console.log(`  ${label}: http://${v.address}:${process.env.CLIENT_PORT || 5173}`);
console.log('Choose your Wi-Fi/Ethernet interface when several addresses are listed.\n');
