#!/usr/bin/env node
/**
 * Stamps a release version into the native projects and the web app.
 *
 * The git tag is the single source of truth for the marketing version; nothing
 * version-related is committed, so this runs in CI just before each build.
 *
 *   VERSION=1.3.0 BUILD_NUMBER=42 node scripts/stamp-version.mjs
 *
 * Writes:
 *   apps/android/app/build.gradle   versionName "1.3.0", versionCode 42
 *   apps/ios/.../project.pbxproj    MARKETING_VERSION = 1.3.0
 *   apps/web-app/package.json       "version": "1.3.0"
 *
 * iOS deliberately gets no CURRENT_PROJECT_VERSION here. Two workflows upload
 * iOS builds (release + PR) and github.run_number is scoped per workflow file,
 * so the counters would collide in TestFlight. The fastlane lanes derive the
 * build number from latest_testflight_build_number instead.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const version = process.env.VERSION;
const buildNumber = process.env.BUILD_NUMBER;

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`VERSION must be set to X.Y.Z (got: ${version ?? '<unset>'})`);
  console.error('Both stores reject non-numeric marketing versions.');
  process.exit(1);
}

if (!buildNumber || !/^\d+$/.test(buildNumber)) {
  console.error(`BUILD_NUMBER must be set to a positive integer (got: ${buildNumber ?? '<unset>'})`);
  process.exit(1);
}

/** Replace in a file, failing loudly if the pattern never matched. */
function rewrite(relPath, replacements) {
  const path = join(repoRoot, relPath);
  let text = readFileSync(path, 'utf8');

  for (const { pattern, replacement, label } of replacements) {
    const before = text;
    text = text.replace(pattern, replacement);
    if (text === before) {
      // A silent no-op here ships the wrong version to a store, which cannot be
      // undone — a duplicate versionCode/build number is rejected forever.
      console.error(`FAILED: no match for ${label} in ${relPath}`);
      console.error(`  pattern: ${pattern}`);
      process.exit(1);
    }
  }

  writeFileSync(path, text);
  console.log(`  stamped ${relPath}`);
}

console.log(`Stamping version ${version} (build ${buildNumber})`);

rewrite('apps/android/app/build.gradle', [
  {
    label: 'versionCode',
    pattern: /versionCode\s+\d+/,
    replacement: `versionCode ${buildNumber}`,
  },
  {
    label: 'versionName',
    pattern: /versionName\s+"[^"]*"/,
    replacement: `versionName "${version}"`,
  },
]);

// MARKETING_VERSION appears once per build configuration (Debug + Release).
rewrite('apps/ios/App/App.xcodeproj/project.pbxproj', [
  {
    label: 'MARKETING_VERSION',
    pattern: /MARKETING_VERSION = [^;]+;/g,
    replacement: `MARKETING_VERSION = ${version};`,
  },
]);

rewrite('apps/web-app/package.json', [
  {
    label: 'version',
    pattern: /"version":\s*"[^"]*"/,
    replacement: `"version": "${version}"`,
  },
]);

console.log('Done.');
