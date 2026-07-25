const { derivePriority, ensurePriorityTag } = require('./derivePriorityTag');

const TODAY = '15-06-2026';
const FUTURE = '20-06-2026';
const PAST = '10-06-2026';

describe('derivePriority (server fallback)', () => {
  it('defaults a today day-task to do', () => {
    expect(derivePriority({ period: 'day', date: TODAY, body: 'write notes', today: TODAY })).toBe('do');
  });

  it('marks a future day-task as plan', () => {
    expect(derivePriority({ period: 'day', date: FUTURE, today: TODAY })).toBe('plan');
  });

  it('marks any non-day period as plan', () => {
    expect(derivePriority({ period: 'week', date: TODAY, today: TODAY })).toBe('plan');
    expect(derivePriority({ period: 'month', date: TODAY, today: TODAY })).toBe('plan');
  });

  it('marks an @mentioned today task as delegate', () => {
    expect(derivePriority({ period: 'day', date: TODAY, body: 'brief @sam', today: TODAY })).toBe('delegate');
  });

  it('lets a future date win over an @mention (plan)', () => {
    expect(derivePriority({ period: 'day', date: FUTURE, body: 'hand to @sam', today: TODAY })).toBe('plan');
  });

  it('treats a past-dated task like today (do)', () => {
    expect(derivePriority({ period: 'day', date: PAST, body: 'log it', today: TODAY })).toBe('do');
  });

  it('never returns automate (client-only signal)', () => {
    expect(derivePriority({ period: 'day', date: TODAY, body: 'anything', today: TODAY })).not.toBe('automate');
  });
});

describe('ensurePriorityTag', () => {
  it('leaves a client-supplied priority tag untouched', () => {
    const tags = ['priority:automate', 'area:ops'];
    expect(ensurePriorityTag(tags, { period: 'day', date: FUTURE, today: TODAY })).toBe(tags);
  });

  it('appends a derived priority tag when none is present', () => {
    expect(ensurePriorityTag(['area:ops'], { period: 'day', date: FUTURE, today: TODAY }))
      .toEqual(['area:ops', 'priority:plan']);
  });

  it('adds an assignee tag for a derived delegate', () => {
    expect(ensurePriorityTag([], { period: 'day', date: TODAY, body: 'ping @nina', today: TODAY }))
      .toEqual(['priority:delegate', 'assignee:nina']);
  });

  it('tolerates a null/undefined tags argument', () => {
    expect(ensurePriorityTag(null, { period: 'day', date: TODAY, today: TODAY })).toEqual(['priority:do']);
    expect(ensurePriorityTag(undefined, { period: 'day', date: TODAY, today: TODAY })).toEqual(['priority:do']);
  });
});
