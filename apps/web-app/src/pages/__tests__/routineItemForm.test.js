/* eslint-env jest */
/**
 * D-11: the New Item form's SAVE sat disabled with nothing on screen saying why.
 *
 * Description carried a required rule but no required marker, so a form filled
 * to the markers it does show never went valid, and the drawer's disabled SAVE
 * never ran the validation that would have printed the reason.
 *
 * Rules and methods are exercised against a minimal vm-like context (no mount),
 * matching the page test convention.
 */
// The page pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the validation.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const SettingsTime = require('../SettingsTime.vue').default;

// The rules close over the vm for maxInputPoints, so build the two together.
const formVm = (editedItem, pointsLeft = 10) => {
  const vm = { maxInputPoints: () => pointsLeft };
  return Object.assign(vm, SettingsTime.data.call(vm), { editedItem });
};

const item = (overrides) => ({
  name: 'Wake up',
  description: '',
  time: '06:30',
  points: 1,
  ...overrides,
});

const errorsFor = (editedItem, pointsLeft) => SettingsTime.methods.formErrors
  .call(formVm(editedItem, pointsLeft));

describe('routine item form rules', () => {
  // An item with no failing rule is one every input reports valid for, which
  // is what turns the form — and so SAVE — green.
  it('accepts an item filled to the fields the form marks required', () => {
    expect(errorsFor(item())).toEqual([]);
  });

  it('no longer demands a description', () => {
    expect(formVm(item()).descriptionRules.map((rule) => rule(''))).toEqual([true]);
  });

  it('still caps the length of a description that is given', () => {
    expect(errorsFor(item({ description: 'd'.repeat(256) })))
      .toEqual(['Description must be less than 255 characters']);
  });

  it('still requires the name', () => {
    expect(errorsFor(item({ name: '' }))).toEqual(['Name is required']);
  });

  it('still requires the time', () => {
    expect(errorsFor(item({ time: '' }))).toEqual(['Time is required']);
  });

  it('names points once, not twice, when they are left at zero', () => {
    expect(errorsFor(item({ points: 0 }))).toEqual(['points is required']);
  });

  it('names the points budget rather than the name length when it is blown', () => {
    expect(errorsFor(item({ points: 5 }), 1)).toEqual(['Points must be 1 or fewer']);
  });

  it('collects every missing field, not just the first', () => {
    expect(errorsFor(item({ name: '', time: '' })))
      .toEqual(['Name is required', 'Time is required']);
  });
});

describe('routine item save', () => {
  const saveVm = (formValid, overrides = {}) => ({
    $refs: { form: { validate: () => formValid } },
    $notify: jest.fn(),
    formErrors: () => ['Name is required', 'Time is required'],
    editedIndex: -1,
    buttonLoading: false,
    addRoutineItem: jest.fn(),
    updateRoutineItem: jest.fn(),
    ...overrides,
  });

  it('says what is missing instead of refusing silently', () => {
    const vm = saveVm(false);

    SettingsTime.methods.save.call(vm);

    expect(vm.$notify).toHaveBeenCalledTimes(1);
    expect(vm.$notify.mock.calls[0][0].text).toBe('Name is required. Time is required');
    expect(vm.addRoutineItem).not.toHaveBeenCalled();
    expect(vm.buttonLoading).toBe(false);
  });

  it('adds the item once the form validates', () => {
    const vm = saveVm(true);

    SettingsTime.methods.save.call(vm);

    expect(vm.addRoutineItem).toHaveBeenCalledTimes(1);
    expect(vm.$notify).not.toHaveBeenCalled();
    expect(vm.buttonLoading).toBe(true);
  });

  it('updates the item it was opened on', () => {
    const vm = saveVm(true, { editedIndex: 2 });

    SettingsTime.methods.save.call(vm);

    expect(vm.updateRoutineItem).toHaveBeenCalledTimes(1);
    expect(vm.addRoutineItem).not.toHaveBeenCalled();
  });
});

// D-03: a card's daily task target is the gap to the next item at one task per
// two hours, so moving Wind-down to 21:30 took Start Work from 0/1 to 0/6 with
// nothing on screen saying it had.
describe('routine item time edit', () => {
  const before = [
    { id: 'start-work', name: 'Start Work', time: '09:00' },
    { id: 'wind-down', name: 'Wind-down', time: '11:30' },
  ];

  it('names the other item whose target the new time moved', () => {
    const vm = { $notify: jest.fn() };
    const after = [before[0], { ...before[1], time: '21:30' }];

    SettingsTime.methods.notifySlotChanges.call(vm, before, after);

    expect(vm.$notify).toHaveBeenCalledTimes(1);
    expect(vm.$notify.mock.calls[0][0].text)
      .toContain('Start Work: 1 -> 6');
  });

  it('stays quiet when the edit moves no target', () => {
    const vm = { $notify: jest.fn() };
    const after = [{ ...before[0], name: 'Deep Work' }, before[1]];

    SettingsTime.methods.notifySlotChanges.call(vm, before, after);

    expect(vm.$notify).not.toHaveBeenCalled();
  });
});
