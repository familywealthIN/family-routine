/* eslint-env jest */
const { agentStatusKey, ranToday, agentTotals } = require('./agents');

describe('agent status is only about today\'s trigger', () => {
  const NOW = new Date(2026, 9, 5, 10, 0, 0);
  const today = new Date(2026, 9, 5, 8, 30, 0);
  const yesterday = new Date(2026, 9, 4, 23, 50, 0);

  it('reads ms-epoch strings, ISO strings and Dates', () => {
    expect(ranToday({ lastRunAt: String(today.getTime()) }, NOW)).toBe(true);
    expect(ranToday({ lastRunAt: today.toISOString() }, NOW)).toBe(true);
    expect(ranToday({ lastRunAt: today }, NOW)).toBe(true);
    expect(ranToday({ lastRunAt: String(yesterday.getTime()) }, NOW)).toBe(false);
    expect(ranToday({}, NOW)).toBe(false);
  });

  it('keeps today\'s status', () => {
    expect(agentStatusKey({ executionStatus: 'listening', lastRunAt: String(today.getTime()) }, NOW))
      .toBe('listening');
  });

  it('resets yesterday\'s status to idle', () => {
    ['running', 'listening', 'finished', 'failed'].forEach((status) => {
      expect(agentStatusKey({ executionStatus: status, lastRunAt: String(yesterday.getTime()) }, NOW))
        .toBe('idle');
    });
  });

  it('counts only today\'s live runs', () => {
    const agents = [
      { executionStatus: 'listening', lastRunAt: String(today.getTime()) },
      { executionStatus: 'listening', lastRunAt: String(yesterday.getTime()) },
    ];
    expect(agentTotals(agents, NOW).live).toBe(1);
  });
});
