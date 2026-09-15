/* eslint-env jest */
/**
 * Unit tests for the status chip's config resolution.
 *
 * D-03: the chip's own fallback rendered a grey "Unknown" for any status it had
 * no entry for, and it read a ticked item's stale `missed` back to the user as
 * "Missed". It now resolves through resolveDisplayStatus, so the completion flag
 * decides when the stored status contradicts it.
 *
 * Computeds are exercised against a minimal vm-like context (no mount needed),
 * matching the PointsChip.test.js convention.
 */
const TaskStatusTag = require('./TaskStatusTag.vue').default;

const ctx = (overrides = {}) => ({
  status: 'todo',
  isComplete: false,
  showStatus: true,
  ...overrides,
});

describe('TaskStatusTag', () => {
  const config = (overrides) => TaskStatusTag.computed.statusConfig.call(ctx(overrides));

  it('labels `ready` instead of falling back to "Unknown"', () => {
    expect(config({ status: 'ready' }).label).toBe('Ready');
  });

  it('never labels anything "Unknown", even a status it does not know', () => {
    expect(config({ status: 'archived' }).label).toBe('To Do');
  });

  it('shows a ticked item as done however stale its stored status', () => {
    expect(config({ status: 'missed', isComplete: true }).label).toBe('Done');
    expect(config({ status: 'todo', isComplete: true }).label).toBe('Done');
  });

  it('still shows an outstanding miss as missed', () => {
    expect(config({ status: 'missed' }).label).toBe('Missed');
  });

  it('always resolves a complete chip config', () => {
    const resolved = config({ status: 'archived', isComplete: true });
    expect(resolved.color).toBeTruthy();
    expect(resolved.icon).toBeTruthy();
    expect(resolved.description).toBeTruthy();
  });
});
