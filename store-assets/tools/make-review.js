// Builds the data for the approval sheet: every final slide downscaled to a
// reviewable width and inlined, since the artifact CSP blocks external images.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const slides = require('./slides');
const platforms = require('./platforms');

const TITLES = {
  '01-dashboard': 'Home',
  '02-progress': 'Progress',
  '03-goals': 'Goals calendar',
  '05-priority': 'Priority',
  '06-year-goals': 'Year goal ladder',
  '07-routine': 'Routine builder',
};

// Only the things a reviewer cannot see for themselves go here.
const FLAGS = {
  '06-year-goals': 'Clipping',
  '07-routine': 'Label overlap',
};

(async () => {
  const out = [];
  for (const [name, p] of Object.entries(platforms)) {
    const cards = [];
    for (const s of slides) {
      const f = path.join(root, 'final', `${name}-${s.key}.png`);
      if (!fs.existsSync(f)) continue;
      const buf = await sharp(f).resize({ width: 560 }).jpeg({ quality: 80 }).toBuffer();
      cards.push({
        key: s.key,
        title: TITLES[s.key] || s.key,
        flag: name === 'mac' && s.key === '07-routine' ? null : FLAGS[s.key] || null,
        caption: s.caption.replace(/<br>/g, ' '),
        b64: buf.toString('base64'),
        kb: Math.round(buf.length / 1024),
      });
    }
    out.push({
      name,
      label: p.label,
      canvas: p.canvas.join(' × '),
      device: p.device,
      capture: p.capture,
      cards,
    });
  }
  fs.writeFileSync(path.join(root, 'build', 'review-cards.json'), JSON.stringify(out));
  const total = out.reduce((a, g) => a + g.cards.reduce((b, c) => b + c.kb, 0), 0);
  console.log(out.map((g) => `${g.name}: ${g.cards.length} slides`).join('\n'));
  console.log(`inlined ${Math.round(total / 1024 * 10) / 10} MB of JPEG`);
})();
