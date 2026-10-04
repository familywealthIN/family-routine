/* eslint-env jest */
/**
 * "Before you start" is a pure function of its blocks.
 *
 * What matters here is the Add contract: the pill carries the step string the
 * container will append to the checklist verbatim, and an already-added step
 * cannot emit again — the same fragment twice is two identical checklist items.
 */
const Vue = require('vue');

const RoutineBriefCard = require('./RoutineBriefCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const BLOCKS = [
  {
    tag: 'area:health:fitness',
    kind: 'AREA',
    icon: 'dashboard',
    color: '#288bd5',
    segments: ['Health', 'Fitness'],
    breadcrumb: 'Health › Fitness',
    description: 'About 3 km every lunch break toward Walk 1,000 km.',
    stat: '1/2 recent',
    steps: [
      { text: 'Try the river loop', added: false },
      { text: 'Log shoe mileage', added: true },
    ],
    activity: [
      { date: 'Fri', text: '3.1 km', done: true },
      { date: 'Thu', text: 'Missed · meeting ran over', done: false },
    ],
  },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineBriefCard, {
      props: { blocks: BLOCKS, subline: 'Health › Fitness · 2 next steps', ...props },
      on: props.on || {},
    }),
  }).$mount();
  return { vm, card: vm.$children[0], el: vm.$el };
};

const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));

describe('OrganismRoutineBriefCard', () => {
  it('is open by default and shows the kind, breadcrumb and recent stat', () => {
    const { el } = render();
    expect(el.querySelector('.rn-brief__title').textContent.trim()).toBe('Before you start');
    expect(el.querySelector('.rn-brief__chevron').textContent.trim()).toBe('expand_less');
    expect(el.querySelector('.rn-brief__kind').textContent.trim()).toBe('AREA');
    expect(Array.from(el.querySelectorAll('.rn-brief__crumb')).map((n) => n.textContent))
      .toEqual(['Health', 'Fitness']);
    expect(el.querySelector('.rn-brief__stat').textContent.trim()).toBe('1/2 recent');
    expect(el.querySelector('.rn-brief__desc').textContent).toContain('3 km every lunch break');
  });

  it('collapses to the subline, keeping no block markup behind', () => {
    const { el } = render({ open: false });
    expect(el.querySelector('[data-testid="brief-subline"]').textContent.trim())
      .toBe('Health › Fitness · 2 next steps');
    expect(all(el, 'brief-block')).toHaveLength(0);
    expect(el.querySelector('.rn-brief__chevron').textContent.trim()).toBe('expand_more');
  });

  it('asks the host to toggle rather than collapsing itself', () => {
    const toggles = [];
    const { el } = render({ on: { toggle: () => toggles.push(true) } });
    el.querySelector('[data-testid="brief-toggle"]').click();
    expect(toggles).toHaveLength(1);
    // Still open — the state lives above it.
    expect(all(el, 'brief-block')).toHaveLength(1);
  });

  it('emits the step text verbatim, with the tag it came from', () => {
    const added = [];
    const { el } = render({ on: { 'add-step': (payload) => added.push(payload) } });
    all(el, 'brief-add')[0].click();
    expect(added).toEqual([{ tag: 'area:health:fitness', text: 'Try the river loop' }]);
  });

  it('shows an added step as a disabled Added pill that emits nothing', () => {
    const added = [];
    const { el } = render({ on: { 'add-step': (payload) => added.push(payload) } });
    const pills = all(el, 'brief-add');
    expect(pills[0].textContent.trim()).toContain('Add');
    expect(pills[0].disabled).toBe(false);
    expect(pills[1].textContent.trim()).toContain('Added');
    expect(pills[1].disabled).toBe(true);
    expect(pills[1].className).toContain('rn-brief__add--added');

    pills[1].click();
    expect(added).toHaveLength(0);
  });

  it('marks past activity done or missed and dims the missed row', () => {
    const { el } = render();
    const rows = all(el, 'brief-activity');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.rn-brief__act-icon').textContent.trim()).toBe('check_circle');
    expect(rows[0].querySelector('.rn-brief__act-date').textContent.trim()).toBe('Fri');
    expect(rows[1].querySelector('.rn-brief__act-icon').textContent.trim())
      .toBe('remove_circle_outline');
    expect(rows[1].querySelector('.rn-brief__act-text').style.color)
      .toBe('rgba(0, 0, 0, 0.5)');
  });

  it('drops the NEXT STEPS / PAST ACTIVITY labels when a block has neither', () => {
    const { el } = render({
      blocks: [{
        ...BLOCKS[0], steps: [], activity: [], stat: '',
      }],
    });
    expect(el.textContent).not.toContain('NEXT STEPS');
    expect(el.textContent).not.toContain('PAST ACTIVITY');
    expect(el.querySelector('.rn-brief__desc')).not.toBeNull();
  });

  // The context for a tag is built on demand the first time its routine is
  // focused. While that is out, the half that needs no model call — the kind
  // label and the breadcrumb, both read off the tag string — is already true
  // and renders; the body fills in underneath it. No spinner, nothing that
  // moves, and no empty block: a tag that resolves to nothing loses its block
  // because the host stops sending it.
  it('renders a pending block as its kind and breadcrumb, and nothing else', () => {
    const { el } = render({
      blocks: [{
        tag: 'area:health:fitness',
        kind: 'AREA',
        icon: 'dashboard',
        color: '#288bd5',
        segments: ['Health', 'Fitness'],
        breadcrumb: 'Health › Fitness',
        description: '',
        stat: '',
        steps: [],
        activity: [],
        pending: true,
      }],
      subline: 'Health › Fitness',
    });

    const [block] = all(el, 'brief-block');
    expect(block.className).toContain('rn-brief__block--pending');
    expect(block.querySelector('.rn-brief__kind').textContent.trim()).toBe('AREA');
    expect(Array.from(block.querySelectorAll('.rn-brief__crumb')).map((n) => n.textContent))
      .toEqual(['Health', 'Fitness']);
    expect(block.querySelector('.rn-brief__desc')).toBeNull();
    expect(block.textContent).not.toContain('NEXT STEPS');
    expect(block.textContent).not.toContain('PAST ACTIVITY');
    expect(all(el, 'brief-add')).toHaveLength(0);
    // Not a spinner, not a skeleton — nothing animated at all.
    expect(el.querySelector('[class*="spinner"], [class*="skeleton"]')).toBeNull();
  });

  it('does not mark a block with real context as pending', () => {
    const { el } = render();
    expect(all(el, 'brief-block')[0].className).not.toContain('rn-brief__block--pending');
  });

  it('renders one block per tag', () => {
    const { el } = render({
      blocks: [
        BLOCKS[0],
        {
          ...BLOCKS[0],
          tag: 'project:dashboard',
          kind: 'PROJECT',
          icon: 'folder',
          color: '#E68900',
          segments: ['Dashboard'],
          breadcrumb: 'Dashboard',
        },
      ],
    });
    expect(all(el, 'brief-block')).toHaveLength(2);
    expect(el.textContent).toContain('PROJECT');
  });
});
