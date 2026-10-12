// Builds the two Play listing images that are not screenshots.
//
//   node store-assets/tools/make-store-images.js
//
// Output goes straight into the fastlane tree and IS committed, because neither
// file is a copy of something else in the repo:
//
//   fastlane/metadata/android/en-US/images/icon.png            512x512
//   fastlane/metadata/android/en-US/images/featureGraphic.png  1024x500, no alpha
//
// The screenshots are staged separately by stage-fastlane.js, which is a pure
// file copy so a release job can run it without Playwright.
//
// Apple needs neither file: the 1024x1024 App Store icon already lives in the
// asset catalogue (`AppIcon-512@2x.png`, RGB with no alpha, which is what Apple
// requires), and there is no feature-graphic equivalent.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const sharp = require('sharp');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const PLAY_IMG = path.join(ROOT, 'fastlane', 'metadata', 'android', 'en-US', 'images');
const ICON_512 = path.join(ROOT, 'apps/web-app/public/img/icons/android-chrome-512x512.png');
const LOGO = path.join(ROOT, 'packages/design/assets/logo.png');

// The slide palette, so the listing reads as one set: sky #bdddf2, cloud
// #d6ecf9, band #97daea, ink #20404f. Same shapes as compose.js draws behind
// each device, at the feature graphic's much wider aspect.
const FEATURE_HTML = (logoDataUri) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:500px;overflow:hidden}
body{background:#bdddf2;position:relative;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.band{position:absolute;left:0;right:0;bottom:0;height:150px;background:#97daea;
      border-radius:1024px 1024px 0 0 / 60px 60px 0 0}
.cloud{position:absolute;background:#d6ecf9;border-radius:50%;opacity:.85}
.c1{width:420px;height:130px;right:-80px;top:40px}
.c2{width:320px;height:100px;left:-90px;top:250px}
.c3{width:260px;height:80px;right:120px;bottom:70px;opacity:.6}
.wrap{position:absolute;inset:0;display:flex;align-items:center;gap:44px;padding:0 84px}
.logo{width:150px;height:150px;flex-shrink:0;border-radius:34px;background:#fff;
      box-shadow:0 14px 34px rgba(11,32,74,.22);display:flex;align-items:center;justify-content:center}
.logo img{width:108px;height:108px;object-fit:contain}
h1{font-size:62px;font-weight:800;color:#20404f;letter-spacing:-1.5px;line-height:1.04}
p{margin-top:14px;font-size:27px;font-weight:600;color:#2f5d72;line-height:1.3}
</style></head><body>
<div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
<div class="band"></div>
<div class="wrap">
  <div class="logo"><img src="${logoDataUri}" alt=""></div>
  <div>
    <h1>Routine&nbsp;Notes</h1>
    <p>Time-box your day. Cascade your year goals<br>down to it. Let agents do the rest.</p>
  </div>
</div>
</body></html>`;

async function featureGraphic(out) {
  const logo = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;
  const tmp = path.join(__dirname, '..', 'build', 'feature-graphic.html');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, FEATURE_HTML(logo));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 500 } });
  await browser.close();

  // Play rejects a feature graphic carrying an alpha channel. Flatten onto the
  // sky colour rather than white, so a stray transparent pixel cannot show as a
  // seam against the background.
  await sharp(png).flatten({ background: '#bdddf2' }).removeAlpha().png().toFile(out);
}

(async () => {
  fs.mkdirSync(PLAY_IMG, { recursive: true });

  // Play's 512x512 icon may keep its alpha channel, unlike the feature graphic,
  // so the PWA icon ships as-is.
  fs.copyFileSync(ICON_512, path.join(PLAY_IMG, 'icon.png'));
  await featureGraphic(path.join(PLAY_IMG, 'featureGraphic.png'));

  for (const f of ['icon.png', 'featureGraphic.png']) {
    const m = await sharp(path.join(PLAY_IMG, f)).metadata();
    console.log(`  ${f.padEnd(20)} ${m.width}x${m.height}  alpha=${!!m.hasAlpha}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
