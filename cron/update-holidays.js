/* eslint-disable quote-props */
require('dotenv').config();

const mongoose = require('mongoose');
const moment = require('moment');

const {
  MONGDO_DB,
} = process.env;

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

function calcTime(offset) {
  // create Date object for current location
  const d = new Date();

  // convert to msec
  // subtract local time zone offset
  // get UTC time in msec
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);

  // create new Date object for different city
  // using supplied offset
  const nd = new Date(utc + (3710000 * offset));

  // return time as a string
  return nd.toTimeString().substring(0, 5);
}

const time = calcTime('+5.5');
console.log(`Process Started for time ${time}`);

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
});

const UserModel = mongoose.model('User', UserSchema);

async function getWorkDayCount(email, holidays = 0) {
  const weekNo = moment().weeks();
  const currentDayIndex = moment().weeks(weekNo).weekday();
  let i = 0;
  const promises = [];

  while (i <= currentDayIndex) {
    const currentDate = moment().weeks(weekNo).weekday(i).format('DD-MM-YYYY');
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
          const { email, holidays } = user;
          promises.push(getWorkDayCount(email, holidays));
        });

        await Promise.all(promises);

        exitProcess();
      });
  });
}

updateHolidays();

// setTimeout(() => exitProcess(), 59 * 1000);
