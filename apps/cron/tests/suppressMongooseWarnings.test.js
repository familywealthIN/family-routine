/**
 * Every cron script that connects to Mongo suppresses DEP0170.
 *
 * Node 20 prints the SRV-expanded URL — credentials included — into the cron
 * log unless process.emitWarning is filtered before mongoose loads, so the
 * suppression call has to come first in each entry point. The invariant is
 * checked by source scan (the scripts themselves connect, so they can't be
 * required here) plus a unit test of the filter itself.
 */
const fs = require('fs');
const path = require('path');

const suppressMongooseWarnings = require('../src/utils/suppressMongooseWarnings');

const SRC = path.resolve(__dirname, '../src');

// A real SRV expansion, as the driver hands it to process.emitWarning.
const DEP0170 = 'The URL mongodb+srv://user:password@cluster0-shard-00-00.abcde.mongodb.net:27017/routine is invalid. Future versions of Node.js will throw an error.';

const jsFilesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return jsFilesUnder(full);
  return entry.name.endsWith('.js') ? [full] : [];
});

const rel = (file) => path.relative(SRC, file).replace(/\\/g, '/');

describe('cron scripts that connect to Mongo', () => {
  const connecting = jsFilesUnder(SRC)
    .map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }))
    .filter(({ text }) => /^(?!\s*(\/\/|\*)).*mongoose\.connect\(/m.test(text));

  it('finds the connecting scripts to check', () => {
    expect(connecting.length).toBeGreaterThan(5);
  });

  it('calls suppressMongooseWarnings before requiring mongoose', () => {
    const exposed = connecting.filter(({ text }) => {
      const suppressAt = text.search(/require\('[./]*utils\/suppressMongooseWarnings'\)\(\)/);
      const mongooseAt = text.search(/require\('mongoose'\)/);
      return suppressAt === -1 || (mongooseAt !== -1 && suppressAt > mongooseAt);
    }).map(({ file }) => rel(file));
    expect(exposed).toEqual([]);
  });
});

describe('suppressMongooseWarnings', () => {
  let original;
  let seen;

  beforeEach(() => {
    original = process.emitWarning;
    seen = [];
    process.emitWarning = (warning) => seen.push(warning);
    suppressMongooseWarnings();
  });

  afterEach(() => {
    process.emitWarning = original;
  });

  it('keeps the SRV-expanded URL out of the log', () => {
    process.emitWarning(DEP0170, 'DeprecationWarning', 'DEP0170');
    expect(seen).toEqual([]);
  });

  it('swallows the Mongoose 5 circular-dependency warning', () => {
    process.emitWarning("Accessing non-existent property 'count' of module exports inside circular dependency");
    expect(seen).toEqual([]);
  });

  it('still emits unrelated warnings', () => {
    process.emitWarning('something worth reading');
    process.emitWarning(new Error('also worth reading'));
    expect(seen.map((warning) => warning.message || warning))
      .toEqual(['something worth reading', 'also worth reading']);
  });
});
