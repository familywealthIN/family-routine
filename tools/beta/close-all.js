/* eslint-disable no-console */
// Closes every open ticket across every "Beta Test fixes" epic, and the epics themselves.
//
//   node tools/beta/close-all.js --reason "<why>" [--dry]
//
// Used when a cycle starts from a clean board - e.g. the interface under test was replaced,
// so the previous board describes screens that no longer exist. Every ticket gets a comment
// naming the reason BEFORE it is completed, so the closure is auditable and reversible:
// nothing is deleted, and reopening a ticket restores it with its history intact.
// Snapshot first with `node tools/beta/snapshot-tickets.js` - docs/beta/tickets.json is
// committed and is the record of what the board held.
const { api, IDS } = require('./asana');

const rest = process.argv.slice(2);
const DRY = rest.includes('--dry');
const reason = (() => {
  const i = rest.indexOf('--reason');
  return i >= 0 ? rest[i + 1] : null;
})();

if (!reason) {
  console.error('usage: node tools/beta/close-all.js --reason "<why>" [--dry]');
  process.exit(1);
}

(async () => {
  const tasks = await api('GET', `/tasks?project=${IDS.project}&opt_fields=name,completed&limit=100`);
  const epics = tasks.filter((t) => /^Beta Test fixes/i.test(t.name));
  console.log(`${epics.length} beta epic(s)${DRY ? ' — DRY RUN, nothing will change' : ''}\n`);

  let closedTickets = 0;
  let closedEpics = 0;
  for (const e of epics) {
    const subs = await api('GET', `/tasks/${e.gid}/subtasks?opt_fields=name,completed`);
    const open = subs.filter((s) => !s.completed);
    console.log(`${e.name} — ${open.length}/${subs.length} open`);
    for (const s of open) {
      if (!DRY) {
        await api('POST', `/tasks/${s.gid}/stories`, { text: `Closed without a fix: ${reason}` });
        await api('PUT', `/tasks/${s.gid}`, { completed: true });
      }
      console.log(`  ${DRY ? 'WOULD CLOSE' : 'CLOSED'}  ${s.gid}  ${s.name}`);
      closedTickets += 1;
    }
    if (!e.completed) {
      if (!DRY) {
        await api('POST', `/tasks/${e.gid}/stories`, { text: `Epic closed: ${reason}` });
        await api('PUT', `/tasks/${e.gid}`, { completed: true });
      }
      console.log(`  ${DRY ? 'WOULD CLOSE EPIC' : 'CLOSED EPIC'}  ${e.gid}`);
      closedEpics += 1;
    }
    console.log('');
  }
  console.log(`${DRY ? 'would close' : 'closed'} ${closedTickets} ticket(s) and ${closedEpics} epic(s)`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
