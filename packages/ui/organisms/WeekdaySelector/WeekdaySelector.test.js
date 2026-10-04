/* eslint-env jest */

// D-24: a missed day scores nothing, exactly like a day that has not happened
// yet, so the strip drew the two identically. These pin the one thing that now
// tells them apart.

const Vue = require('vue');

const WeekdaySelector = require('./WeekdaySelector.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

// A Sunday-start week: 13-09-2026 .. 19-09-2026. Today is Wednesday the 16th,
// Tuesday the 15th got away, Friday the 18th has not happened yet.
const TODAY = '16-09-2026';
const MISSED = '15-09-2026';
const FUTURE = '18-09-2026';

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(WeekdaySelector, { props: { selectedDate: TODAY, ...props } }),
  }).$mount();
  return vm.$el;
};

// The strip builds its columns in Sunday-first order, so the date's weekday
// index is its column index.
const column = (el, date) => el.querySelectorAll('.day-column')[Number(date.slice(0, 2)) - 13];

const tracks = (col) => Array.from(col.querySelectorAll('circle')).slice(0, 3);

describe('OrganismWeekdaySelector', () => {
  it('defines missedDates as an Array defaulting to empty', () => {
    expect(WeekdaySelector.props.missedDates.type).toBe(Array);
    expect(WeekdaySelector.props.missedDates.default()).toEqual([]);
  });

  it('marks a missed day so it cannot be read as a day still to come', () => {
    const el = render({ missedDates: [MISSED] });
    const missed = column(el, MISSED);
    const future = column(el, FUTURE);

    expect(missed.classList.contains('missed')).toBe(true);
    expect(future.classList.contains('missed')).toBe(false);

    // Both days score nothing, so the empty rings are identical — the track is
    // what differs, by colour and by dash.
    tracks(missed).forEach((track) => {
      expect(track.getAttribute('stroke')).toBe('rgba(245,124,0,0.45)');
      expect(track.getAttribute('stroke-dasharray')).toBe('2 3');
    });
    tracks(future).forEach((track) => {
      expect(track.getAttribute('stroke')).toBe('rgba(0,0,0,0.08)');
      expect(track.hasAttribute('stroke-dasharray')).toBe(false);
    });
  });

  it('says which day went unlogged, so the state is not colour alone', () => {
    const el = render({ missedDates: [MISSED] });

    expect(column(el, MISSED).getAttribute('title')).toBe('Tuesday went unlogged');
    expect(column(el, FUTURE).hasAttribute('title')).toBe(false);
  });

  it('leaves every day unmarked when the week holds no missed day', () => {
    const el = render();

    expect(el.querySelectorAll('.day-column.missed').length).toBe(0);
  });
});
