// Checks the listing against what the two stores actually accept.
//
//   node store-assets/tools/verify-listing.js
//
// Exits non-zero on any FAIL. Every limit here is quoted in
// docs/store-deployment.md; this file is that table turned into assertions, so
// a listing cannot drift past a cap unnoticed between releases.
//
// What it CANNOT check, because none of it lives in the repo: the App Review
// demo account, the App Privacy and Data Safety questionnaires, the content
// rating, and whether the shipped app still looks like the design the slides
// were cut from. Those are in the pre-submission list it prints at the end.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const slides = require('./slides');
const platforms = require('./platforms');

const ROOT = path.join(__dirname, '..', '..');
const FINAL = path.join(__dirname, '..', 'final');
const IOS = path.join(ROOT, 'fastlane', 'metadata', 'en-US');
const PLAY = path.join(ROOT, 'fastlane', 'metadata', 'android', 'en-US');

const results = [];
const ok = (what, detail) => results.push({ level: 'PASS', what, detail });
const bad = (what, detail) => results.push({ level: 'FAIL', what, detail });
const warn = (what, detail) => results.push({ level: 'WARN', what, detail });

/** Trailing newlines are a file convention, not listing content. */
function readText(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
}

function checkText(label, file, max) {
  const text = readText(file);
  if (text === null) { bad(label, `missing: ${path.relative(ROOT, file)}`); return; }
  if (!text.trim()) { bad(label, 'empty'); return; }
  const n = [...text].length;
  if (n > max) bad(label, `${n} chars, limit ${max}`);
  else ok(label, `${n}/${max} chars`);
}

async function size(file) {
  const m = await sharp(file).metadata();
  return { w: m.width, h: m.height, alpha: !!m.hasAlpha, bytes: fs.statSync(file).size };
}

(async () => {
  // --- App Store text ------------------------------------------------------
  checkText('iOS name', path.join(IOS, 'name.txt'), 30);
  checkText('iOS subtitle', path.join(IOS, 'subtitle.txt'), 30);
  checkText('iOS promotional text', path.join(IOS, 'promotional_text.txt'), 170);
  checkText('iOS keywords', path.join(IOS, 'keywords.txt'), 100);
  checkText('iOS description', path.join(IOS, 'description.txt'), 4000);

  // --- Play text -----------------------------------------------------------
  checkText('Play title', path.join(PLAY, 'title.txt'), 30);
  checkText('Play short description', path.join(PLAY, 'short_description.txt'), 80);
  checkText('Play full description', path.join(PLAY, 'full_description.txt'), 4000);
  checkText('Play changelog', path.join(PLAY, 'changelogs', 'default.txt'), 500);

  // Apple counts a keyword list by characters INCLUDING the separators, and a
  // space after a comma is a wasted character rather than a delimiter.
  const kw = readText(path.join(IOS, 'keywords.txt'));
  if (kw && /,\s/.test(kw)) bad('iOS keywords format', 'space after a comma wastes a character');
  else if (kw) ok('iOS keywords format', `${kw.split(',').length} terms, no spaces`);

  // --- URLs ----------------------------------------------------------------
  for (const f of ['marketing_url.txt', 'support_url.txt', 'privacy_url.txt']) {
    const u = readText(path.join(IOS, f));
    if (!u) bad(`URL ${f}`, 'missing');
    else if (!/^https:\/\/\S+$/.test(u)) bad(`URL ${f}`, `not an https URL: ${u}`);
    else ok(`URL ${f}`, u);
  }

  // --- Screenshots ---------------------------------------------------------
  // Apple requires every slide in a device set to share one size, and Play caps
  // a side at 3840px. Both are checked against the canvas each platform claims.
  for (const [name, p] of Object.entries(platforms)) {
    const [cw, ch] = p.canvas;
    const wrong = [];
    let count = 0;
    for (const s of slides) {
      const f = path.join(FINAL, `${name}-${s.key}.png`);
      if (!fs.existsSync(f)) { wrong.push(`${s.key} missing`); continue; }
      count += 1;
      const { w, h, bytes } = await size(f);
      if (w !== cw || h !== ch) wrong.push(`${s.key} is ${w}x${h}, expected ${cw}x${ch}`);
      if (Math.max(w, h) > 3840) wrong.push(`${s.key} exceeds 3840px on a side`);
      if (bytes > 8 * 1024 * 1024) wrong.push(`${s.key} is ${Math.round(bytes / 1048576)}MB`);
    }
    if (wrong.length) bad(`${p.label} slides`, wrong.join('; '));
    else if (count < 2) bad(`${p.label} slides`, `${count} slides, both stores want at least 2`);
    else ok(`${p.label} slides`, `${count} at ${cw}x${ch}`);
  }

  // --- Play images ---------------------------------------------------------
  const icon = path.join(PLAY, 'images', 'icon.png');
  if (!fs.existsSync(icon)) bad('Play icon', 'missing');
  else {
    const m = await size(icon);
    if (m.w !== 512 || m.h !== 512) bad('Play icon', `${m.w}x${m.h}, must be 512x512`);
    else if (m.bytes > 1024 * 1024) bad('Play icon', `${Math.round(m.bytes / 1024)}kb, limit 1MB`);
    else ok('Play icon', `512x512, ${Math.round(m.bytes / 1024)}kb`);
  }

  const fg = path.join(PLAY, 'images', 'featureGraphic.png');
  if (!fs.existsSync(fg)) bad('Play feature graphic', 'missing');
  else {
    const m = await size(fg);
    if (m.w !== 1024 || m.h !== 500) bad('Play feature graphic', `${m.w}x${m.h}, must be 1024x500`);
    else if (m.alpha) bad('Play feature graphic', 'has an alpha channel; Play rejects it');
    else ok('Play feature graphic', '1024x500, no alpha');
  }

  // --- App Store icon ------------------------------------------------------
  const appIcon = path.join(ROOT, 'apps/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  if (!fs.existsSync(appIcon)) bad('App Store icon', 'missing from the asset catalogue');
  else {
    const m = await size(appIcon);
    if (m.w !== 1024 || m.h !== 1024) bad('App Store icon', `${m.w}x${m.h}, must be 1024x1024`);
    else if (m.alpha) bad('App Store icon', 'has an alpha channel; Apple rejects it');
    else ok('App Store icon', '1024x1024, no alpha');
  }

  // --- Captions ------------------------------------------------------------
  // A caption baked into a slide cannot be fixed in the console, so a typo here
  // costs a full re-render.
  const dupes = slides.map((s) => s.caption).filter((c, i, a) => a.indexOf(c) !== i);
  if (dupes.length) warn('Slide captions', `repeated: ${[...new Set(dupes)].join(' / ')}`);
  else ok('Slide captions', `${slides.length} distinct`);

  // --- Report --------------------------------------------------------------
  const pad = Math.max(...results.map((r) => r.what.length));
  results.forEach((r) => console.log(`${r.level}  ${r.what.padEnd(pad)}  ${r.detail}`));

  const fails = results.filter((r) => r.level === 'FAIL');
  const warns = results.filter((r) => r.level === 'WARN');
  console.log(`\n${results.length - fails.length - warns.length} pass, ${warns.length} warn, ${fails.length} fail`);

  console.log(`
Not checkable from the repo - confirm in the consoles before submitting:
  1. App Review demo account (login-gated app; the most common rejection cause)
  2. Play Data Safety form: FCM token, Google/Apple sign-in, analytics
  3. App Privacy questionnaire, content rating, target audience, ads = none
  4. The shipped app still looks like packages/design - the slides are cut from
     the design prototypes, and Apple 2.3.3 / Play metadata policy both require
     screenshots to show the real in-app experience
  5. Release notes describe THIS build
  6. SYNC_STORE_METADATA=true on the job, after stage-fastlane.js has run`);

  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
