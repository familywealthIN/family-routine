/* eslint-env jest */
/** The pulse card — what replaced the forest photo and its member count. */
const Vue = require('vue');

const GroupPulseCard = require('./GroupPulseCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const FACES = [
  { key: 'a', name: 'Alex Morgan', initials: 'AM', color: '#288bd5' },
  { key: 'b', name: 'Priya Shah', initials: 'PS', color: '#7b5ea7' },
  { key: 'c', name: 'Sam Morgan', initials: 'SM', color: '#E68900' },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(GroupPulseCard, {
      props: {
        average: 64,
        line: 'Average across 4 members. Sam and Leo could use a nudge.',
        faces: FACES,
        doneCount: 3,
        memberCount: 4,
        ...props,
      },
    }),
  }).$mount();
  return { vm, el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismGroupPulseCard', () => {
  it('leads with the week average and the line under it', () => {
    const { el } = render();
    expect(testid(el, 'group-pulse-average').textContent.trim()).toBe('64%');
    expect(testid(el, 'group-pulse-line').textContent.trim())
      .toBe('Average across 4 members. Sam and Leo could use a nudge.');
  });

  it('overlaps the avatar stack by 8px after the first face', () => {
    const stack = testid(render().el, 'group-pulse-stack').children;
    expect(stack).toHaveLength(3);
    expect(stack[0].style.marginLeft).toBe('0px');
    expect(stack[1].style.marginLeft).toBe('-8px');
    expect(stack[2].style.marginLeft).toBe('-8px');
    expect(stack[1].textContent.trim()).toBe('PS');
    expect(stack[1].getAttribute('title')).toBe('Priya Shah');
  });

  it('counts who finished in the last hour against the whole group', () => {
    expect(testid(render().el, 'group-pulse-recent').textContent.replace(/\s+/g, ' ').trim())
      .toBe('3 of 4 finished a routine in the last hour');
  });

  it('prefers a real profile picture over the initials', () => {
    const { el } = render({ faces: [{ ...FACES[0], picture: 'https://cdn/a.png' }] });
    expect(el.querySelector('.rn-pulse__face-img').getAttribute('src')).toBe('https://cdn/a.png');
  });

  it('renders with nobody finished yet rather than hiding the row', () => {
    const { el } = render({ faces: [], doneCount: 0 });
    expect(testid(el, 'group-pulse-stack').children).toHaveLength(0);
    expect(testid(el, 'group-pulse-recent').textContent).toContain('0 of 4');
  });
});
