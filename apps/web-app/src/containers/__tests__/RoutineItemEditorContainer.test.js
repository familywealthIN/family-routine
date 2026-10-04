/* eslint-env jest */
/**
 * RoutineItemEditorContainer — the routine-item write CRUD behind the editor.
 *
 * What is locked:
 *   1. create vs update is chosen by the payload's id, and both return the
 *      COMPLETE routine template so Apollo's own normalization is the whole cache
 *      update (ARCHITECTURE.md §3.2) — there is no `readQuery → clone →
 *      writeQuery` anywhere,
 *   2. only create and delete refetch the list. Apollo 2.x cannot evict, and an
 *      update needs nothing because the entity came back whole,
 *   3. D-04: a step with no id gets one before it is saved. A step's id is
 *      optional on the server, and an id-less step is a step the next edit
 *      cannot address — the old dialog keyed its rows on it and dropped every
 *      one. The ids a step already has are kept,
 *   4. a failed save keeps the sheet OPEN with the reason on screen; a sheet
 *      that closed on failure reads as a successful save,
 *   5. the day's state is never written from here: the mutations carry only
 *      template fields, because `RoutineItem:<id>` is shared with every day's
 *      copy of the routine,
 *   6. the points ceiling the pure sheet cannot derive for itself — the day's
 *      100-point budget, with the edited routine's own points added back.
 */
jest.mock(
  '@routine-notes/ui/organisms/RoutineEditorSheet/RoutineEditorSheet.vue',
  () => ({ __esModule: true, default: { name: 'RoutineEditorSheet', render() {} } }),
);

const { print } = require('graphql/language/printer');

const Container = require('../RoutineItemEditorContainer.vue').default;
const { describeWriteError } = require('../RoutineItemEditorContainer.vue');
const {
  ADD_ROUTINE_ITEM_MUTATION,
  DELETE_ROUTINE_ITEM_MUTATION,
  ROUTINE_SETTINGS_ITEMS_QUERY,
  UPDATE_ROUTINE_ITEM_MUTATION,
} = require('../../composables/graphql/routineSettingsQueries');

const { computed, methods } = Container;

const saved = (over = {}) => ({
  id: 'sw', name: 'Start Work', time: '09:00', points: 12, ...over,
});

const ctx = (over = {}) => ({
  open: true,
  routine: null,
  defaultTime: '',
  errorMessage: '',
  yearGoals: {},
  $agent: { getByTaskRef: () => null },
  $emit: jest.fn(),
  $apollo: {
    mutate: jest.fn(() => Promise.resolve({
      data: { addRoutineItem: saved(), updateRoutineItem: saved() },
    })),
  },
  // `save` delegates to it, so the context has to carry it like a real vm.
  variablesFor: methods.variablesFor,
  ...over,
});

const call = (name, context, ...args) => methods[name].call(context, ...args);

const payload = (over = {}) => ({
  id: 'sw',
  name: 'Start Work',
  description: 'Most important work first.',
  time: '09:00',
  points: 12,
  tags: ['area:work'],
  steps: [{ id: 's1', name: 'Check calendar' }],
  ...over,
});

describe('opening', () => {
  it('opens a new routine at the minute the gap row named', () => {
    const c = ctx({ open: false, routine: saved() });
    call('openNew', c, 650);
    expect(c.open).toBe(true);
    expect(c.routine).toBe(null);
    expect(c.defaultTime).toBe('10:50');
  });

  it('opens a new routine with no suggested time at all', () => {
    const c = ctx({ open: false });
    call('openNew', c);
    expect(c.defaultTime).toBe('');
  });

  it('opens an existing routine, and ignores one with no id', () => {
    const c = ctx({ open: false });
    call('openEdit', c, saved());
    expect(c.open).toBe(true);
    expect(c.routine.id).toBe('sw');

    const empty = ctx({ open: false });
    call('openEdit', empty, { name: 'nameless' });
    expect(empty.open).toBe(false);
  });

  it('clears a previous failure on every open', () => {
    const c = ctx({ errorMessage: 'Network request failed' });
    call('openNew', c);
    expect(c.errorMessage).toBe('');
  });
});

describe('the step ids (D-04)', () => {
  it('mints an id for a step that has none', () => {
    const vars = call('variablesFor', ctx(), payload({
      steps: [{ id: '', name: 'Warm up' }, { id: null, name: 'Run 5k' }],
    }));
    expect(vars.steps.map((s) => s.name)).toEqual(['Warm up', 'Run 5k']);
    expect(vars.steps.every((s) => !!s.id)).toBe(true);
    expect(new Set(vars.steps.map((s) => s.id)).size).toBe(2);
  });

  it('keeps the id a step already has', () => {
    const vars = call('variablesFor', ctx(), payload({
      steps: [{ id: 'kept-id', name: 'Check calendar' }],
    }));
    expect(vars.steps).toEqual([{ id: 'kept-id', name: 'Check calendar' }]);
  });

  it('survives a routine with no steps', () => {
    expect(call('variablesFor', ctx(), payload({ steps: [] })).steps).toEqual([]);
    expect(call('variablesFor', ctx(), payload({ steps: undefined })).steps).toEqual([]);
  });

  it('sends an empty description rather than undefined — the arg is non-null', () => {
    expect(call('variablesFor', ctx(), payload({ description: undefined })).description).toBe('');
    expect(call('variablesFor', ctx(), payload({ tags: undefined })).tags).toEqual([]);
  });
});

describe('save', () => {
  it('creates when the payload has no id, and refetches the list', async () => {
    const c = ctx();
    await call('save', c, payload({ id: '' }));
    const [options] = c.$apollo.mutate.mock.calls[0];
    expect(options.mutation).toBe(ADD_ROUTINE_ITEM_MUTATION);
    expect(options.variables.id).toBeUndefined();
    expect(options.refetchQueries).toEqual([{ query: ROUTINE_SETTINGS_ITEMS_QUERY }]);
    expect(c.open).toBe(false);
    expect(c.$emit).toHaveBeenCalledWith('saved', saved(), true);
  });

  it('updates when the payload has an id, and refetches NOTHING', async () => {
    const c = ctx();
    await call('save', c, payload());
    const [options] = c.$apollo.mutate.mock.calls[0];
    expect(options.mutation).toBe(UPDATE_ROUTINE_ITEM_MUTATION);
    expect(options.variables.id).toBe('sw');
    // The mutation returns the complete entity, so the list heals itself.
    expect(options.refetchQueries).toEqual([]);
    expect(c.$emit).toHaveBeenCalledWith('saved', saved(), false);
  });

  it('keeps the sheet open with the reason when the save fails', async () => {
    const c = ctx({ $apollo: { mutate: () => Promise.reject(new Error('Network request failed')) } });
    const result = await call('save', c, payload());
    expect(result).toBe(null);
    expect(c.open).toBe(true);
    expect(c.errorMessage).toBe('Network request failed');
    expect(c.$emit).toHaveBeenCalledWith('failed', 'Network request failed');
  });

  it('shows the server\'s refusal in its own words, without the transport prefixes (BUG-4)', async () => {
    const reason = 'All 100 points of the day are already given out — lower another routine to make room';
    const error = Object.assign(new Error(`GraphQL error: 400:${reason}`), {
      graphQLErrors: [{ message: `400:${reason}` }],
    });
    const c = ctx({ $apollo: { mutate: () => Promise.reject(error) } });
    const result = await call('save', c, payload({ points: 5 }));
    expect(result).toBe(null);
    expect(c.open).toBe(true);
    expect(c.errorMessage).toBe(reason);
    expect(c.$emit).toHaveBeenCalledWith('failed', reason);
  });

  it('strips the prefixes from the message alone too, and keeps a network error as it is', () => {
    expect(describeWriteError(new Error('GraphQL error: 400:Points must be at least 1'), 'x'))
      .toBe('Points must be at least 1');
    expect(describeWriteError(new Error('Network error: Failed to fetch'), 'x'))
      .toBe('Network error: Failed to fetch');
    expect(describeWriteError(null, 'fallback')).toBe('fallback');
  });

  it('never leaves the user with a blank reason', async () => {
    const c = ctx({ $apollo: { mutate: () => Promise.reject(new Error('')) } });
    await call('save', c, payload());
    expect(c.errorMessage).toBe('Could not save this routine');
  });
});

describe('delete', () => {
  it('deletes by id and refetches the list, because AC2 cannot evict', async () => {
    const c = ctx({ routine: saved() });
    await call('remove', c, 'sw');
    const [options] = c.$apollo.mutate.mock.calls[0];
    expect(options.mutation).toBe(DELETE_ROUTINE_ITEM_MUTATION);
    expect(options.variables).toEqual({ id: 'sw' });
    expect(options.refetchQueries).toEqual([{ query: ROUTINE_SETTINGS_ITEMS_QUERY }]);
    expect(c.open).toBe(false);
    expect(c.$emit).toHaveBeenCalledWith('removed', saved());
  });

  it('does nothing without an id', async () => {
    const c = ctx();
    await call('remove', c, '');
    expect(c.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('keeps the sheet open when the delete fails', async () => {
    const c = ctx({
      routine: saved(),
      $apollo: { mutate: () => Promise.reject(new Error('nope')) },
    });
    await call('remove', c, 'sw');
    expect(c.open).toBe(true);
    expect(c.errorMessage).toBe('nope');
  });
});

/**
 * The editor sheet is pure, so the ONE thing in it that is a property of the
 * whole list — the day's 100-point budget — has to be worked out here.
 */
describe('the points ceiling it hands down', () => {
  /** The day as the page projects it: `{ id, time, points }` for every routine. */
  const day = (...points) => points.map((pts, i) => ({ id: `r${i}`, time: '09:00', points: pts }));
  const maxPoints = (over = {}) => computed.maxPoints.call(ctx(over));

  it('is the per-routine 50 while the day still has room for it', () => {
    expect(maxPoints({ siblings: day(10, 12, 8) })).toBe(50);
    expect(maxPoints({ siblings: [] })).toBe(50);
  });

  it('is what the day has left once that is the smaller of the two', () => {
    // 62 spent, so a new routine may take 38 — not 50.
    expect(maxPoints({ siblings: day(62) })).toBe(38);
  });

  it('adds the edited routine\'s own points back, so re-saving it is allowed', () => {
    const siblings = day(40, 60); // r0 + r1 = the whole 100
    expect(maxPoints({ siblings })).toBe(0);
    expect(maxPoints({ siblings, routine: { id: 'r1', points: 60 } })).toBe(50);
    expect(maxPoints({ siblings, routine: { id: 'r0', points: 40 } })).toBe(40);
  });

  it('reports an exhausted day as it is, for the sheet to explain', () => {
    expect(maxPoints({ siblings: day(100) })).toBe(0);
    expect(maxPoints({ siblings: day(70, 60) })).toBe(-30);
  });
});

describe('the linked rows it reads', () => {
  it('finds the agent bound to this routine in the agent store', () => {
    const c = ctx({
      routine: saved(),
      $agent: { getByTaskRef: (ref) => (ref === 'sw' ? { name: 'PR Summarizer', executionStatus: 'running' } : null) },
    });
    expect(computed.agent.call(c)).toEqual({ name: 'PR Summarizer', status: 'running' });
  });

  it('defaults an agent with no recorded status to idle', () => {
    const c = ctx({ routine: saved(), $agent: { getByTaskRef: () => ({ name: 'A' }) } });
    expect(computed.agent.call(c).status).toBe('idle');
  });

  it('has no agent for a new routine, and none when nothing is bound', () => {
    expect(computed.agent.call(ctx())).toBe(null);
    expect(computed.agent.call(ctx({ routine: saved() }))).toBe(null);
  });

  it('picks this routine\'s year goal out of the page\'s map', () => {
    const link = { id: 'g1', body: 'Ship v2', pct: 67 };
    expect(computed.yearGoal.call(ctx({ routine: saved(), yearGoals: { sw: link } }))).toBe(link);
    expect(computed.yearGoal.call(ctx({ routine: saved(), yearGoals: {} }))).toBe(null);
    expect(computed.yearGoal.call(ctx({ yearGoals: { sw: link } }))).toBe(null);
  });
});

describe('the field set the writes carry', () => {
  const PER_DAY_FIELDS = ['ticked', 'passed', 'wait', 'redeemed', 'passedPoints', 'stimuli'];

  it('never reads or writes a field that belongs to one DAY of the routine', () => {
    // `routine.tasklist` embeds copies that keep the template's _id, so all of
    // them share the one cache record `RoutineItem:<id>`. A settings write that
    // carried `ticked` would overwrite a tick made on Home.
    [
      ROUTINE_SETTINGS_ITEMS_QUERY,
      ADD_ROUTINE_ITEM_MUTATION,
      UPDATE_ROUTINE_ITEM_MUTATION,
    ].forEach((document) => {
      const body = print(document);
      PER_DAY_FIELDS.forEach((field) => expect(body).not.toContain(field));
    });
  });

  it('returns the SAME complete template from every write as the read selects', () => {
    // Leaf field names only: drop blanks, closing braces, argument lines and
    // every line that OPENS a selection set (`routineItems {`, `steps {`).
    const fields = (document) => print(document)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== '}' && !line.includes('(') && !line.endsWith('{'));
    const read = fields(ROUTINE_SETTINGS_ITEMS_QUERY);
    expect(fields(ADD_ROUTINE_ITEM_MUTATION).filter((f) => read.includes(f))).toEqual(read);
    expect(fields(UPDATE_ROUTINE_ITEM_MUTATION).filter((f) => read.includes(f))).toEqual(read);
  });
});
