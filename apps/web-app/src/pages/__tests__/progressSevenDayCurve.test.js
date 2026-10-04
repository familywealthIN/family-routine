/* eslint-env jest */
/**
 * D-27: the curve above /progress ran backwards through the week.
 * `routineSevenDays` resolves with `.sort({ $natural: -1 }).limit(7)` — newest
 * first — and the page plotted it in query order, so the left of the chart was
 * the most recent day.
 *
 * Computeds are exercised against a minimal vm-like context (no mount),
 * matching the routineEfficiencySource convention.
 */
// ProgressTime pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the curve.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const ProgressTime = require('../ProgressTime.vue').default;

const day = (date, points) => ({ date, tasklist: [{ points, ticked: true }] });

const context = (routineSevenDays) => {
  const vm = { routineSevenDays, countTotal: ProgressTime.methods.countTotal };
  vm.sevenDaysByDate = ProgressTime.computed.sevenDaysByDate.call(vm);
  return vm;
};

describe('ProgressTime seven-day curve', () => {
  it('plots the days oldest-first whatever order the query returns them in', () => {
    const vm = context([day('22-08-2026', 30), day('20-08-2026', 10), day('21-08-2026', 20)]);

    expect(ProgressTime.computed.avg.call(vm)).toBe(20);
    expect(vm.graphArray).toEqual([10, 20, 30]);
  });

  it('leaves the query result itself alone', () => {
    const routineSevenDays = [day('22-08-2026', 30), day('20-08-2026', 10)];
    context(routineSevenDays);

    expect(routineSevenDays.map((routine) => routine.date)).toEqual(['22-08-2026', '20-08-2026']);
  });

  it('asks getProgress for the text that spells out the radar axes', () => {
    const { body } = ProgressTime.apollo.progress.query.loc.source;

    expect(body).toMatch(/values\s*\{[^}]*description/);
  });
});
