const path = require('path');
const { chromium } = require('playwright');
const { serve, DESIGN } = require('./capture-design');
const files = ['Routine Notes Final.dc.html','Progress.dc.html','Goals.dc.html','Priority.dc.html','Year Goals.dc.html','Routines.dc.html'];
(async () => {
  const { server, port } = await serve(DESIGN);
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1700, height: 1100 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,110)); });
    await p.goto(`http://127.0.0.1:${port}/${encodeURIComponent(f)}`, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3500);
    const info = await p.evaluate(() => [...document.querySelectorAll('.dv-opt')].map(o => {
      const host = [...o.children].find(c => c.className !== 'dv-olabel');
      const r = host ? host.getBoundingClientRect() : null;
      const label = (o.querySelector('.dv-olabel') || {}).innerText || '';
      // every descendant that looks like a device screen
      const deep = host ? [...host.querySelectorAll('*')].slice(0, 6).map(e => `${e.tagName}.${String(e.className).slice(0,20)}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) : [];
      return { id: o.id, label: label.replace(/\n/g,' ').slice(0, 70), host: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : 'none', deep };
    }));
    console.log('\n### ' + f);
    info.forEach(i => console.log(' ', i.id, '|', i.host, '|', i.label, '\n     ', i.deep.join('  ')));
    if (errs.length) console.log('  ERR:', errs.slice(0,3));
    await p.close();
  }
  await b.close(); server.close();
})();
