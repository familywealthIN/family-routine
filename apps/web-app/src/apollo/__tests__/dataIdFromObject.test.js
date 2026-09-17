/**
 * D-04: the Routine Steps modal showed another item's steps, tripled.
 *
 * A step's id is nullable on the server, and Apollo's `defaultDataIdFromObject`
 * treats a null id as an identity — every id-less step normalized to the one
 * key `StepItem:null`. Both routine items below then read back as three copies
 * of a single shared step, which is the reported symptom exactly (and, once the
 * Edit dialog saved that array back, how the wrong steps reached the database).
 *
 * Proven against a real InMemoryCache, because the defect is in the library's
 * normalization and not in anything we could assert on a stub.
 */
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import dataIdFromObject from '../dataIdFromObject';

const ROUTINE_ITEMS_QUERY = gql`
  query routineItems {
    routineItems {
      id
      name
      steps { id name }
    }
  }
`;

// What the dashboard — and so the Routine Steps modal — reads.
const ROUTINE_DATE_QUERY = gql`
  query routineDate($date: String!) {
    routineDate(date: $date) {
      id
      date
      tasklist { id name steps { name } }
    }
  }
`;

const step = (name) => ({ __typename: 'StepItem', id: null, name });

const ROUTINE_ITEMS = [
  {
    __typename: 'RoutineItem',
    id: 'morning-movement',
    name: 'Morning movement',
    steps: [step('Stretch - 5 min'), step('Walk - 10 min'), step('Breathe')],
  },
  {
    __typename: 'RoutineItem',
    id: 'evening-wind-down',
    name: 'Evening wind-down',
    steps: [step('journal'), step('plan tomorrow'), step('lights out')],
  },
  {
    __typename: 'RoutineItem', id: 'wake-up', name: 'Wake Up', steps: [],
  },
];

const byName = (items) => items.reduce(
  (acc, item) => ({ ...acc, [item.name]: item.steps.map((s) => s.name) }),
  {},
);

const readBack = (cache) => {
  cache.writeQuery({ query: ROUTINE_ITEMS_QUERY, data: { routineItems: ROUTINE_ITEMS } });
  return byName(cache.readQuery({ query: ROUTINE_ITEMS_QUERY }).routineItems);
};

// The reported route: /home paints the day, /settings loads the same routine
// items — the two queries share the `RoutineItem:<id>` records — and the step
// modal is opened afterwards.
const readBackFromDashboard = (cache) => {
  const variables = { date: '17-09-2026' };
  cache.writeQuery({
    query: ROUTINE_DATE_QUERY,
    variables,
    data: {
      routineDate: {
        __typename: 'Routine',
        id: 'routine-1',
        date: variables.date,
        tasklist: ROUTINE_ITEMS.map(({ steps, ...item }) => ({
          ...item,
          steps: steps.map(({ name }) => ({ __typename: 'StepItem', name })),
        })),
      },
    },
  });
  cache.writeQuery({ query: ROUTINE_ITEMS_QUERY, data: { routineItems: ROUTINE_ITEMS } });
  return byName(cache.readQuery({ query: ROUTINE_DATE_QUERY, variables }).routineDate.tasklist);
};

describe('dataIdFromObject', () => {
  it('does not normalize an object whose id is null', () => {
    expect(dataIdFromObject({ __typename: 'StepItem', id: null, name: 'Stretch' })).toBeNull();
  });

  it('still normalizes an entity that has an id', () => {
    expect(dataIdFromObject({ __typename: 'RoutineItem', id: 'r1' })).toBe('RoutineItem:r1');
  });

  it('keeps each routine item reading back its own steps, once each', () => {
    const steps = readBack(new InMemoryCache({ dataIdFromObject }));

    expect(steps['Morning movement']).toEqual(['Stretch - 5 min', 'Walk - 10 min', 'Breathe']);
    expect(steps['Evening wind-down']).toEqual(['journal', 'plan tomorrow', 'lights out']);
    expect(steps['Wake Up']).toEqual([]);
  });

  it('keeps the step modal on the item whose info icon was pressed', () => {
    const steps = readBackFromDashboard(new InMemoryCache({ dataIdFromObject }));

    expect(steps['Morning movement']).toEqual(['Stretch - 5 min', 'Walk - 10 min', 'Breathe']);
    expect(steps['Evening wind-down']).toEqual(['journal', 'plan tomorrow', 'lights out']);
    expect(steps['Wake Up']).toEqual([]);
  });

  it('is what stops the collapse — the default id shape reproduces the bug', () => {
    // One shared `StepItem:null` record: every item, every position.
    const steps = readBack(new InMemoryCache());
    expect(new Set([...steps['Morning movement'], ...steps['Evening wind-down']]).size).toBe(1);

    // And `routineItems` poisons the modal, because both queries write the
    // `steps` field of the same `RoutineItem:<id>` record.
    const modal = readBackFromDashboard(new InMemoryCache());
    expect(modal['Evening wind-down']).toEqual(['Stretch - 5 min', 'Stretch - 5 min', 'Stretch - 5 min']);
  });
});
