/* eslint-disable quote-props */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const moment = require('moment');
const { getLocalDate } = require('./utils/timezone');

const {
  MONGDO_DB,
} = process.env;

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: update-holidays (per-user timezone)');

mongoose.connect(MONGDO_DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
mongoose.Promise = global.Promise;
const db = mongoose.connection;

const RoutineSchema = new mongoose.Schema({
  date: String,
  email: String,
  skip: Boolean,
});
const RoutineModel = mongoose.model('routine', RoutineSchema);

const UserSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  picture: String,
  groupId: String,
  inviterEmail: String,
  notificationId: String,
  holidays: Number,
  timezone: String,
});

const UserModel = mongoose.model('User', UserSchema);

async function getWorkDayCount(email, holidays = 0, timezone) {
  const localDate = getLocalDate(timezone);
  const anchor = moment(localDate, 'DD-MM-YYYY');
  const currentDayIndex = anchor.weekday();
  let i = 0;
  const promises = [];

  while (i <= currentDayIndex) {
    const currentDate = anchor.clone().weekday(i).format('DD-MM-YYYY');
    promises.push(RoutineModel.findOne({ date: currentDate, email }).exec());
    i += 1;
  }
  const selectedRoutines = await Promise.all(promises);

  const workDayCount = selectedRoutines.reduce((acc, selectedItem) => {
    if (selectedItem && selectedItem.skip !== true) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const additionalHolidays = workDayCount - 5;

  if (additionalHolidays > 0) {
    let newHolidaysEntry = holidays;
    newHolidaysEntry += additionalHolidays;

    UserModel
      .findOneAndUpdate(
        { email },
        { holidays: newHolidaysEntry },
        { new: true },
      ).exec();
  }

  return workDayCount;
}

async function updateHolidays() {
  db.once('open', () => {
    db.collection('users')
      .find({}).toArray(async (err, users) => {
        const promises = [];

        users.forEach((user) => {
          const { email, holidays, timezone } = user;
          promises.push(getWorkDayCount(email, holidays, timezone));
        });

        await Promise.all(promises);

        exitProcess();
      });
  });
}

updateHolidays();

// setTimeout(() => exitProcess(), 59 * 1000);
