import Vue from 'vue';
import TimingReportCard from './TimingReportCard.vue';

const mount = (props) => {
  const opened = [];
  const vm = new Vue({
    render: (h) => h(TimingReportCard, { props, on: { 'open-routine': (id) => opened.push(id) } }),
  }).$mount();
  return { el: vm.$el, opened, vm };
};
const q = (el, id) => el.querySelector(`[data-testid="${id}"]`);

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
  index: i, label, rate: [90, 40, null, null, null, null, null][i],
}));
const routines = Array.from({ length: 7 }, (_, i) => ({
  id: `r${i}`, name: `Routine ${i}`, time: `0${i}:00`, onTime: i, late: 1, missed: 0, rate: 50,
}));

describe('MoleculeTimingReportCard', () => {
  const base = {
    totals: {
      onTime: 8, late: 2, missed: 0, pending: 1,
    },
    rate: 80,
    buckets: [
      {
        key: '1', label: 'M', title: 'Mon', onTime: 3, late: 1, missed: 0, pending: 0,
      },
      {
        key: '2', label: 'T', title: 'Tue', onTime: 0, late: 0, missed: 0, pending: 0, skip: true,
      },
    ],
    weekdays,
    routines,
    period: 'month',
  };

  it('leads with the rate and the period split', () => {
    const { el } = mount(base);
    expect(q(el, 'timing-report-rate').textContent).toContain('80%');
    expect(q(el, 'timing-report-onTime').textContent).toContain('8');
    expect(q(el, 'timing-report-missed')).toBeNull();
    expect(q(el, 'timing-report-bars').children).toHaveLength(2);
  });

  it('names the strongest and weakest weekday', () => {
    const { el } = mount(base);
    expect(q(el, 'timing-rhythm').textContent)
      .toBe('Strongest on Mon (90%), most slips on Tue (40%)');
  });

  it('lists five routines, expands to all, and opens one', async () => {
    const { el, opened } = mount(base);
    expect(el.querySelectorAll('[data-testid="timing-routine-row"]')).toHaveLength(5);
    q(el, 'timing-routine-more').click();
    await Vue.nextTick();
    expect(el.querySelectorAll('[data-testid="timing-routine-row"]')).toHaveLength(7);
    el.querySelector('[data-testid="timing-routine-row"]').click();
    expect(opened).toEqual(['r0']);
  });

  it('says when there is nothing yet', () => {
    const { el } = mount({ totals: {}, period: 'week' });
    expect(q(el, 'timing-report-empty').textContent).toContain('No check-ins in this week yet');
  });
});
