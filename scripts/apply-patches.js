#!/usr/bin/env node
// postinstall: apply patches/ with patch-package.
//
// patch-package is a devDependency. The server deploy runs
// `npm install --omit=dev` inside apps/server, and npm still fires this
// root postinstall, so skip quietly when patch-package isn't installed —
// the patches only touch the native apps, never the server bundle.
const { spawnSync } = require('child_process');

let bin;
try {
  bin = require.resolve('patch-package/index.js');
} catch (e) {
  console.log('patch-package not installed (production install); skipping patches.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [bin], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
