/* eslint-disable no-console */
const { api, IDS } = require('./asana');

const epic = process.argv[2] || IDS.epic2026w34;

(async () => {
  const p = await api('GET', `/tasks/${epic}?opt_fields=name,completed,permalink_url`);
  console.log(`PARENT ${p.gid} [${p.completed ? 'x' : ' '}] ${p.name}`);
  console.log(p.permalink_url);
  const subs = await api('GET', `/tasks/${epic}/subtasks?opt_fields=name,completed`);
  console.log(`\n${subs.length} subtasks:`);
  subs.forEach((s) => console.log(`[${s.completed ? 'x' : ' '}] ${s.gid}  ${s.name}`));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
