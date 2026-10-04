/* eslint-env jest */

// D-28: the item detail dialog counted "1 sub tasks", and spelled the concept
// "sub tasks" where GoalItemList spells it "subtasks".

// The atoms barrel reaches vue-radar, whose .vue entry point is shipped
// untransformed and cannot be parsed here.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');
const Vuetify = require('vuetify');

const SubTaskItemList = require('./SubTaskItemList.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const subTask = (index) => ({ id: `s${index}`, body: `Step ${index}`, isComplete: false });

const count = (subTasks) => {
  const vm = new Vue({
    render: (h) => h(SubTaskItemList, { props: { subTasks } }),
  }).$mount();
  return vm.$el.querySelector('.v-subheader').textContent.trim();
};

describe('SubTaskItemList count', () => {
  it('says "1 subtask" for a single sub task', () => {
    expect(count([subTask(1)])).toBe('1 subtask');
  });

  it('says "2 subtasks" for more than one', () => {
    expect(count([subTask(1), subTask(2)])).toBe('2 subtasks');
  });

  it('says so when there are none, with or without a list', () => {
    expect(count([])).toBe('You have 0 subtasks');
    expect(count(undefined)).toBe('You have 0 subtasks');
  });
});
