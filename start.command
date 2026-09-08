#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ -x .runtime/node/bin/node ]]; then
  exec .runtime/node/bin/node scripts/local.mjs
fi
if ! command -v node >/dev/null 2>&1; then
  print 'Install Node.js 24, then run node scripts/setup.mjs in this folder.'
  exit 1
fi
node scripts/setup.mjs && exec .runtime/node/bin/node scripts/local.mjs
