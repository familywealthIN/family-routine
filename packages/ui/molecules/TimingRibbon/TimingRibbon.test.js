import Vue from 'vue';
import TimingRibbon from './TimingRibbon.vue';

const render = (props) => new Vue({ render: (h) => h(TimingRibbon, { props }) }).$mount().$el;
const q = (el, id) => el.querySelector(`[data-testid="${id}"]`);

const slots = [
  {
    id: 'a', name: 'Wake', time: '06:00', state: 'onTime',
  },
  {
    id: 'b', name: 'Work', time: '09:00', state: 'late',
  },
  {
    id: 'c', name: 'Gym', time: '19:30', state: 'pending',
  },
];

describe('MoleculeTimingRibbon', () => {
  it('draws one segment per routine and marks the next one to come', () => {
    const el = render({
      slots,
      counts: {
        onTime: 1, late: 1, missed: 0, pending: 1,
      },
      nextIndex: 2,
    });
    expect(q(el, 'timing-ribbon-score').textContent.replace(/\s+/g, ' ').trim()).toBe('1/3 on time');
    expect(el.querySelectorAll('.rn-tr__seg')).toHaveLength(3);
    expect(q(el, 'timing-seg-2').classList.contains('rn-tr__seg--next')).toBe(true);
    expect(q(el, 'timing-seg-1').getAttribute('title')).toBe('Work · 09:00 · late');
    // Only what happened today is in the legend.
    expect(q(el, 'timing-key-missed')).toBeNull();
    expect(q(el, 'timing-key-late').textContent).toContain('1 late');
  });

  it('shows the week rate and which way it moved', () => {
    const el = render({ slots, counts: { onTime: 1 }, rate: 82, delta: -6 });
    expect(q(el, 'timing-ribbon-week').textContent).toContain('82%');
    expect(q(el, 'timing-ribbon-delta').textContent).toContain('▼ 6 vs last week');
  });

  it('says so on a rest day instead of drawing an empty ribbon', () => {
    const el = render({ skip: true, rate: null });
    expect(q(el, 'timing-ribbon-rest')).not.toBeNull();
    expect(q(el, 'timing-ribbon-week')).toBeNull();
  });
});
