/* eslint-env jest */
/**
 * SkipDayContainer — `skipRoutine` behind the long-press sheet.
 *
 * What is pinned:
 *
 *   1. **`id` is the day's Routine document id**, not a routine item. Without it
 *      the control explains itself instead of either silently failing or
 *      disabling (ARCHITECTURE §3.7: never disable to win a race).
 *   2. **The server's refusal is shown verbatim.** `skipRoutine` throws "You have
 *      already skip 2 days this week." — behind generic text the sheet would just
 *      close and nothing would change, which reads as a broken button.
 *   3. **A failure rolls the store back.** The store drives the week strip's pause
 *      overlay and the card's banner, so leaving it optimistic would show a skip
 *      the server refused.
 */
jest.mock(
  '@routine-notes/ui/organisms/SkipDaySheet/SkipDaySheet.vue',
  () => ({ __esModule: true, default: { name: 'SkipDaySheet', render() {} } }),
);
jest.mock('../../utils/cacheGuard', () => ({
  guardFields: jest.fn(),
  releaseEntity: jest.fn(),
}));
jest.mock('../../composables/useEntityCache', () => ({ patchEntity: jest.fn() }));

const Container = require('../SkipDayContainer.vue').default;
const { guardFields, releaseEntity } = require('../../utils/cacheGuard');
const { patchEntity } = require('../../composables/useEntityCache');

const ctx = (over = {}) => ({
  routineId: 'rd1',
  errorMessage: '',
  $apollo: { mutate: jest.fn(() => Promise.resolve({ data: {} })) },
  $routine: { setSkipDay: jest.fn() },
  $emit: jest.fn(),
  close: Container.methods.close,
  ...over,
});

const call = (name, vm, ...args) => Container.methods[name].call(vm, ...args);

beforeEach(() => jest.clearAllMocks());

describe('SkipDayContainer — skipping', () => {
  it('sends the day document id and the new value', () => {
    const vm = ctx();
    call('onConfirm', vm, { skip: true, reason: 'travel' });
    expect(vm.$apollo.mutate.mock.calls[0][0].variables)
      .toEqual({ id: 'rd1', skip: true });
  });

  it('is optimistic in the store so the strip and the card react at once', () => {
    const vm = ctx();
    call('onConfirm', vm, { skip: true, reason: '' });
    expect(vm.$routine.setSkipDay).toHaveBeenCalledWith(true);
    expect(guardFields).toHaveBeenCalledWith('Routine', 'rd1', ['skip']);
  });

  it('its optimistic response is a complete Routine entity', () => {
    const vm = ctx();
    call('onConfirm', vm, { skip: true, reason: '' });
    expect(vm.$apollo.mutate.mock.calls[0][0].optimisticResponse.skipRoutine)
      .toEqual({ __typename: 'Routine', id: 'rd1', skip: true });
  });

  it('patches the Routine entity by id rather than rewriting a query', () => {
    const vm = ctx({
      $apollo: {
        mutate: jest.fn((options) => {
          options.update({}, { data: { skipRoutine: { id: 'rd1', skip: true } } });
          return Promise.resolve({ data: {} });
        }),
      },
    });
    call('onConfirm', vm, { skip: true, reason: '' });
    expect(patchEntity).toHaveBeenCalledWith({}, {
      typename: 'Routine', id: 'rd1', fields: { skip: true },
    });
  });

  it('closes and reports the reason on success', async () => {
    const vm = ctx();
    call('onConfirm', vm, { skip: true, reason: 'sick' });
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$emit).toHaveBeenCalledWith('close');
    expect(vm.$emit).toHaveBeenCalledWith('changed', { skip: true, reason: 'sick' });
  });
});

describe('SkipDayContainer — undoing', () => {
  it('sends skip false', () => {
    const vm = ctx();
    call('onConfirm', vm, { skip: false, reason: '' });
    expect(vm.$apollo.mutate.mock.calls[0][0].variables)
      .toEqual({ id: 'rd1', skip: false });
    expect(vm.$routine.setSkipDay).toHaveBeenCalledWith(false);
  });
});

describe('SkipDayContainer — refusal', () => {
  it('shows the weekly-quota message verbatim and keeps the sheet open', async () => {
    const error = { graphQLErrors: [{ message: 'You have already skip 2 days this week.' }] };
    const vm = ctx({ $apollo: { mutate: jest.fn(() => Promise.reject(error)) } });
    call('onConfirm', vm, { skip: true, reason: '' });
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.errorMessage).toBe('You have already skip 2 days this week.');
    expect(vm.$emit).not.toHaveBeenCalledWith('close');
  });

  it('rolls the store back and releases the guard', async () => {
    const vm = ctx({ $apollo: { mutate: jest.fn(() => Promise.reject(new Error('offline'))) } });
    call('onConfirm', vm, { skip: true, reason: '' });
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.$routine.setSkipDay).toHaveBeenNthCalledWith(1, true);
    expect(vm.$routine.setSkipDay).toHaveBeenNthCalledWith(2, false);
    expect(releaseEntity).toHaveBeenCalledWith('Routine', 'rd1');
    expect(vm.errorMessage).toContain("Couldn't change today's skip");
  });
});

describe('SkipDayContainer — before the day has loaded', () => {
  it('explains itself instead of firing a mutation with no id', () => {
    const vm = ctx({ routineId: '' });
    call('onConfirm', vm, { skip: true, reason: '' });
    expect(vm.$apollo.mutate).not.toHaveBeenCalled();
    expect(vm.$routine.setSkipDay).not.toHaveBeenCalled();
    expect(vm.errorMessage).toContain("hasn't loaded yet");
  });
});

describe('SkipDayContainer — dismissal', () => {
  it('clears the error on the way out', () => {
    const vm = ctx({ errorMessage: 'nope' });
    call('close', vm);
    expect(vm.errorMessage).toBe('');
    expect(vm.$emit).toHaveBeenCalledWith('close');
  });

  it('clears the error on the way back in', () => {
    const vm = ctx({ errorMessage: 'nope' });
    Container.watch.open.call(vm, true);
    expect(vm.errorMessage).toBe('');
  });
});
