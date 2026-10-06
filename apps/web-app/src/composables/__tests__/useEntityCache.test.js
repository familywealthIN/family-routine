/* eslint-env jest */
/**
 * Unit tests for useEntityCache — the entity-level Apollo cache primitive that
 * replaces query-level cache surgery. Verifies that patches target the correct
 * normalized id (`${__typename}:${id}`), never clobber a field with `undefined`,
 * keep explicit `null`, and never throw out of a cache write.
 */
const {
  patchEntity,
  patchGoalItem,
  patchRoutineItem,
  readEntity,
} = require('../useEntityCache');

const makeCache = () => ({
  writeFragment: jest.fn(),
  readFragment: jest.fn(() => ({ __typename: 'GoalItem', id: 'g1', isComplete: true })),
});

const fragmentFields = (doc) => doc.definitions[0].selectionSet.selections.map((s) => s.name.value);
const fragmentType = (doc) => doc.definitions[0].typeCondition.name.value;

describe('useEntityCache', () => {
  describe('patchEntity', () => {
    it('writes to the normalized <typename>:<id> cache id', () => {
      const cache = makeCache();
      const ok = patchEntity(cache, { typename: 'GoalItem', id: 'g1', fields: { isComplete: true } });

      expect(ok).toBe(true);
      expect(cache.writeFragment).toHaveBeenCalledTimes(1);
      expect(cache.writeFragment.mock.calls[0][0].id).toBe('GoalItem:g1');
    });

    it('drops undefined fields but keeps null (partial result must not clobber)', () => {
      const cache = makeCache();
      patchEntity(cache, {
        typename: 'GoalItem',
        id: 'g1',
        fields: {
          isComplete: true, status: 'done', completedAt: null, progress: undefined,
        },
      });

      const { data, fragment } = cache.writeFragment.mock.calls[0][0];
      expect(data).toEqual({
        __typename: 'GoalItem', isComplete: true, status: 'done', completedAt: null,
      });
      expect('progress' in data).toBe(false);
      // fragment must select exactly the written fields, on the right type
      expect(fragmentType(fragment)).toBe('GoalItem');
      expect(fragmentFields(fragment).sort()).toEqual(['completedAt', 'isComplete', 'status']);
    });

    it('returns false and does not write when every field is undefined', () => {
      const cache = makeCache();
      const ok = patchEntity(cache, { typename: 'GoalItem', id: 'g1', fields: { progress: undefined } });
      expect(ok).toBe(false);
      expect(cache.writeFragment).not.toHaveBeenCalled();
    });

    it('is a no-op (false) for a bad cache or missing id', () => {
      expect(patchEntity(null, { typename: 'GoalItem', id: 'g1', fields: { a: 1 } })).toBe(false);
      expect(patchEntity({}, { typename: 'GoalItem', id: 'g1', fields: { a: 1 } })).toBe(false);
      expect(patchEntity(makeCache(), { typename: 'GoalItem', id: null, fields: { a: 1 } })).toBe(false);
    });

    it('never throws — a writeFragment failure returns false', () => {
      const cache = { writeFragment: jest.fn(() => { throw new Error('cache miss'); }) };
      expect(patchEntity(cache, { typename: 'GoalItem', id: 'g1', fields: { isComplete: true } })).toBe(false);
    });

    it('ignores an explicit __typename in fields (uses the typename param)', () => {
      const cache = makeCache();
      patchEntity(cache, {
        typename: 'GoalItem', id: 'g1', fields: { __typename: 'WRONG', isComplete: false },
      });
      expect(cache.writeFragment.mock.calls[0][0].data.__typename).toBe('GoalItem');
    });
  });

  describe('convenience wrappers', () => {
    it('patchGoalItem targets GoalItem', () => {
      const cache = makeCache();
      patchGoalItem(cache, 'g1', { isComplete: true });
      expect(cache.writeFragment.mock.calls[0][0].id).toBe('GoalItem:g1');
    });

    it('patchRoutineItem targets RoutineItem', () => {
      const cache = makeCache();
      patchRoutineItem(cache, 'r1', { ticked: true });
      expect(cache.writeFragment.mock.calls[0][0].id).toBe('RoutineItem:r1');
    });
  });

  describe('readEntity', () => {
    it('reads by normalized id and returns the fragment data', () => {
      const cache = makeCache();
      const res = readEntity(cache, { typename: 'GoalItem', id: 'g1', fieldNames: ['isComplete'] });
      expect(cache.readFragment.mock.calls[0][0].id).toBe('GoalItem:g1');
      expect(res.isComplete).toBe(true);
    });

    it('returns null on a read failure', () => {
      const cache = { readFragment: jest.fn(() => { throw new Error('miss'); }) };
      expect(readEntity(cache, { typename: 'GoalItem', id: 'g1', fieldNames: ['isComplete'] })).toBe(null);
    });
  });
});

describe('appendSubTaskItem — optimistic subtask add', () => {
  /* eslint-disable global-require */
  const { InMemoryCache } = require('apollo-cache-inmemory');
  const gql = require('graphql-tag');
  const { appendSubTaskItem } = require('../useEntityCache');
  /* eslint-enable global-require */

  const ITEM = gql`
    fragment Item on GoalItem {
      id
      body
      subTasks { id body isComplete }
    }
  `;
  const seed = () => {
    const cache = new InMemoryCache();
    cache.writeFragment({
      id: 'GoalItem:g1',
      fragment: ITEM,
      data: {
        __typename: 'GoalItem',
        id: 'g1',
        body: 'Some Task',
        subTasks: [{
          __typename: 'SubTaskItem', id: 's1', body: 'a', isComplete: true,
        }],
      },
    });
    return cache;
  };
  const subTasks = (cache) => cache.readFragment({ id: 'GoalItem:g1', fragment: ITEM }).subTasks
    .map((st) => [st.id, st.body, st.isComplete]);

  it('appends to the parent entity, keeping the existing rows', () => {
    const cache = seed();
    expect(appendSubTaskItem(cache, 'g1', { id: 'temp-subtask-1', body: 'b' })).toBe(true);
    expect(subTasks(cache)).toEqual([['s1', 'a', true], ['temp-subtask-1', 'b', false]]);
  });

  it('does not add an id that is already there', () => {
    const cache = seed();
    appendSubTaskItem(cache, 'g1', { id: 's1', body: 'a', isComplete: true });
    expect(subTasks(cache)).toHaveLength(1);
  });

  it('is a harmless no-op when the parent is not cached', () => {
    const cache = new InMemoryCache();
    expect(appendSubTaskItem(cache, 'missing', { id: 's9', body: 'x' })).toBe(false);
  });
});
