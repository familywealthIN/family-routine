/* eslint-env jest */
import Vue from 'vue';
import Vuetify from 'vuetify';
import TasksCompletedCard from './TasksCompletedCard.vue';

Vue.use(Vuetify);

// v-tooltip detaches its content to the [data-app] root; without it Vuetify
// logs "Unable to locate target [data-app]" on every mount.
document.body.setAttribute('data-app', 'true');

// D-27: "Routine Items 1/7" sat beside a WEEK toggle with nothing saying what
// window it covered. The card now states it, the same way NumericCard does.
const mountCard = (details) => new Vue({
  render: (h) => h(TasksCompletedCard, { props: { details } }),
}).$mount();

const details = {
  id: 'task-activities',
  name: 'Task and Activities Completed',
  description: 'Completed out of available over this week so far.',
  values: [
    { name: 'Routine Items', value: 3, total: 4 },
    { name: 'Tasks', value: 2, total: 8 },
  ],
};

describe('TasksCompletedCard', () => {
  it('offers the window the counts cover behind an info affordance', () => {
    const vm = mountCard(details);

    expect(vm.$el.querySelector('.v-icon').textContent.trim()).toBe('info_outline');
    // The tooltip content is detached to [data-app], not left under the card.
    expect(document.body.textContent).toContain('over this week so far');
  });

  it('leaves the card unchanged when there is nothing to explain', () => {
    const vm = mountCard({ ...details, description: undefined });

    expect(vm.$el.querySelector('.v-icon')).toBeNull();
    expect(vm.$el.textContent).toContain('3/4');
  });
});
