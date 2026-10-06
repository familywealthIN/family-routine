// Stages the finished slides into the folders `supply` and `deliver` read.
//
//   node store-assets/tools/stage-fastlane.js
//
// Pure file copy - no browser, no image processing - so a release job can run it
// before the fastlane lane without pulling Playwright into CI. The staged copies
// are gitignored: `store-assets/final/` is the single source of truth, and
// committing the same 12MB of PNG twice helps nobody.
//
// The authored images that are NOT copies of a slide (`icon.png`,
// `featureGraphic.png`) are committed, and built by make-store-images.js.
//
// Nothing here uploads anything. That happens only when a release job runs with
// SYNC_STORE_METADATA=true.
const fs = require('fs');
const path = require('path');
const slides = require('./slides');

const ROOT = path.join(__dirname, '..', '..');
const FINAL = path.join(__dirname, '..', 'final');
const PLAY_IMG = path.join(ROOT, 'fastlane', 'metadata', 'android', 'en-US', 'images');
const IOS_SHOTS = path.join(ROOT, 'fastlane', 'screenshots', 'en-US');

function stage(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function run() {
  const counts = { phone: 0, ten: 0, ios: 0 };
  const missing = [];

  slides.forEach((s, i) => {
    // `supply` and `deliver` both take a folder in filename order, so the
    // listing order has to live in the filename.
    const n = String(i + 1).padStart(2, '0');
    const android = path.join(FINAL, `android-${s.key}.png`);
    const ipad = path.join(FINAL, `ipad-${s.key}.png`);
    const iphone = path.join(FINAL, `iphone-${s.key}.png`);

    if (fs.existsSync(android)) {
      stage(android, path.join(PLAY_IMG, 'phoneScreenshots', `${n}-${s.key}.png`));
      counts.phone += 1;
    } else missing.push(`android-${s.key}`);

    if (fs.existsSync(ipad)) {
      // The iPad landscape set doubles as Play's 10" tablet set, which is what
      // earns the tablet-optimised badge.
      stage(ipad, path.join(PLAY_IMG, 'tenInchScreenshots', `${n}-${s.key}.png`));
      counts.ten += 1;
      // `deliver` routes an iOS screenshot by its pixel size, so the iPad and
      // iPhone sets share one folder.
      stage(ipad, path.join(IOS_SHOTS, `ipad-${n}-${s.key}.png`));
      counts.ios += 1;
    } else missing.push(`ipad-${s.key}`);

    if (fs.existsSync(iphone)) {
      stage(iphone, path.join(IOS_SHOTS, `iphone-${n}-${s.key}.png`));
      counts.ios += 1;
    } else missing.push(`iphone-${s.key}`);
  });

  console.log(`Play    ${path.relative(ROOT, PLAY_IMG)}`);
  console.log(`          ${counts.phone} phone, ${counts.ten} tenInch`);
  console.log(`Apple   ${path.relative(ROOT, IOS_SHOTS)}`);
  console.log(`          ${counts.ios} screenshots`);
  if (missing.length) console.log(`MISSING  ${missing.join(', ')}`);
  return { counts, missing };
}

module.exports = { run, PLAY_IMG, IOS_SHOTS };

if (require.main === module) {
  const { missing } = run();
  if (missing.length) process.exit(1);
}
