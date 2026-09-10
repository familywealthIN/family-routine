/* eslint-disable no-console */
// Files a beta run's findings into Asana as an epic + one subtask per defect,
// in the same shape as the 16-22 Aug "Beta Test fixes" epic.
//
//   node tools/beta/file-findings.js <findings.json> [--label "5-11 Sep 2026"] [--dry]
//
// Dedupes against every still-open subtask of every prior beta epic, so a defect that
// survived the last cycle is commented on rather than filed twice.
const fs = require('fs');
const { api, IDS } = require('./asana');

const [, , findingsPath, ...rest] = process.argv;
const DRY = rest.includes('--dry');
const label = (() => {
  const i = rest.indexOf('--label');
  return i >= 0 ? rest[i + 1] : 'unlabelled run';
})();

if (!findingsPath) {
  console.error('usage: node tools/beta/file-findings.js <findings.json> [--label "..."] [--dry]');
  process.exit(1);
}

const run = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
const findings = run.findings || [];

// Titles are compared on their meaning, not their punctuation: severity prefix, the D-NN
// ref, case, curly quotes and runs of whitespace all get stripped before comparison.
const normalise = (s) => s
  .replace(/^D-\d+\s*/i, '')
  .replace(/^\[[^\]]+\]\s*/, '')
  .toLowerCase()
  .replace(/[‘’“”]/g, "'")
  .replace(/[^a-z0-9' ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const SEVERITY_ORDER = ['Blocker', 'Critical', 'Major', 'Minor', 'Cosmetic'];
const bySeverity = (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

function renderNotes(f, ref, reportUrl) {
  return `Area: ${f.area} · Found: day ${f.day} · Priority: ${f.priority || 'unset'}

REPRO
${f.preconditions ? `Preconditions: ${f.preconditions}\n` : ''}${f.steps}

EXPECTED
${f.expected}

ACTUAL
${f.actual}

EVIDENCE
${f.evidence}${f.screenshot ? `\nScreenshot: ${f.screenshot}` : ''}

DONE WHEN
${f.doneWhen || 'The Expected behaviour above holds, and any failure to achieve it surfaces to the user rather than failing silently.'}

---
Found in the seven-day beta simulation, ${label} (account grvpanchalus@gmail.com, live Atlas).${reportUrl ? `\nFull report: ${reportUrl}` : ''}`;
}

(async () => {
  // Collect every open ticket across all beta epics so we can dedupe against history.
  const epics = await api('GET', `/tasks?project=${IDS.project}&opt_fields=name,completed&limit=100`);
  const betaEpics = epics.filter((t) => /^Beta Test fixes/i.test(t.name));
  const seen = new Map();
  for (const e of betaEpics) {
    const subs = await api('GET', `/tasks/${e.gid}/subtasks?opt_fields=name,completed`);
    subs.forEach((s) => { if (!s.completed) seen.set(normalise(s.name), s); });
  }
  console.log(`${betaEpics.length} prior beta epic(s), ${seen.size} still-open ticket(s) to dedupe against.`);

  const fresh = [];
  const repeats = [];
  findings.slice().sort(bySeverity).forEach((f) => {
    const hit = seen.get(normalise(f.title));
    if (hit) repeats.push({ f, hit }); else fresh.push(f);
  });

  console.log(`${fresh.length} new, ${repeats.length} recurrence(s) of an already-open ticket.`);
  if (DRY) {
    fresh.forEach((f, i) => console.log(`  NEW  D-${String(i + 1).padStart(2, '0')} [${f.severity}] ${f.title}`));
    repeats.forEach((r) => console.log(`  RPT  ${r.hit.gid}  ${r.hit.name}`));
    return;
  }

  // A recurrence is evidence the fix did not hold - say so on the existing ticket.
  for (const { f, hit } of repeats) {
    await api('POST', `/tasks/${hit.gid}/stories`, {
      text: `Still reproducing in the ${label} run (day ${f.day}).\n\nActual: ${f.actual}\n\nEvidence: ${f.evidence}`,
    });
    console.log(`RPT   ${hit.gid}  ${hit.name}`);
  }
  if (!fresh.length) { console.log('\nNothing new to file.'); return; }

  const epic = await api('POST', '/tasks', {
    name: `Beta Test fixes — ${label}`,
    notes: `${run.summary || ''}\n\nRelease recommendation: ${run.releaseRecommendation || 'unstated'}\n\n${fresh.length} defect(s) filed from the seven-day beta simulation, ${label}.`,
    projects: [IDS.project],
    memberships: [{ project: IDS.project, section: IDS.sectionTodo }],
  });
  console.log(`\nEPIC  ${epic.gid}  ${epic.name}`);

  for (let i = 0; i < fresh.length; i += 1) {
    const f = fresh[i];
    const ref = `D-${String(i + 1).padStart(2, '0')}`;
    const t = await api('POST', `/tasks/${epic.gid}/subtasks`, {
      name: `${ref} [${f.severity}] ${f.title}`,
      notes: renderNotes(f, ref, run.reportUrl),
    });
    console.log(`OK    ${t.gid}  ${t.name}`);
  }
  console.log(`\nfiled ${fresh.length} under ${epic.gid}`);
  console.log(`https://app.asana.com/0/${IDS.project}/${epic.gid}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
