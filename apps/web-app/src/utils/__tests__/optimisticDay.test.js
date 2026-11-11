/* eslint-env jest */
import moment from 'moment';
import { optimisticRoutine, withClockFlags } from '../optimisticDay';

const TODAY = '11-11-2026';
const at = (hhmm, date = TODAY) => moment(`${date} ${hhmm}`, 'DD-MM-YYYY HH:mm');

const template = [
  {
    id: 'wake', name: 'Wake Up', time: '06:30', points: 15, stimuli: [{ name: 'D', splitRate: 15, earned: 0 }],
  },
  {
    id: 'work', name: 'Start Work', time: '10:00', points: 10, stimuli: [{ name: 'D', splitRate: 10, earned: 0 }],
  },
  {
    id: 'gym', name: 'Gym', time: '18:00', points: 10, stimuli: [],
  },
];

describe('optimisticRoutine — a day nobody has read yet', () => {
  it('starts clean, like the server starts a new day', () => {
    const day = optimisticRoutine(template, TODAY, { now: at('05:00'), today: TODAY });
    expect(day.id).toBe('');
    expect(day.date).toBe(TODAY);
    day.tasklist.forEach((task) => {
      expect(task.ticked).toBe(false);
      expect(task.redeemed).toBe(false);
      expect(task.passedPoints).toBe(0);
      task.stimuli.forEach((st) => expect(st.earned).toBe(0));
    });
    expect(day.tasklist.map((t) => t.name)).toEqual(['Wake Up', 'Start Work', 'Gym']);
  });

  // The thresholds the pass/wait sweep uses: passed 30 minutes after the start,
  // open from 60 minutes before it.
  it('has today\'s routines passed, open or waiting by the clock', () => {
    const day = optimisticRoutine(template, TODAY, { now: at('09:30'), today: TODAY });
    const [wake, work, gym] = day.tasklist;
    expect(wake).toMatchObject({ passed: true, wait: false });
    expect(work).toMatchObject({ passed: false, wait: false });
    expect(gym).toMatchObject({ passed: false, wait: true });
  });

  it('has a future day all waiting, nothing passed', () => {
    const day = optimisticRoutine(template, '12-11-2026', { now: at('22:00'), today: TODAY });
    day.tasklist.forEach((task) => expect(task).toMatchObject({ passed: false, wait: true }));
  });

  it('never guesses a past day: that would claim nothing was done', () => {
    expect(optimisticRoutine(template, '10-11-2026', { now: at('09:00'), today: TODAY })).toBeNull();
  });

  it('is nothing without a template', () => {
    expect(optimisticRoutine([], TODAY, { now: at('09:00'), today: TODAY })).toBeNull();
    expect(optimisticRoutine(null, TODAY, { now: at('09:00'), today: TODAY })).toBeNull();
  });

  it('does not touch the template it was given', () => {
    const copy = JSON.parse(JSON.stringify(template));
    optimisticRoutine(template, TODAY, { now: at('09:30'), today: TODAY });
    expect(template).toEqual(copy);
  });
});

describe('withClockFlags — the day as last read, brought up to the clock', () => {
  const read = {
    id: 'doc',
    date: TODAY,
    tasklist: [
      {
        id: 'wake', time: '06:30', ticked: true, passed: false, wait: false,
      },
      {
        id: 'work', time: '10:00', ticked: false, passed: false, wait: true,
      },
      {
        id: 'lunch', time: '13:00', ticked: false, passed: true, wait: false,
      },
      {
        id: 'gym', time: '18:00', ticked: false, passed: false, wait: true,
      },
    ],
  };

  it('moves passed and wait forward as the sweep would', () => {
    const day = withClockFlags(read, TODAY, at('10:45'));
    const byId = Object.fromEntries(day.tasklist.map((t) => [t.id, t]));
    expect(byId.work).toMatchObject({ passed: true, wait: false });
    expect(byId.gym).toMatchObject({ passed: false, wait: true });
  });

  it('leaves a ticked routine exactly as it was, and never un-passes one', () => {
    const day = withClockFlags(read, TODAY, at('07:00'));
    const byId = Object.fromEntries(day.tasklist.map((t) => [t.id, t]));
    expect(byId.wake).toBe(read.tasklist[0]);
    expect(byId.lunch.passed).toBe(true);
  });

  it('keeps the document id: the day was really read', () => {
    expect(withClockFlags(read, TODAY, at('10:45')).id).toBe('doc');
  });
});
