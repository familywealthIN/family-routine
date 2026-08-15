/**
 * End-to-end proof that the guard closes the revert race inside a real Apollo
 * Client 2.x, cache and all — not just in the registry's own unit tests.
 *
 * The scenario is the reported bug, reproduced deterministically by holding a
 * query response on the wire while a mutation resolves underneath it:
 *
 *   Q1  routine read           -> ticked: false   (primes the cache)
 *   Q2  routine read LEAVES    -> held
 *   M   tick mutation resolves -> ticked: true
 *   Q2  response ARRIVES       -> ticked: false   (stale: it left before M)
 *
 * Without the guard the cache ends on `false` and the user watches their tick
 * turn white again. With it, Q2 yields.
 */
import { ApolloClient } from 'apollo-client';
import { ApolloLink, Observable } from 'apollo-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import { createGuardLink } from '../guardLink';
import { _reset } from '../../utils/cacheGuard';

const ROUTINE_QUERY = gql`
  query routineDate($date: String!) {
    routineDate(date: $date) {
      id
      tasklist { id name ticked }
    }
  }
`;

const TICK_MUTATION = gql`
  mutation tickRoutineItem($id: ID!, $taskId: String!, $ticked: Boolean!) {
    tickRoutineItem(id: $id, taskId: $taskId, ticked: $ticked) {
      id
      tasklist { id name ticked }
    }
  }
`;

const routinePayload = (ticked) => ({
  routineDate: {
    __typename: 'Routine',
    id: 'r1',
    tasklist: [
      {
        __typename: 'RoutineItem', id: 't1', name: 'Wake Up', ticked,
      },
      {
        __typename: 'RoutineItem', id: 't2', name: 'Movement', ticked: false,
      },
    ],
  },
});

const tickPayload = () => ({
  tickRoutineItem: {
    __typename: 'Routine',
    id: 'r1',
    tasklist: [
      {
        __typename: 'RoutineItem', id: 't1', name: 'Wake Up', ticked: true,
      },
      {
        __typename: 'RoutineItem', id: 't2', name: 'Movement', ticked: false,
      },
    ],
  },
});

/**
 * A terminating link that parks every request until the test resolves it,
 * so responses can be delivered out of order on purpose.
 */
function createControllableLink() {
  const pending = [];
  const link = new ApolloLink((operation) => new Observable((observer) => {
    pending.push({
      name: operation.operationName,
      respond(data) {
        observer.next({ data });
        observer.complete();
      },
    });
  }));
  const take = (name) => {
    const i = pending.findIndex((p) => p.name === name && !p.done);
    if (i === -1) throw new Error(`no pending operation named ${name}`);
    pending[i].done = true;
    return pending[i];
  };
  return { link, take, pending };
}

function makeClient({ guarded }) {
  const cache = new InMemoryCache();
  const controllable = createControllableLink();
  const link = guarded
    ? createGuardLink().concat(controllable.link)
    : controllable.link;
  const client = new ApolloClient({ link, cache });
  return { client, cache, controllable };
}

/** Let queued microtasks (Apollo's internal promise chains) drain. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const readTicked = (cache, taskId = 't1') => {
  const data = cache.readQuery({ query: ROUTINE_QUERY, variables: { date: '29-07-2026' } });
  return data.routineDate.tasklist.find((t) => t.id === taskId).ticked;
};

describe('guardLink in a real Apollo Client', () => {
  beforeEach(() => _reset());

  /**
   * Runs the race. Returns the cached `ticked` for t1 afterwards.
   */
  async function runRace({ guarded }) {
    const { client, cache, controllable } = makeClient({ guarded });

    // Q1 primes the cache with the pre-tick server state.
    const q1 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    controllable.take('routineDate').respond(routinePayload(false));
    await q1;
    expect(readTicked(cache)).toBe(false);

    // Q2 leaves — this is the app-open cache-and-network read.
    const q2 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    const staleRead = controllable.take('routineDate');

    // The user taps. The mutation resolves while Q2 is still out.
    const m = client.mutate({
      mutation: TICK_MUTATION,
      variables: { id: 'r1', taskId: 't1', ticked: true },
    });
    await settle();
    controllable.take('tickRoutineItem').respond(tickPayload());
    await m;
    expect(readTicked(cache)).toBe(true);

    // Q2's response finally lands, carrying pre-tap state.
    staleRead.respond(routinePayload(false));
    await q2;
    await settle();

    return readTicked(cache);
  }

  it('holds the tick when a response that left before the mutation lands after it', async () => {
    await expect(runRace({ guarded: true })).resolves.toBe(true);
  });

  // The control. If this ever passes, the test above has stopped proving
  // anything — the race would no longer be reachable.
  it('CONTROL: without the guard the same sequence reverts the tick', async () => {
    await expect(runRace({ guarded: false })).resolves.toBe(false);
  });

  it('does not hold a response issued after the mutation resolved', async () => {
    const { client, cache, controllable } = makeClient({ guarded: true });

    const q1 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    controllable.take('routineDate').respond(routinePayload(false));
    await q1;

    const m = client.mutate({
      mutation: TICK_MUTATION,
      variables: { id: 'r1', taskId: 't1', ticked: true },
    });
    await settle();
    controllable.take('tickRoutineItem').respond(tickPayload());
    await m;
    expect(readTicked(cache)).toBe(true);

    // A read issued AFTER the truth is authoritative — e.g. the task was
    // un-ticked on another device. It must win, or the app could never converge.
    const q3 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    controllable.take('routineDate').respond(routinePayload(false));
    await q3;
    await settle();

    expect(readTicked(cache)).toBe(false);
  });

  /**
   * A mutation result confirms EVERY entity it carries, not just the one the
   * user touched — `tickRoutineItem` returns the whole tasklist. So a response
   * from a request issued earlier loses on all of them, which is the rule the
   * guard implements: the newer payload wins, and "newer" means the request
   * that left last. It is bounded (the next read is trusted) and self-healing.
   */
  it('a mutation result outranks an earlier request on every entity it carries', async () => {
    const { client, cache, controllable } = makeClient({ guarded: true });

    const q1 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    controllable.take('routineDate').respond(routinePayload(false));
    await q1;

    const q2 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    const staleRead = controllable.take('routineDate');

    const m = client.mutate({
      mutation: TICK_MUTATION,
      variables: { id: 'r1', taskId: 't1', ticked: true },
    });
    await settle();
    // The tick response reports t2 as still unticked.
    controllable.take('tickRoutineItem').respond(tickPayload());
    await m;

    // Q2 — issued BEFORE that response — claims t2 is ticked. It loses.
    const other = routinePayload(false);
    other.routineDate.tasklist[1].ticked = true;
    staleRead.respond(other);
    await q2;
    await settle();

    expect(readTicked(cache, 't1')).toBe(true);
    expect(readTicked(cache, 't2')).toBe(false);

    // ...and converges on the very next read.
    const q3 = client.query({
      query: ROUTINE_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    const converged = routinePayload(true);
    converged.routineDate.tasklist[1].ticked = true;
    controllable.take('routineDate').respond(converged);
    await q3;
    await settle();

    expect(readTicked(cache, 't2')).toBe(true);
  });

  it('leaves entities the mutation never mentioned completely alone', async () => {
    const GOALS_QUERY = gql`
      query optimizedDailyGoals($date: String!) {
        optimizedDailyGoals(date: $date) {
          id
          goalItems { id body isComplete }
        }
      }
    `;
    const goalsPayload = (isComplete) => ({
      optimizedDailyGoals: [{
        __typename: 'Goal',
        id: 'goal1',
        goalItems: [{
          __typename: 'GoalItem', id: 'g1', body: 'Step 1', isComplete,
        }],
      }],
    });

    const { client, cache, controllable } = makeClient({ guarded: true });

    const q1 = client.query({
      query: GOALS_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    controllable.take('optimizedDailyGoals').respond(goalsPayload(false));
    await q1;

    // A goals read leaves, then an unrelated routine tick resolves.
    const q2 = client.query({
      query: GOALS_QUERY, variables: { date: '29-07-2026' }, fetchPolicy: 'network-only',
    });
    await settle();
    const goalsRead = controllable.take('optimizedDailyGoals');

    const m = client.mutate({
      mutation: TICK_MUTATION,
      variables: { id: 'r1', taskId: 't1', ticked: true },
    });
    await settle();
    controllable.take('tickRoutineItem').respond(tickPayload());
    await m;

    // GoalItem:g1 appears in no guard, so the read is authoritative.
    goalsRead.respond(goalsPayload(true));
    await q2;
    await settle();

    const data = cache.readQuery({ query: GOALS_QUERY, variables: { date: '29-07-2026' } });
    expect(data.optimizedDailyGoals[0].goalItems[0].isComplete).toBe(true);
  });
});
