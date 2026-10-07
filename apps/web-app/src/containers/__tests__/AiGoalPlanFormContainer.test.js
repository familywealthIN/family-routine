/* eslint-env jest */
/**
 * AiGoalPlanFormContainer — the plan title must stay what the user typed.
 *
 * modifyQueryPeriod rewrites "this week" into "this N days" for the planner,
 * and the server echoes the query back as the plan title, which is saved as
 * the parent goal (D-15).
 */
jest.mock(
  '@routine-notes/ui/organisms/AiGoalPlanForm/AiGoalPlanForm.vue',
  () => ({ __esModule: true, default: { name: 'AiGoalPlanForm', render() {} } }),
  { virtual: true },
);

const moment = require('moment');
const Container = require('../AiGoalPlanFormContainer.vue').default;

const ctxFor = (searchQuery) => {
  const ctx = { searchQuery };
  Object.keys(Container.methods).forEach((name) => {
    ctx[name] = Container.methods[name].bind(ctx);
  });
  return ctx;
};

describe('AiGoalPlanFormContainer.keepTypedTitle', () => {
  const typed = 'Ship the Routine Notes beta this week';

  it('still rewrites the period for the planner', () => {
    expect(ctxFor(typed).modifyQueryPeriod(typed))
      .toBe(`Ship the Routine Notes beta this ${7 - moment().day()} days`);
  });

  it('keeps the typed text over an echoed rewrite', () => {
    const ctx = ctxFor(typed);
    expect(ctx.keepTypedTitle(ctx.modifyQueryPeriod(typed))).toBe(typed);
  });

  it('keeps the typed text over a title the model wrote', () => {
    expect(ctxFor(`  ${typed} `).keepTypedTitle('Ship Routine Notes Beta')).toBe(typed);
  });

  it('falls back to the model title only when nothing was typed', () => {
    expect(ctxFor('').keepTypedTitle('Beta launch plan')).toBe('Beta launch plan');
  });
});
