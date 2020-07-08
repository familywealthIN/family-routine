import moment from 'moment';

export default function getDates() {
  return moment().format('DD-MM-YYYY');
}

export function getDatesOfYear(beginDate) {
  let dateStart = moment();
  if (beginDate) {
    dateStart = moment(beginDate, 'DD-MM-YYYY');
  }
  const timeTillEndOfYear = moment().endOf('year');
  const remainingDaysOfYear = timeTillEndOfYear.diff(dateStart, 'days');
  const days = [];
  const dateEnd = moment().add(remainingDaysOfYear, 'days');
  while (dateEnd.diff(dateStart, 'days') >= 0) {
    days.push({
      label: dateStart.format('DD-MM-YYYY'),
      value: dateStart.format('DD-MM-YYYY'),
    });
    dateStart.add(1, 'days');
  }
  return days;
}

export function getWeeksOfYear() {
  const currentWeek = moment().week();
  const weeks = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentWeek; i <= 52; i++) {
    weeks.push({
      label: `Week ${i} (${moment().weeks(i).weekday(1).format('DD-MM-YYYY')})`,
      value: moment().weeks(i).weekday(5).format('DD-MM-YYYY'),
    });
  }
  return weeks;
}

export function getMonthsOfYear() {
  const currentMonth = moment().month();
  const currentYear = moment().year();
  const months = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentMonth; i < 12; i++) {
    months.push({
      label: moment([currentYear, i]).format('MMMM'),
      value: moment([currentYear, i]).endOf('month').format('DD-MM-YYYY'),
    });
  }
  return months;
}

export function getYearsOfLife() {
  const currentYear = moment().year();
  const avgAge = moment().year() + 70;
  const years = [];
  // eslint-disable-next-line no-plusplus
  for (let i = currentYear; i < avgAge; i++) {
    years.push({
      label: `${i}`,
      value: moment([i]).endOf('year').format('DD-MM-YYYY'),
    });
  }
  return years;
}

export function stepupMilestonePeriodDate(period, date) {
  if (period === 'day') {
    const weekNo = moment(date, 'DD-MM-YYYY').weeks();
    return {
      period: 'week',
      date: moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY'),
    };
  }
  if (period === 'week') {
    return {
      period: 'month',
      date: moment(date, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY'),
    };
  }
  if (period === 'month') {
    return {
      period: 'year',
      date: moment(date, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY'),
    };
  }
  if (period === 'year') {
    return {
      period: 'lifetime',
      date: '01-01-1970',
    };
  }
  const weekNo = moment(date, 'DD-MM-YYYY').weeks();
  return {
    period: 'week',
    date: moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY'),
  };
}
