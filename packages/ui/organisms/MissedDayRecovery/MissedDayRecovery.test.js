/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const Vue = require('vue');
const Vuetify = require('vuetify');

const MissedDayRecovery = require('./MissedDayRecovery.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const MISSED_DAY = { date: '15-09-2026', weekday: 'Tuesday' };

const render = (props = {}) => {
  const opened = [];
  const dismissed = [];
  const vm = new Vue({
    render: (h) => h(MissedDayRecovery, {
      props,
      on: {
        'open-day': (date) => opened.push(date),
        dismiss: (date) => dismissed.push(date),
      },
    }),
  }).$mount();
  return { el: vm.$el, opened, dismissed };
};

const text = (el) => el.textContent.replace(/\s+/g, ' ');

const buttonLabelled = (el, label) => Array.from(el.querySelectorAll('button'))
  .find((node) => node.textContent.replace(/\s+/g, ' ').includes(label));

describe('OrganismMissedDayRecovery', () => {
  describe('Component contract', () => {
    it('has the correct component name', () => {
      expect(MissedDayRecovery.name).toBe('OrganismMissedDayRecovery');
    });

    it('defines missedDay as an Object defaulting to null', () => {
      expect(MissedDayRecovery.props.missedDay.type).toBe(Object);
      expect(MissedDayRecovery.props.missedDay.default).toBe(null);
    });
  });

  // D-17: the app never said anything about a day that got away.
  describe('Acknowledgement', () => {
    it('names the missed day', () => {
      const { el } = render({ missedDay: MISSED_DAY });
      expect(text(el)).toContain('Tuesday went unlogged');
    });

    it('renders nothing at all when no day was missed', () => {
      // A clean week must cost no space on the dashboard — Vue leaves only the
      // v-if placeholder comment, so the page's margins land on nothing.
      const { el } = render();
      expect(el.nodeType).toBe(8);
      expect(el.tagName).toBeUndefined();
    });
  });

  describe('Recovery option', () => {
    it('offers to pick the missed day back up and says which day', () => {
      const { el, opened } = render({ missedDay: MISSED_DAY });
      const action = buttonLabelled(el, 'Pick Tuesday back up');

      expect(action).toBeDefined();
      action.click();
      expect(opened).toEqual(['15-09-2026']);
    });

    it('lets the day be set aside without acting on it', () => {
      const { el, dismissed } = render({ missedDay: MISSED_DAY });
      buttonLabelled(el, 'Not now').click();

      expect(dismissed).toEqual(['15-09-2026']);
    });
  });
});
