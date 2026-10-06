/* eslint-env jest */
/**
 * WelcomeWizard — the step machine.
 *
 * The redesign turned a fixed six-step Vuetify stepper with a name screen
 * bolted on in front into one flow whose length depends on the account: an
 * Apple user who arrives without a usable name gets "Your name" as step 1, a
 * Google user never sees it. Everything that used to say 6 — the counter, the
 * progress rail, `nextStep`, and the analytics step names — reads the steps
 * array now, so these pin that it stays consistent for both shapes.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const session = { name: 'Gaurav Panchal', email: 'someone@example.com' };
jest.mock('../../token', () => ({
  // eslint-disable-next-line global-require
  getSessionItem: (key) => (key === 'name' ? session.name : session.email),
}));

const WelcomeWizard = require('../WelcomeWizard.vue').default;

const { computed, methods } = WelcomeWizard;

/** `this` for the step machine, with the computed chain resolved by hand. */
const wizard = (overrides = {}) => {
  const vm = {
    currentStep: 1,
    creating: false,
    displayName: '',
    nameTouched: false,
    tracked: [],
    trackUserInteraction(event) { this.tracked.push(event); },
    ...overrides,
  };
  Object.defineProperties(vm, {
    needsName: { get: () => computed.needsName.call(vm) },
    steps: { get: () => computed.steps.call(vm) },
    step: { get: () => computed.step.call(vm) },
    isLastStep: { get: () => computed.isLastStep.call(vm) },
    nameValid: { get: () => computed.nameValid.call(vm) },
    canAdvance: { get: () => computed.canAdvance.call(vm) },
  });
  vm.nextStep = methods.nextStep.bind(vm);
  vm.previousStep = methods.previousStep.bind(vm);
  vm.getStepName = methods.getStepName.bind(vm);
  vm.advance = methods.advance.bind(vm);
  return vm;
};

const asApple = (name) => {
  session.name = name;
  session.email = 'abc123@privaterelay.appleid.com';
};
const asGoogle = () => {
  session.name = 'Gaurav Panchal';
  session.email = 'someone@example.com';
};

afterEach(asGoogle);

describe('WelcomeWizard — who gets the name step', () => {
  it('asks an account with no name at all', () => {
    asApple('');
    expect(wizard().needsName).toBe(true);
  });

  it('asks when Apple handed over its placeholder', () => {
    asApple('Apple User');
    expect(wizard().needsName).toBe(true);
  });

  it('asks when the name is only the private-relay email local part', () => {
    asApple('abc123');
    expect(wizard().needsName).toBe(true);
  });

  it('does not ask a Google account, which always returns a real name', () => {
    expect(wizard().needsName).toBe(false);
  });
});

describe('WelcomeWizard — the flow length follows the account', () => {
  it('is six steps for an account that already has a name', () => {
    const vm = wizard();
    expect(vm.steps).toHaveLength(6);
    expect(vm.steps[0].key).toBe('sleep');
  });

  it('is seven, opening on the name, for one that does not', () => {
    asApple('Apple User');
    const vm = wizard();
    expect(vm.steps).toHaveLength(7);
    expect(vm.steps[0].key).toBe('name');
  });

  it('stops at the end of the flow, not at a hardcoded 6', () => {
    asApple('Apple User');
    const vm = wizard({ currentStep: 7 });
    vm.nextStep();
    expect(vm.currentStep).toBe(7);
    expect(vm.isLastStep).toBe(true);
  });

  it('knows the last step is the sixth when there is no name step', () => {
    expect(wizard({ currentStep: 6 }).isLastStep).toBe(true);
    expect(wizard({ currentStep: 5 }).isLastStep).toBe(false);
  });

  it('never walks back past the first step', () => {
    const vm = wizard();
    vm.previousStep();
    expect(vm.currentStep).toBe(1);
  });

  /*
   * The funnel is the reason this is not just an index: adding the name step
   * shifts every later number by one, and the event names must not shift too.
   */
  it('reports the same analytics names whichever shape the flow has', () => {
    const google = wizard();
    expect([1, 2, 3, 4, 5, 6].map((n) => google.getStepName(n))).toEqual([
      'sleep_schedule', 'work_hours', 'morning_routine',
      'evening_activities', 'points_intro', 'complete_setup',
    ]);

    asApple('Apple User');
    const apple = wizard();
    expect([1, 2, 7].map((n) => apple.getStepName(n)))
      .toEqual(['name_capture', 'sleep_schedule', 'complete_setup']);
  });

  it('says "unknown" for a step number off the end', () => {
    expect(wizard().getStepName(99)).toBe('unknown');
  });
});

describe('WelcomeWizard — the name step', () => {
  beforeEach(() => asApple('Apple User'));

  it('holds the flow on an empty name and says why', () => {
    const vm = wizard();
    vm.advance();
    expect(vm.currentStep).toBe(1);
    expect(computed.nameError.call(vm)).toBe('Please enter your name.');
  });

  it('holds on a one-character name', () => {
    const vm = wizard({ displayName: 'A' });
    vm.advance();
    expect(vm.currentStep).toBe(1);
    expect(computed.nameError.call(vm)).toContain('two characters');
  });

  it('holds on a name past 60 characters', () => {
    const vm = wizard({ displayName: 'a'.repeat(61) });
    vm.advance();
    expect(vm.currentStep).toBe(1);
    expect(computed.nameError.call(vm)).toContain('60 characters');
  });

  it('says nothing before the first press', () => {
    expect(computed.nameError.call(wizard())).toBe('');
  });

  it('trims the name, moves on, and reports it to the funnel', () => {
    const vm = wizard({ displayName: '  Alex  ' });
    vm.advance();
    expect(vm.displayName).toBe('Alex');
    expect(vm.currentStep).toBe(2);
    expect(vm.tracked).toContain('onboarding_name_submitted');
  });

  /* Next is never greyed out — a disabled primary action on the app's first
     screen says no without saying why. */
  it('leaves the button live so the press can explain itself', () => {
    expect(wizard().canAdvance).toBe(true);
    expect(wizard({ creating: true }).canAdvance).toBe(false);
  });
});

describe('WelcomeWizard — the footer button', () => {
  it('saves on the last step instead of advancing', () => {
    const calls = [];
    const vm = wizard({ currentStep: 6, completeOnboarding: () => calls.push('save') });
    vm.advance();
    expect(calls).toEqual(['save']);
    expect(vm.currentStep).toBe(6);
  });

  it('advances everywhere else', () => {
    const calls = [];
    const vm = wizard({ currentStep: 2, completeOnboarding: () => calls.push('save') });
    vm.advance();
    expect(calls).toEqual([]);
    expect(vm.currentStep).toBe(3);
  });

  it('labels itself for what it is about to do', () => {
    const label = (vm) => computed.advanceLabel.call(vm);
    expect(label(wizard({ currentStep: 2 }))).toBe('Next');
    expect(label(wizard({ currentStep: 6 }))).toBe('Create my routine');
    expect(label(wizard({ currentStep: 6, creating: true }))).toBe('Creating your routine…');
  });
});

describe('WelcomeWizard — the progress rail', () => {
  it('fills by step over the flow actually being shown', () => {
    expect(computed.progressPct.call(wizard({ currentStep: 3 }))).toBeCloseTo(50, 5);
    expect(computed.progressPct.call(wizard({ currentStep: 6 }))).toBe(100);

    asApple('Apple User');
    expect(computed.progressPct.call(wizard({ currentStep: 7 }))).toBe(100);
  });
});

describe('WelcomeWizard — the activity steps share one body', () => {
  const vm = (step, selections = {}) => ({
    step: { key: step },
    selectedMorningActivities: selections.morning || [],
    selectedEveningActivities: selections.evening || [],
    schedule: { workStart: '09:00', sleepTime: '23:00' },
    isMorningRoutineOvertime: () => false,
    isEveningRoutineOvertime: () => true,
    getAvailableMorningTime: () => 165,
    getAvailableEveningTime: () => 120,
    getMorningStartTime: () => '06:15',
    getEveningStartTime: () => '17:00',
  });

  it('resolves the window and the overrun for whichever step is showing', () => {
    expect(computed.stepOvertime.call(vm('morning'))).toBe(false);
    expect(computed.stepAvailableMinutes.call(vm('morning'))).toBe(165);
    expect(computed.stepWindowLabel.call(vm('morning'))).toBe('06:15 and 09:00');

    expect(computed.stepOvertime.call(vm('evening'))).toBe(true);
    expect(computed.stepAvailableMinutes.call(vm('evening'))).toBe(120);
    expect(computed.stepWindowLabel.call(vm('evening'))).toBe('17:00 and 23:00');
  });

  it('is inert on a step that has no activities', () => {
    expect(computed.stepOvertime.call(vm('points'))).toBe(false);
    expect(computed.stepWindowLabel.call(vm('points'))).toBe('');
  });

  it('reads the right selection list per step', () => {
    const state = vm('morning', { morning: ['jogging'], evening: ['dinner'] });
    expect(methods.selectedFor.call(state, 'morning')).toEqual(['jogging']);
    expect(methods.isSelected.call({ ...state, selectedFor: methods.selectedFor }, 'evening', 'dinner'))
      .toBe(true);
    expect(methods.isSelected.call({ ...state, selectedFor: methods.selectedFor }, 'morning', 'dinner'))
      .toBe(false);
  });
});
