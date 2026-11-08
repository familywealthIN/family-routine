#!/usr/bin/env node
/**
 * Chat QA suite: every case in cases.js against the REAL model roster.
 *
 * Unit tests pin the code around the model (the add guard, the chips, the
 * week digest). Whether the prompt actually makes a model answer a question
 * instead of adding tasks can only be seen by asking one — so this asks, grades
 * each reply with checks.js, and writes a report.
 *
 *   node qa/chat/run.js                     every case once
 *   node qa/chat/run.js --runs 3            three times each (catches flaky prompts)
 *   node qa/chat/run.js --only week,add-one cases whose id or category contains one of these
 *   node qa/chat/run.js --min 0.9           exit 1 below a 90% pass rate
 *   node qa/chat/run.js --model a:free      only this free model (repeat the flag, or comma-separate,
 *                                           for a chain) — compare models before pinning
 *                                           OPENROUTER_FREE_MODELS in production
 *
 * Runs on the free OpenRouter roster (never paid). OPENROUTER_API_KEY comes
 * from the environment or the repo's root .env; it is never printed. Reports
 * land in qa/chat/reports/ (git-ignored).
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../../..');

function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return;
  const envFile = path.join(REPO, '.env');
  if (!fs.existsSync(envFile)) return;
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = /^OPENROUTER_API_KEY=(.*)$/.exec(line);
    if (match) process.env.OPENROUTER_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
  });
}

function parseArgs(argv) {
  const args = {
    runs: 1, only: [], min: 0, delay: 1500,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--runs') { args.runs = Math.max(1, Number(value) || 1); i += 1; }
    if (flag === '--only') { args.only = String(value || '').split(',').filter(Boolean); i += 1; }
    if (flag === '--min') { args.min = Number(value) || 0; i += 1; }
    if (flag === '--delay') { args.delay = Number(value) || 0; i += 1; }
    if (flag === '--model') {
      args.models = (args.models || []).concat(String(value || '').split(',').filter(Boolean));
      i += 1;
    }
  }
  return args;
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const oneLine = (text, max = 160) => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};
const cell = (text) => String(text || '').replace(/\|/g, '\\|');

async function runCase(chatWithRoutine, testCase) {
  const call = () => chatWithRoutine({
    text: testCase.text,
    history: testCase.history || [],
    context: testCase.context,
  });
  const started = Date.now();
  let result = await call();
  // One retry for an outage: free models rate-limit in bursts.
  if (result.error) {
    await sleep(15000);
    result = await call();
  }
  return { result, ms: Date.now() - started };
}

function writeReport(rows, args) {
  const dir = path.join(__dirname, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const graded = rows.filter((row) => !row.grade.infra);
  const passed = graded.filter((row) => !row.grade.failures.length);
  const byCategory = {};
  graded.forEach((row) => {
    const bucket = byCategory[row.category] || { pass: 0, total: 0 };
    bucket.total += 1;
    if (!row.grade.failures.length) bucket.pass += 1;
    byCategory[row.category] = bucket;
  });
  const models = [...new Set(rows.map((row) => row.result.model).filter(Boolean))];

  const md = [
    `# Chat QA: ${stamp.replace('T', ' ')}`,
    '',
    `**${passed.length} of ${graded.length} replies passed** (${graded.length ? Math.round((passed.length / graded.length) * 100) : 0}%)`
      + ` · ${rows.length - graded.length} lost to model outages · ${args.runs} run(s) per case`,
    '',
    `Models that answered: ${models.join(', ') || 'none'}`,
    '',
    '| Category | Passed |',
    '|---|---|',
    ...Object.entries(byCategory).map(([name, b]) => `| ${name} | ${b.pass}/${b.total} |`),
    '',
    '| Case | Run | Result | Intent | Reply | Problems |',
    '|---|---|---|---|---|---|',
    ...rows.map((row) => {
      let verdict = 'PASS';
      if (row.grade.infra) verdict = 'OUTAGE';
      else if (row.grade.failures.length) verdict = 'FAIL';
      const problems = [
        ...row.grade.failures.map((f) => `**${f.check}**: ${f.detail}`),
        ...row.grade.warnings.map((w) => `_${w.check}_: ${w.detail}`),
      ].join('<br>');
      return `| ${row.id} | ${row.run} | ${verdict} | ${row.result.intent || ''} | ${cell(oneLine(row.result.reply, 220))}`
        + `${row.result.tasks && row.result.tasks.length ? `<br>tasks: ${cell(row.result.tasks.join('; '))}` : ''}`
        + `${row.result.suggestions && row.result.suggestions.length ? `<br>chips: ${cell(row.result.suggestions.join(' · '))}` : ''}`
        + ` | ${cell(problems)} |`;
    }),
    '',
  ].join('\n');

  const mdPath = path.join(dir, `chat-qa-${stamp}.md`);
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(path.join(dir, `chat-qa-${stamp}.json`), JSON.stringify(rows.map((row) => ({
    id: row.id,
    category: row.category,
    run: row.run,
    text: row.text,
    ms: row.ms,
    result: row.result,
    grade: row.grade,
  })), null, 2));
  return {
    mdPath, passed: passed.length, graded: graded.length, outages: rows.length - graded.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadKey();
  // configuredFreeModels() drops anything without the :free suffix, so this
  // can never point the suite at a paid model.
  if (args.models && args.models.length) process.env.OPENROUTER_FREE_MODELS = args.models.join(',');
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set (environment or root .env).');
    process.exit(2);
  }
  // Required only now, so the key is in place before the module reads it.
  // eslint-disable-next-line global-require
  const { chatWithRoutine } = require('../../src/utils/chatApi');
  // eslint-disable-next-line global-require
  const { grade } = require('./checks');
  // eslint-disable-next-line global-require
  const cases = require('./cases').filter((c) => !args.only.length
    || args.only.some((needle) => c.id.includes(needle) || c.category.includes(needle)));

  const rows = [];
  for (let run = 1; run <= args.runs; run += 1) {
    for (let i = 0; i < cases.length; i += 1) {
      const testCase = cases[i];
      // eslint-disable-next-line no-await-in-loop
      const { result, ms } = await runCase(chatWithRoutine, testCase);
      const verdict = grade(testCase, result);
      let mark = 'PASS';
      if (verdict.infra) mark = 'OUTAGE';
      else if (verdict.failures.length) mark = 'FAIL';
      console.log(`${mark.padEnd(6)} ${testCase.id.padEnd(28)} [${result.intent}] ${oneLine(result.reply, 90)}`);
      verdict.failures.forEach((f) => console.log(`         ✗ ${f.check}: ${f.detail}`));
      rows.push({
        ...testCase, run, result, ms, grade: verdict,
      });
      // eslint-disable-next-line no-await-in-loop
      if (args.delay) await sleep(args.delay);
    }
  }

  const summary = writeReport(rows, args);
  const rate = summary.graded ? summary.passed / summary.graded : 0;
  console.log(`\n${summary.passed}/${summary.graded} passed (${Math.round(rate * 100)}%), ${summary.outages} outage(s)`);
  console.log(`Report: ${path.relative(REPO, summary.mdPath)}`);
  if (rate < args.min) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
