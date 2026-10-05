/* eslint-env jest */
/**
 * Leaving the group. This sheet exists to replace the page's old
 * `confirm('Do you want to leave the Group?')` — so what is asserted is that it
 * states the consequence by name and that leaving takes a deliberate second tap.
 */
const Vue = require('vue');

const GroupLeaveSheet = require('./GroupLeaveSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(GroupLeaveSheet, {
      props: {
        open: true, shell: 'phone', othersNames: 'Priya, Sam and Leo', ...props,
      },
    }),
  }).$mount();
  return { vm, sheet: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismGroupLeaveSheet', () => {
  it('asks, by name, and promises what is kept', () => {
    const { el } = render();
    expect(el.querySelector('.rn-gleave__title').textContent).toBe('Leave the group?');
    expect(testid(el, 'group-leave-body').textContent.replace(/\s+/g, ' ').trim())
      .toBe(
        'You’ll stop seeing Priya, Sam and Leo’s progress, and they’ll stop seeing yours. '
        + 'Your routines and history stay with you.',
      );
  });

  it('offers Stay and Leave group, in that order', () => {
    const buttons = Array.from(render().el.querySelectorAll('.rn-gleave__actions button'))
      .map((node) => node.textContent.trim());
    expect(buttons).toEqual(['Stay', 'Leave group']);
  });

  it('only leaves on the destructive button', () => {
    const { sheet, el } = render();
    const events = [];
    sheet.$on('confirm', () => events.push('confirm'));
    sheet.$on('close', () => events.push('close'));

    testid(el, 'group-leave-stay').click();
    expect(events).toEqual(['close']);

    testid(el, 'group-leave-confirm').click();
    expect(events).toEqual(['close', 'confirm']);
  });

  it('renders nothing until it is opened', () => {
    expect(render({ open: false }).el.nodeType).toBe(Node.COMMENT_NODE);
  });
});
