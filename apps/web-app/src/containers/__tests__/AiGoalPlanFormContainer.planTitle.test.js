/* eslint-env jest */
/**
 * AiGoalPlanFormContainer — the plan title the goal builder hands to the form.
 *
 * Methods run against a stub context; the organism is not under test. The
 * mutation stub echoes the objective it was given back as the plan title,
 * which is what the model does in practice.
 */
jest.mock('@routine-notes/ui/organisms/AiGoalPlanForm/AiGoalPlanForm.vue', () => ({
  __esModule: true,
  default: { name: 'AiGoalPlanForm', render() {} },
}));

const Container = require('../AiGoalPlanFormContainer.vue').default;

const TYPED = 'Ship the Routine Focus beta this week';

const makeCtx = (searchQuery) => {
  const mutate = jest.fn(({ variables }) => Promise.resolve({
    data: {
      generateMilestonePlan: {
        period: 'week',
        // The model echoes the objective string it was prompted with.
        title: variables.query,
        description: 'Plan rationale',
        entries: [{
          period: 'day',
          periodName: 'Sunday',
          date: '04-10-2026',
          title: 'Cut the release branch',
          description: 'Tag and smoke test.',
        }],
      },
    },
  }));

  const ctx = {
    searchQuery,
    selectedPeriod: 'week',
    selectedTaskRef: 'rp',
    tasklist: [],
    parentGoalContext: null,
    dashboardContext: null,
    loading: false,
    milestoneData: null,
    $apollo: { mutate },
    $emit: jest.fn(),
  };
  Object.keys(Container.methods).forEach((name) => {
    ctx[name] = Container.methods[name].bind(ctx);
  });
  return ctx;
};

describe('AiGoalPlanFormContainer.handleSearchGoals plan title', () => {
  it('keeps the typed objective as the plan title instead of the period rewrite', async () => {
    const ctx = makeCtx(TYPED);
    await ctx.handleSearchGoals();

    expect(ctx.milestoneData.title).toBe(TYPED);
    expect(ctx.$emit).toHaveBeenCalledWith('search-complete', {
      milestoneData: ctx.milestoneData,
      selectedGoalPeriod: 'week',
    });
  });

  it('still sends the planner the explicit day count for the horizon', async () => {
    const ctx = makeCtx(TYPED);
    await ctx.handleSearchGoals();

    const { query } = ctx.$apollo.mutate.mock.calls[0][0].variables;
    expect(query).toMatch(/\bdays\b/);
    expect(query).not.toMatch(/\bweek\b/);
  });

  it('trims surrounding whitespace off the typed objective', async () => {
    const ctx = makeCtx(`  ${TYPED}  `);
    await ctx.handleSearchGoals();

    expect(ctx.milestoneData.title).toBe(TYPED);
  });
});
