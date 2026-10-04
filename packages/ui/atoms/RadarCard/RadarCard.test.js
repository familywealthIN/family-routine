/* eslint-env jest */
import Vue from 'vue';
import Vuetify from 'vuetify';

// vue-radar ships a raw .vue file inside node_modules, which jest does not
// transform. The legend is drawn by this card, not by the chart.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));

// eslint-disable-next-line import/first
import RadarCard from './RadarCard.vue';

Vue.use(Vuetify);

// v-tooltip detaches its content to the [data-app] root; without it Vuetify
// logs "Unable to locate target [data-app]" on every mount.
document.body.setAttribute('data-app', 'true');

// D-27: the radar's axes were the bare letters D / G / K with nothing to read
// them against. vue-radar labels an axis with `name.slice(0, 2)`, so the axes
// have to stay initials — the card spells them out underneath instead.
const mountCard = (propsData) => new Vue({
  render: (h) => h(RadarCard, { props: propsData }),
}).$mount();

const stats = [
  { name: 'D', description: 'Discipline', value: 12 },
  { name: 'K', description: 'Kinetics', value: 77 },
  { name: 'G', description: 'Geniuses', value: 44 },
];

describe('RadarCard', () => {
  it('spells out every axis initial with its value', () => {
    const text = mountCard({ title: 'Radar Chart', details: stats }).$el.textContent;

    expect(text).toContain('Discipline');
    expect(text).toContain('Kinetics');
    expect(text).toContain('Geniuses');
    expect(text).toContain('77');
  });

  it('falls back to the initial when a stat arrives without its full name', () => {
    const text = mountCard({ title: 'Radar Chart', details: [{ name: 'D', value: 12 }] }).$el
      .textContent;

    expect(text).toContain('D');
    expect(text).toContain('12');
  });

  it('offers the formula behind the numbers when the card carries one', () => {
    mountCard({ title: 'Radar Chart', description: 'Points earned per day on average.', details: stats });

    // The tooltip content is detached to [data-app], not left under the card.
    expect(document.body.textContent).toContain('Points earned per day on average.');
  });

  it('renders without a details array at all', () => {
    expect(() => mountCard({ title: 'Radar Chart' })).not.toThrow();
  });
});
