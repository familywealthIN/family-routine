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
  const counts = {
    phone: 0, ten: 0, seven: 0, ios: 0,
  };
  const missing = [];

  slides.forEach((s, i) => {
    // `supply` and `deliver` both take a folder in filename order, so the
    // listing order has to live in the filename.
    const n = String(i + 1).padStart(2, '0');
    const android = path.join(FINAL, `android-${s.key}.png`);
    const ipad = path.join(FINAL, `ipad-${s.key}.png`);
    const tablet = path.join(FINAL, `android-tablet-${s.key}.png`);
    const iphone = path.join(FINAL, `iphone-${s.key}.png`);

    if (fs.existsSync(android)) {
      stage(android, path.join(PLAY_IMG, 'phoneScreenshots', `${n}-${s.key}.png`));
      counts.phone += 1;
    } else missing.push(`android-${s.key}`);

    if (fs.existsSync(tablet)) {
      // Play's 7" and 10" tablet slots both take the Android tablet set, which
      // is what earns the tablet-optimised badge. These used to be the iPad
      // slides, which put an Apple device on Google Play.
      stage(tablet, path.join(PLAY_IMG, 'tenInchScreenshots', `${n}-${s.key}.png`));
      stage(tablet, path.join(PLAY_IMG, 'sevenInchScreenshots', `${n}-${s.key}.png`));
      counts.ten += 1;
      counts.seven += 1;
    } else missing.push(`android-tablet-${s.key}`);

    if (fs.existsSync(ipad)) {
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
  console.log(`          ${counts.phone} phone, ${counts.ten} tenInch, ${counts.seven} sevenInch`);
  console.log(`Apple   ${path.relative(ROOT, IOS_SHOTS)}`);
  console.log(`          ${counts.ios} screenshots`);
  // The Play API has no Chromebook image type, so `supply` cannot carry these;
  // they are uploaded by hand from store-assets/final/ (see README).
  const chromebook = slides.filter((s) => fs.existsSync(path.join(FINAL, `googlebook-${s.key}.png`))).length;
  console.log(`Manual  Play Console > Main store listing > Chromebook`);
  console.log(`          ${chromebook} googlebook-*.png in ${path.relative(ROOT, FINAL)}`);
  if (missing.length) console.log(`MISSING  ${missing.join(', ')}`);
  return { counts, missing };
}

module.exports = { run, PLAY_IMG, IOS_SHOTS };

if (require.main === module) {
  const { missing } = run();
  if (missing.length) process.exit(1);
}
