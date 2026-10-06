/* eslint-disable no-console */
// Writes ticket-fixer results back onto their Asana tickets.
//
//   node tools/beta/report-fix.js <fix-reports.json> [--dry]
//
// A ticket is only completed once the fix is verified AND the next beta run has been told
// how to re-check it; everything else gets a comment explaining where it stopped.
const fs = require('fs');
const { api } = require('./asana');

const [, , reportsPath, ...rest] = process.argv;
const DRY = rest.includes('--dry');
if (!reportsPath) {
  console.error('usage: node tools/beta/report-fix.js <fix-reports.json> [--dry]');
  process.exit(1);
}

const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));

const renderComment = (r) => {
  const checks = (r.verification || [])
    .map((v) => `  - ${v.command} → ${v.result}${v.output ? ` (${String(v.output).slice(0, 200)})` : ''}`)
    .join('\n') || '  - none run';
  return `Fix cycle result: ${r.status.toUpperCase()}

ROOT CAUSE
${r.rootCause}

CHANGE
${r.change}

FILES
${(r.filesTouched || []).map((f) => `  - ${f}`).join('\n') || '  - none'}

COMMIT
${r.commit || 'none'}

VERIFICATION
${checks}

REGRESSION TEST
${r.regressionTest || 'none'}

RISK FOR REVIEW
${r.risk || 'not stated'}

RETEST STEPS FOR THE NEXT BETA RUN
${r.retestHint || 'not stated'}${r.needsMigration ? '\n\n⚠ NEEDS MIGRATION - a data migration is required and was deliberately NOT run.' : ''}`;
};

(async () => {
  for (const r of reports) {
    if (!r || !r.gid) { console.log('SKIP  report with no gid'); continue; }
    const line = `${r.ref} ${r.status}`;
    if (DRY) { console.log(`DRY   ${r.gid}  ${line}`); continue; }

    await api('POST', `/tasks/${r.gid}/stories`, { text: renderComment(r) });

    // Only a verified fix closes a ticket. Anything else stays open and visible.
    if (r.status === 'fixed' && r.commit) {
      await api('PUT', `/tasks/${r.gid}`, { completed: true });
      console.log(`DONE  ${r.gid}  ${line}`);
    } else if (r.status === 'invalid' || r.status === 'notReproduced') {
      const t = await api('GET', `/tasks/${r.gid}?opt_fields=name`);
      if (!/\[Needs re-verification\]/.test(t.name)) {
        await api('PUT', `/tasks/${r.gid}`, {
          name: t.name.replace(/^(D-\d+)\s*/, `$1 [Needs re-verification] `),
        });
      }
      console.log(`FLAG  ${r.gid}  ${line}`);
    } else {
      console.log(`OPEN  ${r.gid}  ${line}`);
    }
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
