#!/usr/bin/env node
/**
 * Writes the build's private config next to the signing keys (never into git):
 *
 *   <keys>/app-config.env       the FCM_* / GA_* / GQL_URL lines
 *                               scripts/create-env.js reads — for the Docker build
 *   <keys>/xcode-cloud-env.txt  the two secret variables Xcode Cloud needs,
 *                               base64, to paste into the workflow
 *
 * Values come from the root .env; the Google client ids it lacks come from
 * capacitor.config.json (already public there). Prints names, never values.
 *
 *   [ENV_FILE=path/to/.env] node tools/local-pipeline/make-config.js [D:/keys/routine-notes]
 */
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..', '..');
const envFile = process.env.ENV_FILE || path.join(repo, '.env');
const keys = process.argv[2] || 'D:/keys/routine-notes';

const NAMES = [
  'FCM_API_KEY', 'FCM_AUTH_DOMAIN', 'FCM_DATABASE_URL', 'FCM_PROJECT_ID',
  'FCM_STORAGE_BUCKET', 'FCM_MESSAGING_SENDER_ID', 'FCM_APP_ID', 'FCM_MEASUREMENT_ID',
  'GQL_URL', 'GA_PUBLIC_KEY', 'GA_CLIENT_ID', 'GA_SERVER_CLIENT_ID',
  'GA_ANDROID_CLIENT_ID', 'GA_IOS_CLIENT_ID',
];
const OPTIONAL = new Set(['FCM_MEASUREMENT_ID']);

const env = {};
fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
});

const google = JSON.parse(fs.readFileSync(path.join(repo, 'apps/web-app/capacitor.config.json'), 'utf8'))
  .plugins.GoogleAuth;
env.GA_SERVER_CLIENT_ID = env.GA_SERVER_CLIENT_ID || google.serverClientId;
env.GA_ANDROID_CLIENT_ID = env.GA_ANDROID_CLIENT_ID || google.androidClientId;
env.GA_IOS_CLIENT_ID = env.GA_IOS_CLIENT_ID || google.iosClientId;

const missing = NAMES.filter((n) => !env[n] && !OPTIONAL.has(n));
if (missing.length) {
  console.error(`Missing from .env: ${missing.join(', ')}`);
  process.exit(1);
}
if (/localhost|127\.0\.0\.1/.test(env.GQL_URL)) {
  console.error('GQL_URL in .env points at a local server; a tester build needs the live API.');
  process.exit(1);
}

// Single-quoted: the values are sourced by sh, and none may contain a quote.
const lines = NAMES.filter((n) => env[n]).map((n) => {
  if (env[n].includes("'")) throw new Error(`${n} contains a single quote`);
  return `${n}='${env[n]}'`;
});
const appConfig = `${lines.join('\n')}\n`;
fs.writeFileSync(path.join(keys, 'app-config.env'), appConfig);

const plist = path.join(keys, 'GoogleService-Info.plist');
const out = [
  '# Xcode Cloud > workflow > Environment > Environment Variables. Tick "Secret" on both.',
  `APP_CONFIG_B64=${Buffer.from(appConfig).toString('base64')}`,
  fs.existsSync(plist)
    ? `IOS_GOOGLE_SERVICE_INFO_PLIST_B64=${fs.readFileSync(plist).toString('base64')}`
    : '# IOS_GOOGLE_SERVICE_INFO_PLIST_B64: GoogleService-Info.plist not found in the keys folder',
];
fs.writeFileSync(path.join(keys, 'xcode-cloud-env.txt'), `${out.join('\n')}\n`);

console.log(`Wrote ${path.join(keys, 'app-config.env')}: ${NAMES.filter((n) => env[n]).join(', ')}`);
console.log(`Wrote ${path.join(keys, 'xcode-cloud-env.txt')}`);
