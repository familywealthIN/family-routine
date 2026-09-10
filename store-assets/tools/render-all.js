// Builds one composite HTML per slide for a platform.
//   node store-assets/build/render-all.js <platform>
// Reads raw/<platform>/<key>.(jpeg|jpg|png) and writes build/<platform>-<key>.html.
const fs = require('fs');
const path = require('path');
const { build } = require('./compose');
const slides = require('./slides');
const platforms = require('./platforms');

const [, , name] = process.argv;
const p = platforms[name];
if (!p) {
  console.error(`usage: render-all.js <${Object.keys(platforms).join('|')}>`);
  process.exit(1);
}

const root = path.join(__dirname, '..');
const [w, h] = p.canvas;

const results = [];
for (const s of slides) {
  // JPEG first: that is what the capture step writes, because Chrome's PNG
  // encode of a retina frame times out over CDP.
  const shot = ['jpeg', 'jpg', 'png']
    .map((ext) => path.join(root, 'raw', name, `${s.key}.${ext}`))
    .find((f) => fs.existsSync(f));
  if (!shot) { results.push({ key: s.key, skipped: 'no capture' }); continue; }

  const caption = p.singleLineCaption ? s.caption.replace(/<br>/g, ' ') : s.caption;
  const out = path.join(root, 'build', `${name}-${s.key}.html`);
  const r = build({
    shot, caption, width: w, height: h, out, device: p.device,
  });
  results.push({
    key: s.key, out: path.basename(out), fits: r.fitsCanvas, src: `${r.src.w}x${r.src.h}`,
  });
}

console.log(`${p.label}  canvas ${w}x${h}  device ${p.device}`);
for (const r of results) {
  console.log(`  ${r.key.padEnd(16)} ${r.skipped || `${r.out}  src ${r.src}  fits=${r.fits}`}`);
}
