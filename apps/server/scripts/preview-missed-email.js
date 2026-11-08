/**
 * Dry run of the missed-days email: prints who would get it and what it says,
 * without logging or sending anything (no SES client is even created).
 *
 *   node scripts/preview-missed-email.js [<email>] [--date DD-MM-YYYY] [--at HH:MM] [--ignore-sent] [--body]
 *
 * Without an email it plans for everyone and prints one line each. --date and
 * --at plan as if it were that local day and time (default: now), so the
 * 10:00–13:00 window can be checked at any hour. --body prints the text.
 */
require('dotenv').config();
require('../src/utils/suppressMongooseWarnings')();
const mongoose = require('mongoose');
const { runMissedDaysEmail } = require('../src/jobs/missedDaysEmail');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const VALUED = ['--date', '--at'];
const email = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const date = flag('--date');
const at = flag('--at');
if ((date !== undefined && !/^\d{2}-\d{2}-\d{4}$/.test(date)) || (at !== undefined && !/^\d{2}:\d{2}$/.test(at))) {
  console.error('usage: node scripts/preview-missed-email.js [<email>] [--date DD-MM-YYYY] [--at HH:MM] [--ignore-sent] [--body]');
  process.exit(2);
}
const nowMinute = at && Number(at.slice(0, 2)) * 60 + Number(at.slice(3));

mongoose.connect(process.env.MONGDO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => runMissedDaysEmail({
    db: mongoose.connection.db,
    dryRun: true,
    email,
    today: date,
    nowMinute,
    ignoreSent: args.includes('--ignore-sent'),
  }))
  .then(({ checked, planned }) => {
    console.log(`${checked} users checked, ${planned.length} would get the email`);
    planned.forEach((p) => {
      console.log(`- ${p.email} [${p.timezone} ${p.today}] missed ${p.missed} since ${p.lastTick}: ${p.subject}`);
      if (args.includes('--body')) console.log(`\n${p.text}\n`);
    });
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
