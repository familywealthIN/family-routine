/* eslint-env jest */
/**
 * Unit tests for the task status vocabulary and its display resolution.
 *
 * D-03: /search badged ticked items "Unknown" (their stored status was `ready`,
 * which the client had no label for) and "Missed" (a status the tick had already
 * disproved). The vocabulary has to cover everything the server can store, and
 * `isComplete` has to outrank a status that contradicts it — without flattening
 * a genuine miss, which is still outstanding work.
 */
const fs = require('fs');
const path = require('path');

const {
  TASK_STATUS,
  TASK_STATUS_CONFIG,
  resolveDisplayStatus,
  isMissed,
} = require('../utils/taskStatus');

// The server's enum is the only authority on which statuses can be stored, so
// read it rather than restating it here and letting the two drift apart.
const GOAL_SCHEMA_PATH = path.join(__dirname, '../../../apps/server/src/schema/GoalSchema.js');

function serverStatusEnum() {
  const source = fs.readFileSync(GOAL_SCHEMA_PATH, 'utf8');
  const declaration = source.match(/enum:\s*\[([^\]]+)\]/);
  const values = declaration ? declaration[1].match(/'([^']+)'/g) : null;
  return (values || []).map((value) => value.replace(/'/g, ''));
}

describe('task status vocabulary', () => {
  it('finds the server enum it is meant to mirror', () => {
    expect(serverStatusEnum().length).toBeGreaterThan(0);
  });

  it('labels every status the server permits', () => {
    serverStatusEnum().forEach((status) => {
      expect(TASK_STATUS_CONFIG[status]).toBeDefined();
      expect(TASK_STATUS_CONFIG[status].label).toBeTruthy();
    });
  });

  it('labels `ready`, which an agent start event writes', () => {
    expect(TASK_STATUS.READY).toBe('ready');
    expect(TASK_STATUS_CONFIG[TASK_STATUS.READY].label).toBe('Ready');
  });
});

describe('resolveDisplayStatus', () => {
  const resolve = (status, isComplete) => resolveDisplayStatus({ status, isComplete });

  describe('outstanding items', () => {
    it('keeps a recognised status', () => {
      expect(resolve('ready', false)).toBe(TASK_STATUS.READY);
      expect(resolve('progress', false)).toBe(TASK_STATUS.PROGRESS);
    });

    it('still reads a genuine miss as missed', () => {
      expect(resolve('missed', false)).toBe(TASK_STATUS.MISSED);
    });

    it('falls back to TODO for a status it cannot label', () => {
      expect(resolve('archived', false)).toBe(TASK_STATUS.TODO);
      expect(resolve(undefined, false)).toBe(TASK_STATUS.TODO);
    });
  });

  describe('ticked items', () => {
    it('does not let a stale status assert the item is outstanding', () => {
      expect(resolve('todo', true)).toBe(TASK_STATUS.DONE);
      expect(resolve('ready', true)).toBe(TASK_STATUS.DONE);
    });

    it('falls back to the completion flag for a status it cannot label', () => {
      expect(resolve('archived', true)).toBe(TASK_STATUS.DONE);
    });

    // Status is one-to-one with timing: missed = not done in its window, and
    // a late tick does not undo it.
    it('keeps MISSED on a late tick', () => {
      expect(resolve('missed', true)).toBe(TASK_STATUS.MISSED);
    });

    it('leaves DONE and RESCHEDULED alone', () => {
      expect(resolve('done', true)).toBe(TASK_STATUS.DONE);
      expect(resolve('rescheduled', true)).toBe(TASK_STATUS.RESCHEDULED);
    });
  });

  it('only ever returns a labelled status', () => {
    const statuses = serverStatusEnum().concat(['archived', '', undefined, null]);

    statuses.forEach((status) => {
      [true, false].forEach((isComplete) => {
        expect(TASK_STATUS_CONFIG[resolve(status, isComplete)]).toBeDefined();
      });
    });
  });
});

describe('isMissed', () => {
  it('is true for an item marked missed and not ticked', () => {
    expect(isMissed({ status: 'missed', isComplete: false })).toBe(true);
  });

  it('stays true once it is ticked late: status is one-to-one with timing', () => {
    expect(isMissed({ status: 'missed', isComplete: true })).toBe(true);
  });

  it('is false for an open or done item that was never missed', () => {
    expect(isMissed({ status: 'todo', isComplete: false })).toBe(false);
    expect(isMissed({ isComplete: false })).toBe(false);
    expect(isMissed({ status: 'done', isComplete: true })).toBe(false);
    expect(isMissed(null)).toBe(false);
  });
});
