/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const Vue = require('vue');
const Vuetify = require('vuetify');

const WeekGoalStreak = require('./WeekGoalStreak.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

// The beta week from the report: a week goal with two items, both carrying the
// seven calendar days D-11 put on the wire.
const makeWeekGoals = () => [
  {
    id: 'goal-week-1',
    period: 'week',
    date: '20-09-2026',
    goalItems: [
      {
        id: 'gi-w1',
        body: 'Beta Validation Daily Sweep',
        milestoneDays: [
          { date: '20-09-2026', status: 'complete' },
          { date: '21-09-2026', status: 'complete' },
          { date: '22-09-2026', status: 'missed' },
          { date: '23-09-2026', status: 'upcoming' },
          { date: '24-09-2026', status: 'upcoming' },
          { date: '25-09-2026', status: 'upcoming' },
          { date: '26-09-2026', status: 'upcoming' },
        ],
      },
      {
        id: 'gi-w2',
        body: 'Morning Checkpoints',
        milestoneDays: [{ date: '20-09-2026', status: 'complete' }],
      },
    ],
  },
];

const render = (props = {}) => {
  const retries = [];
  const vm = new Vue({
    render: (h) => h(WeekGoalStreak, { props, on: { retry: () => retries.push(true) } }),
  }).$mount();
  return { el: vm.$el, retries };
};

const text = (el) => el.textContent.replace(/\s+/g, ' ');

describe('OrganismWeekGoalStreak', () => {
  describe('Component contract', () => {
    it('has the correct component name', () => {
      expect(WeekGoalStreak.name).toBe('OrganismWeekGoalStreak');
    });

    it('defines error and retrying as Booleans defaulting to false', () => {
      expect(WeekGoalStreak.props.error.type).toBe(Boolean);
      expect(WeekGoalStreak.props.error.default).toBe(false);
      expect(WeekGoalStreak.props.retrying.type).toBe(Boolean);
      expect(WeekGoalStreak.props.retrying.default).toBe(false);
    });
  });

  // D-11: one labelled node per calendar day, the miss red in its own slot.
  // D-03 moved which goals reach this organism, so re-assert what it draws.
  describe('Streak nodes', () => {
    it('draws one labelled node per calendar day of the week', () => {
      const { el } = render({ weekGoals: makeWeekGoals() });
      const labels = Array.from(el.querySelectorAll('.streak-checks__label'))
        .map((node) => node.textContent.trim());

      expect(labels.slice(0, 7))
        .toEqual(['Su 20', 'Mo 21', 'Tu 22', 'We 23', 'Th 24', 'Fr 25', 'Sa 26']);
    });

    it('breaks the connectors either side of the missed day', () => {
      const { el } = render({ weekGoals: makeWeekGoals() });
      const links = Array.from(el.querySelectorAll('.streak-checks__link--unbroken, .streak-checks__link--broken'))
        .map((node) => (node.className.includes('--unbroken') ? 'unbroken' : 'broken'));

      expect(links.slice(0, 6))
        .toEqual(['unbroken', 'broken', 'broken', 'broken', 'broken', 'broken']);
    });

    it('numbers each goal item of a multi-item week goal', () => {
      const { el } = render({ weekGoals: makeWeekGoals() });
      expect(text(el)).toContain('Goal 1 of 2');
      expect(text(el)).toContain('Goal 2 of 2');
    });

    it('says so when an item has no milestone days rather than drawing nothing', () => {
      const { el } = render({
        weekGoals: [{ id: 'goal-week-1', goalItems: [{ id: 'gi-w1', body: 'No days' }] }],
      });
      expect(text(el)).toContain('Streak not available for this week');
    });
  });

  // D-03: the card used to vanish whenever it had nothing to draw, so a failed
  // goals load was indistinguishable from a week with no goal.
  describe('Load error state', () => {
    it('renders the error state when the week goals failed to load', () => {
      const { el } = render({ error: true });
      expect(el.querySelector('.load-error-state')).not.toBeNull();
      expect(text(el)).toContain('Nothing has been deleted');
    });

    it('offers a retry the page can act on', () => {
      const { el, retries } = render({ error: true });
      const retry = el.querySelector('.load-error-state__retry');
      expect(retry).not.toBeNull();
      retry.click();
      expect(retries).toHaveLength(1);
    });

    it('spins the retry while the page is already retrying', () => {
      const { el } = render({ error: true, retrying: true });
      expect(el.querySelector('.load-error-state__retry').className).toContain('v-btn--loader');
    });

    it('keeps showing the goals we already hold when a refetch fails', () => {
      const { el } = render({ error: true, weekGoals: makeWeekGoals() });
      expect(el.querySelector('.load-error-state')).toBeNull();
      expect(text(el)).toContain('Beta Validation Daily Sweep');
    });

    it('never shows the error state when nothing failed', () => {
      const { el } = render({ weekGoals: makeWeekGoals() });
      expect(el.querySelector('.load-error-state')).toBeNull();
    });
  });
});
