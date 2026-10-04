/* eslint-env jest */
import Vue from 'vue';
import Vuetify from 'vuetify';
import NumericCard from './NumericCard.vue';

Vue.use(Vuetify);

// v-tooltip detaches its content to the [data-app] root; without it Vuetify
// logs "Unable to locate target [data-app]" on every mount.
document.body.setAttribute('data-app', 'true');

// D-13: /progress printed "15% Routine Efficiency" and never said what that
// was a percentage of. The formula travels on the card now, and the card has
// to offer it — otherwise the number is still unexplained.
const mountCard = (details) => new Vue({
  render: (h) => h(NumericCard, { props: { details } }),
}).$mount();

const efficiency = {
  id: 'efficiency',
  name: 'Routine Efficiency',
  value: '75%',
  description: "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.",
};

describe('NumericCard', () => {
  it('offers an info affordance carrying the formula behind the number', () => {
    const vm = mountCard(efficiency);

    expect(vm.$el.querySelector('.v-icon').textContent.trim()).toBe('info_outline');
    // The tooltip content is detached to [data-app], not left under the card.
    expect(document.body.textContent).toContain('Routine points earned');
  });

  it('leaves the card unchanged when the card has no formula to offer', () => {
    const vm = mountCard({ id: 'efficiency', name: 'Routine Efficiency', value: '75%' });

    expect(vm.$el.querySelector('.v-icon')).toBeNull();
    expect(vm.$el.textContent).toContain('Routine Efficiency');
  });

  it('still falls back to the loading placeholder with no details at all', () => {
    const vm = mountCard(undefined);

    expect(vm.$el.textContent).toContain('Loading...');
  });
});
