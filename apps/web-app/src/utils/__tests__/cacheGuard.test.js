import {
  beginOperation,
  endOperation,
  guardFields,
  confirmFields,
  releaseEntity,
  applyGuards,
  captureFromResult,
  guardStats,
  TTL_MS,
  MAX_GUARDS,
  _reset,
} from '../cacheGuard';

describe('cacheGuard', () => {
  beforeEach(() => {
    _reset();
    jest.useRealTimers();
  });

  describe('applyGuards', () => {
    it('holds an unconfirmed field against a query payload', () => {
      guardFields('RoutineItem', 't1', { ticked: true });
      const op = beginOperation();
      const data = {
        routineDate: {
          __typename: 'Routine',
          id: 'r1',
          tasklist: [{ __typename: 'RoutineItem', id: 't1', ticked: false }],
        },
      };

      expect(applyGuards(data, op)).toBe(1);
      expect(data.routineDate.tasklist[0].ticked).toBe(true);
    });

    it('leaves unguarded entities alone', () => {
      guardFields('RoutineItem', 't1', { ticked: true });
      const op = beginOperation();
      const data = {
        routineDate: {
          __typename: 'Routine',
          id: 'r1',
          tasklist: [{ __typename: 'RoutineItem', id: 't2', ticked: false }],
        },
      };

      expect(applyGuards(data, op)).toBe(0);
      expect(data.routineDate.tasklist[0].ticked).toBe(false);
    });

    it('only touches fields present in the payload', () => {
      guardFields('GoalItem', 'g1', { isComplete: true, progress: 100 });
      const op = beginOperation();
      // A selection set that omits `progress` must not gain the field.
      const data = { goal: { __typename: 'GoalItem', id: 'g1', isComplete: false } };

      applyGuards(data, op);
      expect(data.goal.isComplete).toBe(true);
      expect('progress' in data.goal).toBe(false);
    });

    /**
     * The bug this whole module exists for: the response left BEFORE the
     * mutation resolved, so its payload predates the truth.
     */
    it('holds a confirmed field against a response that left before confirmation', () => {
      const staleOp = beginOperation(); // query leaves
      confirmFields('RoutineItem', 't1', { ticked: true }); // mutation resolves
      const data = { r: { __typename: 'RoutineItem', id: 't1', ticked: false } };

      expect(applyGuards(data, staleOp)).toBe(1);
      expect(data.r.ticked).toBe(true);
    });

    it('trusts a response issued after confirmation', () => {
      confirmFields('RoutineItem', 't1', { ticked: true });
      const freshOp = beginOperation(); // query leaves AFTER the truth
      const data = { r: { __typename: 'RoutineItem', id: 't1', ticked: false } };

      expect(applyGuards(data, freshOp)).toBe(0);
      expect(data.r.ticked).toBe(false);
    });

    it('is a no-op with an empty registry', () => {
      const op = beginOperation();
      const data = { r: { __typename: 'RoutineItem', id: 't1', ticked: false } };
      expect(applyGuards(data, op)).toBe(0);
      expect(data.r.ticked).toBe(false);
    });

    it('survives cyclic payloads', () => {
      guardFields('GoalItem', 'g1', { isComplete: true });
      const op = beginOperation();
      const node = { __typename: 'GoalItem', id: 'g1', isComplete: false };
      node.self = node;
      const data = { goal: node };

      expect(() => applyGuards(data, op)).not.toThrow();
      expect(node.isComplete).toBe(true);
    });

    it('ignores entities missing id or __typename', () => {
      guardFields('GoalItem', 'g1', { isComplete: true });
      const op = beginOperation();
      const data = {
        a: { id: 'g1', isComplete: false }, // no __typename
        b: { __typename: 'GoalItem', isComplete: false }, // no id
      };
      expect(applyGuards(data, op)).toBe(0);
    });
  });

  describe('guardFields', () => {
    it('refuses non-scalar fields — lists always come from the server', () => {
      guardFields('GoalItem', 'g1', {
        isComplete: true,
        subTasks: [{ id: 's1' }],
        meta: { a: 1 },
      });
      const entry = guardStats().entries.find((e) => e.key === 'GoalItem:g1');
      expect(entry.fields).toEqual(['isComplete']);
    });

    it('keeps null (a real "clear this field") but drops undefined', () => {
      guardFields('GoalItem', 'g1', { completedAt: null, status: undefined });
      const entry = guardStats().entries.find((e) => e.key === 'GoalItem:g1');
      expect(entry.fields).toEqual(['completedAt']);
    });

    it('registers nothing when no field is guardable', () => {
      expect(guardFields('GoalItem', 'g1', { subTasks: [] })).toBe(false);
      expect(guardStats().guards).toBe(0);
    });

    it('re-arms an already-confirmed guard on a new local write', () => {
      confirmFields('GoalItem', 'g1', { isComplete: true });
      expect(guardStats().entries[0].confirmed).toBe(true);
      guardFields('GoalItem', 'g1', { isComplete: false });
      expect(guardStats().entries[0].confirmed).toBe(false);
    });
  });

  describe('captureFromResult', () => {
    it('confirms every entity a mutation returns, with no prior registration', () => {
      const staleOp = beginOperation();
      captureFromResult({
        tickRoutineItem: {
          __typename: 'Routine',
          id: 'r1',
          tasklist: [
            { __typename: 'RoutineItem', id: 't1', ticked: true },
            { __typename: 'RoutineItem', id: 't2', ticked: false },
          ],
        },
      });

      // The two RoutineItems only. `Routine:r1` carries no scalar of its own in
      // this selection set (just `id` and the `tasklist` array), so there is
      // nothing on it to guard.
      expect(guardStats().guards).toBe(2);

      const data = {
        routineDate: {
          __typename: 'Routine',
          id: 'r1',
          tasklist: [{ __typename: 'RoutineItem', id: 't1', ticked: false }],
        },
      };
      applyGuards(data, staleOp);
      expect(data.routineDate.tasklist[0].ticked).toBe(true);
    });

    it('merges into an existing guard without dropping unreturned fields', () => {
      // `progress` is claimed locally; the mutation does not return it.
      guardFields('GoalItem', 'g1', { isComplete: true, progress: 100 });
      const staleOp = beginOperation();
      captureFromResult({
        completeGoalItem: {
          __typename: 'GoalItem', id: 'g1', isComplete: true, status: 'done',
        },
      });

      const entry = guardStats().entries.find((e) => e.key === 'GoalItem:g1');
      expect(entry.fields.sort()).toEqual(['isComplete', 'progress', 'status']);
      expect(entry.confirmed).toBe(true);

      const data = {
        g: {
          __typename: 'GoalItem', id: 'g1', isComplete: false, progress: 0,
        },
      };
      applyGuards(data, staleOp);
      expect(data.g.isComplete).toBe(true);
      expect(data.g.progress).toBe(100); // survived, though never returned
    });

    it('handles a null/garbage payload', () => {
      expect(captureFromResult(null)).toBe(0);
      expect(captureFromResult('nope')).toBe(0);
      expect(guardStats().guards).toBe(0);
    });
  });

  describe('release', () => {
    it('releaseEntity drops the guard so the next read heals', () => {
      guardFields('RoutineItem', 't1', { ticked: true });
      const op = beginOperation();
      expect(releaseEntity('RoutineItem', 't1')).toBe(true);

      const data = { r: { __typename: 'RoutineItem', id: 't1', ticked: false } };
      applyGuards(data, op);
      expect(data.r.ticked).toBe(false); // rolled back, as Apollo did too
    });

    it('retires a confirmed guard once nothing older is in flight', () => {
      const op = beginOperation();
      confirmFields('RoutineItem', 't1', { ticked: true });
      expect(guardStats().guards).toBe(1);

      endOperation(op); // the last stale reader drains
      expect(guardStats().guards).toBe(0);
    });

    it('keeps a confirmed guard while an older request is still out', () => {
      const older = beginOperation();
      const newer = beginOperation();
      confirmFields('RoutineItem', 't1', { ticked: true });

      endOperation(newer);
      expect(guardStats().guards).toBe(1); // `older` can still deliver stale data

      endOperation(older);
      expect(guardStats().guards).toBe(0);
    });

    it('does not retire an unconfirmed guard', () => {
      const op = beginOperation();
      guardFields('RoutineItem', 't1', { ticked: true });
      endOperation(op);
      expect(guardStats().guards).toBe(1); // mutation still in flight
    });

    it('endOperation is idempotent', () => {
      const op = beginOperation();
      endOperation(op);
      endOperation(op);
      expect(guardStats().inFlight).toBe(0);
    });

    it('expires a guard whose mutation never resolved', () => {
      const realNow = Date.now;
      let clock = 1000000;
      Date.now = () => clock;
      try {
        guardFields('RoutineItem', 't1', { ticked: true });
        clock += TTL_MS + 1;
        // A completing request triggers the sweep.
        endOperation(beginOperation());
        expect(guardStats().guards).toBe(0);
      } finally {
        Date.now = realNow;
      }
    });
  });

  it('caps the registry so it cannot grow without bound', () => {
    for (let i = 0; i < MAX_GUARDS + 25; i += 1) {
      guardFields('GoalItem', `g${i}`, { isComplete: true });
    }
    expect(guardStats().guards).toBe(MAX_GUARDS);
    // The most recent claims are the ones that matter.
    const keys = guardStats().entries.map((e) => e.key);
    expect(keys).toContain(`GoalItem:g${MAX_GUARDS + 24}`);
  });
});
