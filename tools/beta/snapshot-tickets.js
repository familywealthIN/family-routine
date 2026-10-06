/* eslint-disable no-console */
// Writes every still-open beta ticket to docs/beta/tickets.json, which IS committed.
//
//   node tools/beta/snapshot-tickets.js
//
// The cloud routine has no Asana token and no local .env, so this snapshot is how the
// fix half of the cycle learns what is outstanding. Refresh it whenever tickets change.
const fs = require('fs');
const path = require('path');
const { api, IDS } = require('./asana');

const OUT = path.join(__dirname, '..', '..', 'docs', 'beta', 'tickets.json');

const parseRef = (name) => (name.match(/^(D-\d+)/) || [])[1] || null;
const parseSeverity = (name) => (name.match(/\[([^\]]+)\]/) || [])[1] || 'Unclassified';

(async () => {
  const tasks = await api('GET', `/tasks?project=${IDS.project}&opt_fields=name,completed&limit=100`);
  const epics = tasks.filter((t) => /^Beta Test fixes/i.test(t.name));
  const out = { generatedFrom: 'Asana project Routine Notes', epics: [] };

  for (const e of epics) {
    const subs = await api('GET', `/tasks/${e.gid}/subtasks?opt_fields=name,notes,completed`);
    const open = subs.filter((s) => !s.completed);
    out.epics.push({
      gid: e.gid,
      name: e.name,
      permalink: `https://app.asana.com/0/${IDS.project}/${e.gid}`,
      openCount: open.length,
      totalCount: subs.length,
      tickets: open.map((s) => ({
        gid: s.gid,
        ref: parseRef(s.name),
        severity: parseSeverity(s.name),
        title: s.name.replace(/^D-\d+\s*\[[^\]]+\]\s*/, ''),
        name: s.name,
        notes: s.notes,
      })),
    });
  }

  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  const total = out.epics.reduce((n, e) => n + e.openCount, 0);
  console.log(`wrote ${path.relative(process.cwd(), OUT)} — ${total} open ticket(s) across ${out.epics.length} epic(s)`);
  out.epics.forEach((e) => console.log(`  ${e.openCount}/${e.totalCount} open  ${e.name}`));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
