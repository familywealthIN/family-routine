/* eslint-env jest */
/**
 * Unit tests for taskPriority — the deterministic creation-context rule that
 * stamps every goal item with a priority:<bucket> tag.
 *
 * Rule: non-day period OR future date -> plan; else Start Agent -> automate;
 * else @mention -> delegate; else do. `today` is pinned so the tests don't
 * depend on the wall clock.
 */
const {
  derivePriority,
  extractAssignee,
  applyPriorityTags,
} = require('../taskPriority');

const TODAY = '15-06-2026';
const FUTURE = '20-06-2026';
const PAST = '10-06-2026';

describe('extractAssignee', () => {
  it('pulls the first @mention', () => {
    expect(extractAssignee('Ship the deck @sam by noon')).toBe('sam');
  });

  it('matches an @mention at the start of the body', () => {
    expect(extractAssignee('@jordan review the PR')).toBe('jordan');
  });

  it('allows dots and hyphens in the name', () => {
    expect(extractAssignee('sync with @mary-jane.doe')).toBe('mary-jane.doe');
  });

  it('returns null when there is no mention', () => {
    expect(extractAssignee('email the bank before 5pm')).toBeNull();
  });

  it('ignores a bare @ with no name', () => {
    expect(extractAssignee('rate is 5 @ per unit')).toBeNull();
  });

  it('handles empty / missing input', () => {
    expect(extractAssignee('')).toBeNull();
    expect(extractAssignee()).toBeNull();
  });
});

describe('derivePriority', () => {
  it('defaults a plain task created for today to do', () => {
    expect(derivePriority({ period: 'day', date: TODAY, body: 'write notes', today: TODAY }))
      .toBe('do');
  });

  it('marks a future-dated day task as plan', () => {
    expect(derivePriority({ period: 'day', date: FUTURE, body: 'write notes', today: TODAY }))
      .toBe('plan');
  });

  it('marks any non-day period as plan', () => {
    expect(derivePriority({ period: 'week', date: TODAY, today: TODAY })).toBe('plan');
    expect(derivePriority({ period: 'month', date: TODAY, today: TODAY })).toBe('plan');
    expect(derivePriority({ period: 'year', date: TODAY, today: TODAY })).toBe('plan');
    expect(derivePriority({ period: 'lifetime', date: TODAY, today: TODAY })).toBe('plan');
  });

  it('marks a Start Agent task for today as automate', () => {
    expect(derivePriority({ period: 'day', date: TODAY, explicitAgent: true, today: TODAY }))
      .toBe('automate');
  });

  it('marks an @mentioned task for today as delegate', () => {
    expect(derivePriority({ period: 'day', date: TODAY, body: 'design @lee', today: TODAY }))
      .toBe('delegate');
  });

  it('treats a past-dated day task like today (not future) — defaults to do', () => {
    expect(derivePriority({ period: 'day', date: PAST, body: 'log yesterday', today: TODAY }))
      .toBe('do');
  });

  describe('precedence', () => {
    it('future date beats Start Agent (plan wins)', () => {
      expect(derivePriority({
        period: 'day', date: FUTURE, explicitAgent: true, today: TODAY,
      })).toBe('plan');
    });

    it('future date beats an @mention (plan wins)', () => {
      expect(derivePriority({
        period: 'day', date: FUTURE, body: 'hand to @sam', today: TODAY,
      })).toBe('plan');
    });

    it('Start Agent beats an @mention for today (automate wins)', () => {
      expect(derivePriority({
        period: 'day', date: TODAY, explicitAgent: true, body: 'hand to @sam', today: TODAY,
      })).toBe('automate');
    });
  });
});

describe('applyPriorityTags', () => {
  it('appends the derived priority tag', () => {
    expect(applyPriorityTags([], { period: 'day', date: TODAY, today: TODAY }))
      .toEqual(['priority:do']);
  });

  it('preserves unrelated tags', () => {
    const result = applyPriorityTags(['area:health', 'urgency:high'], {
      period: 'day', date: FUTURE, today: TODAY,
    });
    expect(result).toEqual(['area:health', 'urgency:high', 'priority:plan']);
  });

  it('replaces an existing priority tag instead of duplicating it', () => {
    const result = applyPriorityTags(['priority:automate'], {
      period: 'day', date: TODAY, today: TODAY,
    });
    expect(result).toEqual(['priority:do']);
  });

  it('adds an assignee tag for delegate and strips any stale assignee', () => {
    const result = applyPriorityTags(['assignee:old', 'priority:do'], {
      period: 'day', date: TODAY, body: 'brief @nina', today: TODAY,
    });
    expect(result).toEqual(['priority:delegate', 'assignee:nina']);
  });

  it('does not add an assignee tag for non-delegate buckets', () => {
    const result = applyPriorityTags([], {
      period: 'day', date: TODAY, explicitAgent: true, body: 'ping @sam', today: TODAY,
    });
    // automate wins over the mention, so no assignee tag is written
    expect(result).toEqual(['priority:automate']);
  });

  it('tolerates a null tags argument', () => {
    expect(applyPriorityTags(null, { period: 'day', date: TODAY, today: TODAY }))
      .toEqual(['priority:do']);
  });
});
