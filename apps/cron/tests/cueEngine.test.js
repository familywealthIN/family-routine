const {
  cueTiming, itemHistory, dueCues, batchCues, candidateSetTimes, rewardLine,
  historyDates, toMinutes, fromMinutes, cueCopy, twoMinuteAsk, firstStep,
} = require('../src/cue/cueEngine');

const TZ = 'Asia/Kolkata'; // UTC+5:30, no DST
const TODAY = '08-10-2026';
// 08-10-2026 at HH:mm IST as an instant.
const at = (hhmm, date = TODAY) => {
  const [dd, mm, yyyy] = date.split('-');
  return new Date(`${yyyy}-${mm}-${dd}T${hhmm}:00+05:30`);
};

const ITEM = {
  _id: 'run', name: 'Run', time: '07:00', points: 10, steps: [{ name: 'Put on shoes' }],
};
const BRUSH = {
  _id: 'brush', name: 'Brush teeth', time: '06:30', points: 5,
};

/** Day docs for the `n` days before today, the item ticked at `tickTime`. */
function doneDays(n, tickTime, extra = {}) {
  return historyDates(TODAY).slice(1, n + 1).map((date) => ({
    date,
    tasklist: [{
      _id: 'run', ticked: true, tickedAt: tickTime ? at(tickTime, date) : undefined, ...extra,
    }],
  }));
}

describe('time helpers', () => {
  it('round-trips HH:mm', () => {
    expect(toMinutes('07:05')).toBe(425);
    expect(fromMinutes(425)).toBe('07:05');
    expect(toMinutes('bad')).toBeNull();
  });

  it('candidate set-times cover every set time whose cue can land now', () => {
    const now = toMinutes('08:00');
    const times = candidateSetTimes(now);
    expect(times[0]).toBe('07:00'); // atRisk reaches set + 60
    expect(times[times.length - 1]).toBe('08:30'); // learned reaches set - 30
  });
});

describe('itemHistory', () => {
  it('learns the usual time from tick timestamps once there are enough', () => {
    const h = itemHistory({
      itemId: 'run', routines: doneDays(5, '07:20'), today: TODAY, timezone: TZ,
    });
    expect(h.usual).toBe(toMinutes('07:20'));
    expect(h.streak).toBe(5);
    expect(h.missedYesterday).toBe(false);
  });

  it('learns only from ticks in the window, not late check-ins', () => {
    const routines = [
      ...doneDays(3, '07:20'),
      ...doneDays(5, '21:40', { redeemed: true }).slice(3),
    ];
    const h = itemHistory({
      itemId: 'run', routines, today: TODAY, timezone: TZ,
    });
    expect(h.samples).toBe(3);
    expect(h.usual).toBe(toMinutes('07:20'));
    expect(h.streak).toBe(5); // a late check-in still keeps the run
  });

  it('does not trust fewer than three samples', () => {
    const h = itemHistory({
      itemId: 'run', routines: doneDays(2, '07:20'), today: TODAY, timezone: TZ,
    });
    expect(h.usual).toBeNull();
  });

  it('skipped days neither add to nor break the run', () => {
    const routines = doneDays(4, '07:00');
    routines[1].skip = true;
    const h = itemHistory({
      itemId: 'run', routines, today: TODAY, timezone: TZ,
    });
    expect(h.streak).toBe(3);
  });

  it('flags a single miss (never miss twice) separately from two', () => {
    const routines = doneDays(5, '07:00');
    routines[0].tasklist[0].ticked = false;
    const once = itemHistory({
      itemId: 'run', routines, today: TODAY, timezone: TZ,
    });
    expect(once).toMatchObject({ missedYesterday: true, missedTwice: false, streak: 0 });

    routines[1].tasklist[0].ticked = false;
    const twice = itemHistory({
      itemId: 'run', routines, today: TODAY, timezone: TZ,
    });
    expect(twice.missedTwice).toBe(true);
  });
});

describe('cueTiming', () => {
  const set = toMinutes('07:00');

  it('falls back to the set time with no learned time', () => {
    expect(cueTiming(set, { usual: null })).toEqual({ minute: set, mode: 'set' });
  });

  it('fires a few minutes before the usual time', () => {
    expect(cueTiming(set, { usual: toMinutes('07:20'), streak: 3, spread: 5 }))
      .toEqual({ minute: toMinutes('07:15'), mode: 'learned' });
  });

  it('never drifts more than the allowed shift from the set time', () => {
    expect(cueTiming(set, { usual: toMinutes('11:00'), streak: 3, spread: 5 }).minute)
      .toBe(toMinutes('07:45'));
    expect(cueTiming(set, { usual: toMinutes('05:00'), streak: 3, spread: 5 }).minute)
      .toBe(toMinutes('06:30'));
  });

  it('an automatic habit only gets a late at-risk nudge', () => {
    expect(cueTiming(set, { usual: toMinutes('07:05'), streak: 30, spread: 4 }))
      .toEqual({ minute: toMinutes('07:25'), mode: 'atRisk' });
  });
});

describe('rewardLine', () => {
  it('names the reward at stake and the next milestone', () => {
    expect(rewardLine({ points: 10, streak: 4 })).toBe('+10 pts · day 5 🔥 milestone');
    expect(rewardLine({ points: 10, streak: 5 })).toBe('+10 pts · day 6 🔥 · 1 more day to 7');
    expect(rewardLine({ points: 0, streak: 0 })).toBe('day 1 of a new run');
  });
});

describe('dueCues', () => {
  const base = {
    timezone: TZ, today: TODAY, items: [BRUSH, ITEM], identity: null,
  };

  it('a new user is cued at the set time with the two-minute ask', () => {
    const cues = dueCues({ ...base, now: at('07:00'), routines: [] });
    expect(cues).toHaveLength(1);
    expect(cues[0].item._id).toBe('run');
    expect(`${cues[0].title} ${cues[0].body}`).toMatch('Put on shoes');
    expect(`${cues[0].title} ${cues[0].body}`).not.toMatch(/fresh start|never miss/i);
  });

  it('moves the cue to the learned time', () => {
    const routines = doneDays(5, '07:20');
    expect(dueCues({ ...base, now: at('07:00'), routines })).toHaveLength(0);
    const cues = dueCues({ ...base, now: at('07:15'), routines });
    expect(cues).toHaveLength(1);
    expect(cues[0].body).toMatch('day 6');
  });

  it('is silent when already ticked, skipped, or not on today\'s list', () => {
    const ticked = [{ date: TODAY, tasklist: [{ _id: 'run', ticked: true }] }];
    expect(dueCues({ ...base, now: at('07:00'), routines: ticked })).toHaveLength(0);
    const skipped = [{ date: TODAY, skip: true, tasklist: [{ _id: 'run' }] }];
    expect(dueCues({ ...base, now: at('07:00'), routines: skipped })).toHaveLength(0);
    const off = [{ date: TODAY, tasklist: [{ _id: 'brush' }] }];
    expect(dueCues({ ...base, now: at('07:00'), routines: off })).toHaveLength(0);
  });

  it('stacks on the previous habit when it is done today', () => {
    const routines = [{ date: TODAY, tasklist: [{ _id: 'brush', ticked: true }, { _id: 'run' }] }];
    const [cue] = dueCues({ ...base, now: at('07:00'), routines });
    expect(cue.kind).toBe('stack');
    expect(cue.title).toBe('Brush teeth ✓ → Run');
  });

  it('uses never-miss-twice copy after one miss', () => {
    const routines = doneDays(5, null);
    routines[0].tasklist[0].ticked = false;
    const [cue] = dueCues({ ...base, now: at('07:00'), routines });
    expect(cue.kind).toBe('recovery');
    expect(cue.body).not.toMatch(/fail/i);
  });
});

describe('template cues lead with the first step', () => {
  const WAKE = {
    _id: 'wake', name: 'Wake Up', time: '06:00', points: 5, steps: [{ name: 'Feet on the floor' }],
  };
  const fresh = {
    streak: 0, missedYesterday: false, missedTwice: false, everDone: false, usual: null,
  };
  const copy = (item, history = fresh, extra = {}) => cueCopy({
    item, history, timing: { mode: 'set' }, anchor: null, identity: null, today: TODAY, ...extra,
  });
  // Every variant a day can pick: the pick hashes the item id and the day.
  const everyDay = (item, extra) => historyDates(TODAY, 20).map((today) => copy(item, fresh, { ...extra, today }));

  it('the ask is the first step, else two minutes', () => {
    expect(firstStep(WAKE)).toBe('Feet on the floor');
    expect(firstStep(BRUSH)).toBeNull();
    expect(firstStep({ steps: [{ name: '  ' }, { name: 'Second' }] })).toBe('Second');
    expect(twoMinuteAsk(WAKE)).toBe('Feet on the floor — that\'s the whole start.');
    expect(twoMinuteAsk(BRUSH)).toBe('Two minutes counts.');
  });

  it('every everyday variant names the step, and the body leads with it unless the title does', () => {
    const variants = everyDay(WAKE, { identity: 'an early riser' });
    expect(new Set(variants.map((v) => v.kind))).toEqual(new Set(['reward', 'twoMinute', 'identity']));
    variants.forEach((v) => {
      if (v.kind === 'twoMinute') expect(v.title).toBe('Wake Up: Feet on the floor — that\'s the whole start.');
      else expect(v.body.startsWith('Feet on the floor — that\'s the whole start.')).toBe(true);
    });
  });

  it('keeps every kind, each leading with the step', () => {
    const recovery = copy(WAKE, { ...fresh, missedYesterday: true, everDone: true });
    expect(recovery.kind).toBe('recovery');
    expect(recovery.body).toBe('Feet on the floor — that\'s the whole start. Yesterday slipped; today is the one that counts. +5 pts · day 1 of a new run');
    const restart = copy(WAKE, {
      ...fresh, missedYesterday: true, missedTwice: true, everDone: true,
    });
    expect(restart).toMatchObject({ kind: 'restart', body: expect.stringMatching(/^Feet on the floor — .*Small beats perfect\./) });
    const atRisk = cueCopy({
      item: WAKE, history: { ...fresh, streak: 30, usual: toMinutes('06:05') }, timing: { mode: 'atRisk' }, today: TODAY,
    });
    expect(atRisk).toMatchObject({ kind: 'atRisk', body: expect.stringMatching(/^Feet on the floor — .*Later than your usual 06:05\./) });
    const stack = copy(WAKE, fresh, { anchor: 'Brush teeth' });
    expect(stack).toMatchObject({ kind: 'stack', body: expect.stringMatching(/^Feet on the floor — that's the whole start\./) });
  });

  it('without steps, the copy is as before', () => {
    const recovery = copy(BRUSH, { ...fresh, missedYesterday: true, everDone: true });
    expect(recovery.body).toBe('Yesterday slipped; today is the one that counts. Two minutes counts. +5 pts · day 1 of a new run');
    everyDay(BRUSH).forEach((v) => {
      if (v.kind === 'reward') expect(v.body).toBe('+5 pts · day 1 of a new run. Two minutes counts.');
      if (v.kind === 'twoMinute') expect(v.title).toBe('Brush teeth: Two minutes counts.');
    });
  });

  it('keeps the title limit: a long step stays in the title, the rest moves to the body', () => {
    const long = { ...WAKE, name: 'Evening wind-down routine', steps: [{ name: 'Put the phone on the charger in the hall' }] };
    const two = everyDay(long).find((v) => v.kind === 'twoMinute');
    expect(two.title).toBe('Evening wind-down routine: Put the phone on the charger in the hall');
    expect(two.body).toMatch(/^That's the whole start\./);
    const cues = dueCues({
      now: at('06:00'), timezone: TZ, today: TODAY, items: [long], routines: [], identity: null,
    });
    expect(cues[0].title.length).toBeLessThanOrEqual(60);
    expect(firstStep({ steps: [{ name: 'x'.repeat(80) }] })).toHaveLength(50);
  });

  it('an alarm keeps its fixed title and names the step in the body', () => {
    const alarm = { ...WAKE, notifyMode: 'alarm' };
    const [ring] = dueCues({
      now: at('06:00'), timezone: TZ, today: TODAY, items: [alarm], routines: [], identity: null,
    });
    expect(ring.title).toBe('⏰ Wake Up · 06:00');
    expect(ring.body).toBe('Feet on the floor — that\'s the whole start. +5 pts · day 1 of a new run');
    const [again] = dueCues({
      now: at('06:05'), timezone: TZ, today: TODAY, items: [alarm], routines: [], identity: null,
    });
    expect(again.body).toMatch(/^Still on\. Feet on the floor/);
  });

  it('a batch starts with the first routine\'s step', () => {
    const batched = batchCues([{ item: WAKE, title: 'a', body: 'b' }, { item: BRUSH, title: 'c', body: 'd' }]);
    expect(batched[0].body).toBe('Wake Up · Brush teeth. Start with the first: Feet on the floor.');
  });
});

describe('batchCues', () => {
  it('merges cues landing in the same minute into one notification', () => {
    const one = { item: ITEM, title: 'a', body: 'b' };
    expect(batchCues([one])).toEqual([one]);
    const batched = batchCues([one, { item: BRUSH, title: 'c', body: 'd' }]);
    expect(batched).toHaveLength(1);
    expect(batched[0].title).toBe('2 routines are up');
    expect(batched[0].body).toMatch('Run · Brush teeth');
  });
});
