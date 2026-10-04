/* eslint-env jest */
/**
 * AgentFormContainer — the agent write CRUD behind the New/Edit sheet.
 *
 * What is locked:
 *   1. create vs update is chosen by the payload's id, and update never sends a
 *      taskRef (the server's `updateAgent` has no such argument),
 *   2. a failed save keeps the sheet OPEN with the reason on screen — the
 *      unique-index message ("An agent already exists for this routine") is the
 *      actionable one, and a sheet that closed would read as a successful save,
 *   3. the form's routine options exclude routines other agents own.
 */
jest.mock(
  '@routine-notes/ui/organisms/AgentFormSheet/AgentFormSheet.vue',
  () => ({ __esModule: true, default: { name: 'AgentFormSheet', render() {} } }),
);

const Container = require('../AgentFormContainer.vue').default;

const ctx = (over = {}) => ({
  open: false,
  agent: null,
  prefillTaskRef: '',
  errorMessage: '',
  routineItems: [
    { id: 'r1', name: 'Start Work', time: '09:00' },
    { id: 'r2', name: 'Lunch Walk', time: '12:30' },
  ],
  $agent: {
    agents: [],
    add: jest.fn((input) => Promise.resolve({ id: 'a-new', ...input })),
    update: jest.fn((id, patch) => Promise.resolve({ id, ...patch })),
    remove: jest.fn(() => Promise.resolve()),
  },
  $emit: jest.fn(),
  routineLabelFor(agent) { return Container.methods.routineLabelFor.call(this, agent); },
  ...over,
});

const payload = (over = {}) => ({
  id: null,
  name: 'PR Summarizer',
  taskRef: 'r1',
  startEvent: { kind: 'url', value: 'https://hooks/start' },
  endEvent: null,
  ...over,
});

describe('AgentFormContainer — opening', () => {
  it('openNew clears the agent and takes an optional routine prefill', () => {
    const vm = ctx({ agent: { id: 'a1' }, errorMessage: 'old' });
    Container.methods.openNew.call(vm, 'r2');
    expect(vm.agent).toBeNull();
    expect(vm.prefillTaskRef).toBe('r2');
    expect(vm.errorMessage).toBe('');
    expect(vm.open).toBe(true);
  });

  it('openEdit loads the agent and ignores a missing one', () => {
    const vm = ctx();
    Container.methods.openEdit.call(vm, { id: 'a1', name: 'PR' });
    expect(vm.agent).toEqual({ id: 'a1', name: 'PR' });
    expect(vm.open).toBe(true);

    const empty = ctx();
    Container.methods.openEdit.call(empty, null);
    expect(empty.open).toBe(false);
  });
});

describe('AgentFormContainer — create', () => {
  it('calls add with the routine binding and closes', async () => {
    const vm = ctx({ open: true });
    const saved = await Container.methods.save.call(vm, payload());
    expect(vm.$agent.add).toHaveBeenCalledWith({
      name: 'PR Summarizer',
      taskRef: 'r1',
      startEvent: { kind: 'url', value: 'https://hooks/start' },
      endEvent: null,
    });
    expect(vm.open).toBe(false);
    expect(vm.$emit).toHaveBeenCalledWith('saved', saved, true, '09:00 Start Work');
  });
});

describe('AgentFormContainer — update', () => {
  it('calls update by id and never sends a taskRef', async () => {
    const vm = ctx({ open: true });
    const saved = await Container.methods.save.call(vm, payload({ id: 'a1', taskRef: 'r2' }));
    expect(vm.$agent.update).toHaveBeenCalledWith('a1', {
      name: 'PR Summarizer',
      startEvent: { kind: 'url', value: 'https://hooks/start' },
      endEvent: null,
    });
    expect(vm.$agent.update.mock.calls[0][1].taskRef).toBeUndefined();
    expect(vm.$emit).toHaveBeenCalledWith('saved', saved, false, '');
  });
});

describe('AgentFormContainer — a failed save', () => {
  it('stays open with the server message and reports it', async () => {
    const vm = ctx({
      open: true,
      $agent: {
        agents: [],
        add: jest.fn(() => Promise.reject(new Error('An agent already exists for this routine'))),
      },
    });
    const result = await Container.methods.save.call(vm, payload());
    expect(result).toBeNull();
    expect(vm.open).toBe(true);
    expect(vm.errorMessage).toBe('An agent already exists for this routine');
    expect(vm.$emit).toHaveBeenCalledWith('failed', 'An agent already exists for this routine');
  });

  it('falls back to a readable message when the error has none', async () => {
    const vm = ctx({ open: true, $agent: { agents: [], add: jest.fn(() => Promise.reject(new Error(''))) } });
    await Container.methods.save.call(vm, payload());
    expect(vm.errorMessage).toBe('Failed to save agent');
  });
});

describe('AgentFormContainer — delete', () => {
  it('removes the agent, closes and reports which one went', async () => {
    const removed = { id: 'a1', name: 'PR Summarizer' };
    const vm = ctx({ open: true, agent: removed });
    await Container.methods.remove.call(vm, 'a1');
    expect(vm.$agent.remove).toHaveBeenCalledWith('a1');
    expect(vm.open).toBe(false);
    expect(vm.$emit).toHaveBeenCalledWith('removed', removed);
  });

  it('ignores a delete with no id', async () => {
    const vm = ctx({ open: true });
    await Container.methods.remove.call(vm, '');
    expect(vm.$agent.remove).not.toHaveBeenCalled();
    expect(vm.open).toBe(true);
  });

  it('stays open with the reason when the delete fails', async () => {
    const vm = ctx({
      open: true,
      agent: { id: 'a1' },
      $agent: { agents: [], remove: jest.fn(() => Promise.reject(new Error('nope'))) },
    });
    await Container.methods.remove.call(vm, 'a1');
    expect(vm.open).toBe(true);
    expect(vm.errorMessage).toBe('nope');
    expect(vm.$emit).toHaveBeenCalledWith('failed', 'nope');
  });
});

describe('AgentFormContainer — routine options', () => {
  it('hides routines another agent owns, and keeps the edited agent\'s own', () => {
    const taken = ctx({ $agent: { agents: [{ id: 'a9', taskRef: 'r1' }] } });
    expect(Container.computed.routineOptions.call(taken).map((o) => o.value)).toEqual(['r2']);

    const editing = ctx({
      agent: { id: 'a9', taskRef: 'r1' },
      $agent: { agents: [{ id: 'a9', taskRef: 'r1' }] },
    });
    expect(Container.computed.routineOptions.call(editing).map((o) => o.value)).toEqual(['r1', 'r2']);
  });
});

describe('AgentFormContainer — naming the routine for the toast', () => {
  it('resolves the routine name from its own list, never the raw taskRef', () => {
    const vm = ctx();
    expect(vm.routineLabelFor({ taskRef: 'r2' })).toBe('12:30 Lunch Walk');
    expect(vm.routineLabelFor({ taskRef: '6ac1795a52f4816f4ce3da9a' })).toBe('');
    expect(vm.routineLabelFor(null)).toBe('');
  });
});
