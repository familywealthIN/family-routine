/* eslint-env jest */
import {
  HOME_SNAPSHOT_KEY, MAX_DAYS, saveHomeDay, saveHomeXp, homeDay, homeTemplate, homeXp,
  clearHomeSnapshot, resetHomeSnapshotMemo, templateFrom,
} from '../homeSnapshot';
import { clearDayScopedLocalStorage } from '../newDay';

const ME = 'me@example.com';

const routine = (date, over = {}) => ({
  __typename: 'Routine',
  id: `doc-${date}`,
  date,
  skip: false,
  tasklist: [
    {
      __typename: 'RoutineItem',
      id: 'wake',
      name: 'Wake Up',
      time: '06:30',
      points: 15,
      ticked: true,
      passed: false,
      wait: false,
      redeemed: false,
      passedPoints: 0,
      stimuli: [{
        __typename: 'StimuliItem', name: 'D', splitRate: 15, earned: 15,
      }],
      ...over,
    },
  ],
});

const goals = [{
  __typename: 'Goal', id: 'g1', period: 'day', goalItems: [{ id: 'i1', body: 'Run' }],
}];

beforeEach(() => {
  localStorage.clear();
  resetHomeSnapshotMemo();
});

describe('homeSnapshot', () => {
  it('gives back what the server returned for a date, after a restart', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026') });
    saveHomeDay(ME, '11-11-2026', { goals });
    resetHomeSnapshotMemo(); // a new app start reads storage again

    const day = homeDay(ME, '11-11-2026');
    expect(day.routineDate).toEqual(routine('11-11-2026'));
    expect(day.goals).toEqual(goals);
  });

  it('keeps the other half of a day when only one half is saved', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026'), goals });
    saveHomeDay(ME, '11-11-2026', { goals: [] });
    expect(homeDay(ME, '11-11-2026').routineDate.id).toBe('doc-11-11-2026');
    expect(homeDay(ME, '11-11-2026').goals).toEqual([]);
  });

  it('never gives one account what another saved', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026'), goals });
    saveHomeXp(ME, { available: 40 });
    expect(homeDay('someone@else.com', '11-11-2026')).toBeNull();
    expect(homeTemplate('someone@else.com')).toEqual([]);
    expect(homeXp('someone@else.com')).toBeNull();
    expect(homeDay('', '11-11-2026')).toBeNull();
  });

  it('keeps only the most recent days', () => {
    const now = jest.spyOn(Date, 'now');
    for (let d = 1; d <= MAX_DAYS + 2; d += 1) {
      now.mockReturnValue(1000 + d);
      saveHomeDay(ME, `0${d}-11-2026`, { goals });
    }
    now.mockRestore();
    expect(homeDay(ME, '01-11-2026')).toBeNull();
    expect(homeDay(ME, '02-11-2026')).toBeNull();
    expect(homeDay(ME, `0${MAX_DAYS + 2}-11-2026`)).not.toBeNull();
  });

  it('takes the routine template from the latest day, with no day state in it', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026') });
    const [task] = homeTemplate(ME);
    expect(task).toMatchObject({
      id: 'wake', name: 'Wake Up', time: '06:30', points: 15,
    });
    ['ticked', 'passed', 'wait', 'redeemed', 'passedPoints', 'tickedAt'].forEach((field) => {
      expect(task).not.toHaveProperty(field);
    });
    expect(task.stimuli).toEqual([{
      __typename: 'StimuliItem', name: 'D', splitRate: 15, earned: 0,
    }]);
  });

  it('does not lose the template to a day with no routines', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026') });
    saveHomeDay(ME, '12-11-2026', { routineDate: { id: 'x', date: '12-11-2026', tasklist: [] } });
    expect(homeTemplate(ME).map((t) => t.id)).toEqual(['wake']);
  });

  it('survives the day rollover, which clears the other caches', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026'), goals });
    localStorage.setItem('agent-status-by-day', '{}');
    clearDayScopedLocalStorage();
    resetHomeSnapshotMemo();
    expect(localStorage.getItem('agent-status-by-day')).toBeNull();
    expect(homeDay(ME, '11-11-2026')).not.toBeNull();
  });

  it('is gone after sign-out', () => {
    saveHomeDay(ME, '11-11-2026', { routineDate: routine('11-11-2026'), goals });
    clearHomeSnapshot();
    expect(localStorage.getItem(HOME_SNAPSHOT_KEY)).toBeNull();
    expect(homeDay(ME, '11-11-2026')).toBeNull();
  });

  it('reads nothing from a corrupt or older record', () => {
    localStorage.setItem(HOME_SNAPSHOT_KEY, '{not json');
    expect(homeDay(ME, '11-11-2026')).toBeNull();
    resetHomeSnapshotMemo();
    localStorage.setItem(HOME_SNAPSHOT_KEY, JSON.stringify({ v: 0, email: ME, days: {} }));
    expect(homeTemplate(ME)).toEqual([]);
  });

  it('templateFrom is empty for nothing', () => {
    expect(templateFrom(null)).toEqual([]);
    expect(templateFrom({ tasklist: [{ name: 'no id' }] })).toEqual([]);
  });
});
