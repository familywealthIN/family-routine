// Hourly Lambda (serverless.yml `missedDaysEmail`): email people who have
// missed three days of their routines. See src/jobs/missedDays.js.
require('./src/utils/suppressMongooseWarnings')();
const mongoose = require('mongoose');
const { SESv2Client } = require('@aws-sdk/client-sesv2');
const connectDatabase = require('./src/db');
const { runMissedDaysEmail, sesSender } = require('./src/jobs/missedDaysEmail');

const client = new SESv2Client({ region: process.env.SES_REGION || process.env.AWS_REGION });

module.exports.handler = async () => {
  await connectDatabase();
  const { checked, planned, sent, failed } = await runMissedDaysEmail({
    db: mongoose.connection.db,
    send: sesSender({ client }),
  });
  console.log(`missed-days email: ${checked} users checked, ${planned.length} due, ${sent} sent, ${failed} failed`);
  return { checked, due: planned.length, sent, failed };
};
