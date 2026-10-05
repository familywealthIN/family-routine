/* eslint-disable no-console */
const { api } = require('./asana');
(async () => {
  for (const gid of process.argv.slice(2)) {
    const t = await api('GET', `/tasks/${gid}?opt_fields=name,notes,completed`);
    console.log(`===== ${t.gid} =====`);
    console.log(t.name);
    console.log('---');
    console.log(t.notes);
    console.log('');
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
