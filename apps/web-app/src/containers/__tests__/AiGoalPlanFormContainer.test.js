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
  const daysLeft = `${7 - moment().day()} days`;

  it('swaps an echoed rewrite back for the typed title', () => {
    const ctx = ctxFor(typed);
    const sent = ctx.modifyQueryPeriod(typed);
    expect(sent).toBe(`Ship the Routine Notes beta this ${daysLeft}`);
    expect(ctx.keepTypedTitle(sent, sent)).toBe(typed);
  });

  it('keeps a title the model genuinely wrote', () => {
    const ctx = ctxFor(typed);
    const sent = ctx.modifyQueryPeriod(typed);
    expect(ctx.keepTypedTitle('Beta release sprint', sent)).toBe('Beta release sprint');
  });

  it('leaves a title alone when nothing was rewritten', () => {
    const ctx = ctxFor('Ship the beta next week');
    const sent = ctx.modifyQueryPeriod('Ship the beta next week');
    expect(sent).toBe('Ship the beta next week');
    expect(ctx.keepTypedTitle('Beta launch plan', sent)).toBe('Beta launch plan');
  });
});
