const { validateRedeem } = require('../src/utils/xpLedger');

// 2026-07-04T10:00:00Z = 15:30 IST -> local date 04-07-2026 in Asia/Kolkata.
const NOW = new Date('2026-07-04T10:00:00Z');
const TODAY = '04-07-2026';
const YESTERDAY = '03-07-2026';

const user = { timezone: 'Asia/Kolkata' };

function makeTask(overrides = {}) {
  return {
    _id: 't1',
    points: 25,
    passedPoints: 40,
    ticked: false,
    passed: true,
    redeemed: false,
    ...overrides,
  };
}

function makeRoutine(date = TODAY, task = makeTask()) {
  return { date, tasklist: [task] };
}

function run(overrides = {}) {
  return validateRedeem({
    user,
    routine: makeRoutine(),
    taskId: 't1',
    clientDate: TODAY,
    now: NOW,
    available: 100,
    entitled: false,
    ...overrides,
  });
}

describe('validateRedeem', () => {
  it('accepts a passed, unticked task on today with sufficient balance', () => {
    const verdict = run();
    expect(verdict.ok).toBe(true);
    expect(verdict.cost).toBe(40); // frozen passedPoints, not live points
  });

  it('falls back to live points when no passedPoints snapshot exists (pre-deploy passes)', () => {
    const verdict = run({ routine: makeRoutine(TODAY, makeTask({ passedPoints: undefined })) });
    expect(verdict.ok).toBe(true);
    expect(verdict.cost).toBe(25);
  });

  it('rejects a missing routine', () => {
    expect(run({ routine: null })).toMatchObject({ ok: false, code: 404 });
  });

  it('rejects when the routine doc is for a different date than claimed', () => {
    expect(run({ routine: makeRoutine(YESTERDAY) })).toMatchObject({ ok: false, code: 400 });
  });

  it('rejects dates outside the ±1 day window in the user timezone', () => {
    const staleDate = '01-07-2026';
    const verdict = run({ clientDate: staleDate, routine: makeRoutine(staleDate) });
    expect(verdict).toMatchObject({ ok: false, code: 400 });
    expect(verdict.message).toContain('today');
  });

  it('accepts ±1 day skew (client just past midnight vs server)', () => {
    // 05-07-2026 claimed while server-now in IST is still 04-07-2026.
    const skewed = '05-07-2026';
    expect(run({ clientDate: skewed, routine: makeRoutine(skewed) }).ok).toBe(true);
    expect(run({ clientDate: YESTERDAY, routine: makeRoutine(YESTERDAY) }).ok).toBe(true);
  });

  it('rejects an unknown task id', () => {
    expect(run({ taskId: 'missing' })).toMatchObject({ ok: false, code: 404 });
  });

  it('rejects a task that has not passed yet', () => {
    const verdict = run({ routine: makeRoutine(TODAY, makeTask({ passed: false })) });
    expect(verdict).toMatchObject({ ok: false, code: 400 });
  });

  it('rejects an already ticked or already redeemed task', () => {
    expect(run({ routine: makeRoutine(TODAY, makeTask({ ticked: true })) }))
      .toMatchObject({ ok: false, code: 409 });
    expect(run({ routine: makeRoutine(TODAY, makeTask({ ticked: true, redeemed: true })) }))
      .toMatchObject({ ok: false, code: 409 });
  });

  it('rejects with 402 when the balance cannot cover the frozen cost', () => {
    const verdict = run({ available: 39 });
    expect(verdict).toMatchObject({ ok: false, code: 402 });
    expect(verdict.message).toContain('402');
  });

  it('lets an active subscription bypass the balance check', () => {
    const verdict = run({ available: 0, entitled: true });
    expect(verdict.ok).toBe(true);
    expect(verdict.cost).toBe(40);
  });
});
