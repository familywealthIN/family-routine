/* eslint-env jest */
/**
 * Unit tests for the chassis toast host (docs/redesign/chassis.md § Toast).
 */
const Vue = require('vue');

const AppToast = require('./AppToast.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(AppToast, {
      props: {
        shell: 'phone',
        title: 'Week goal ticked',
        sub: 'streak kept',
        ...props,
      },
    }),
  }).$mount();
  return { vm, toast: vm.$children[0], el: vm.$el };
};

describe('MoleculeAppToast', () => {
  it('renders the icon, a 14px bold title and a 12px sub at 75% opacity', () => {
    const { el } = render();
    expect(el.getAttribute('data-testid')).toBe('app-toast');
    expect(el.querySelector('.rn-toast__icon').textContent.trim()).toBe('check_circle');
    expect(el.querySelector('[data-testid="app-toast-title"]').textContent.trim())
      .toBe('Week goal ticked');
    expect(el.querySelector('[data-testid="app-toast-sub"]').textContent.trim())
      .toBe('streak kept');
  });

  // The pairing is the contract: the sub carries the consequence, so the slot
  // exists even when a caller forgets to fill it.
  it('always renders the sub slot, so a missing consequence is visible', () => {
    const { el } = render({ sub: '' });
    expect(el.querySelector('[data-testid="app-toast-sub"]')).not.toBeNull();
  });

  it('renders nothing at all without a title', () => {
    // A falsy root v-if leaves an empty placeholder comment, not a node.
    expect(render({ title: '' }).el.nodeType).toBe(8);
  });

  it('is a full-width pill above the tab bar on the phone', () => {
    expect(render().el.className).toContain('rn-toast--phone');
  });

  it('is a right-anchored card on tablet and desktop', () => {
    expect(render({ shell: 'tablet' }).el.className).toContain('rn-toast--tablet');
    expect(render({ shell: 'desktop' }).el.className).toContain('rn-toast--desktop');
  });

  it('follows the one breakpoint rule when no shell is given', () => {
    const shellFor = (breakpoint) => AppToast.computed.shellName.call({
      shell: '', $vuetify: breakpoint ? { breakpoint } : undefined,
    });
    expect(shellFor({ xsOnly: true, width: 400 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1263 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  // A repeat of the same message has to replay. The mocks alternate two
  // identical keyframes for this; we re-create the node by bumping the key.
  it('replaces the node when seq is bumped, replaying the animation', () => {
    const host = new Vue({
      data: { seq: 1 },
      render(h) {
        return h(AppToast, { props: { shell: 'phone', title: 'Saved', sub: 'streak kept', seq: this.seq } });
      },
    }).$mount();
    const first = host.$el;
    host.seq = 2;
    return Vue.nextTick().then(() => {
      expect(host.$el).not.toBe(first);
      // Same message, unchanged — only the key moved.
      expect(host.$el.textContent).toContain('Saved');
    });
  });

  it('tells the host when the animation has finished', () => {
    const { toast, el } = render();
    let done = 0;
    toast.$on('done', () => { done += 1; });
    el.dispatchEvent(new window.Event('animationend'));
    expect(done).toBe(1);
  });

  it('lets the caller pick the glyph and its colour', () => {
    const { el } = render({ icon: 'bolt', iconColor: '#FF9800' });
    expect(el.querySelector('.rn-toast__icon').textContent.trim()).toBe('bolt');
    expect(el.querySelector('.rn-toast__icon').style.color).toBe('rgb(255, 152, 0)');
  });
});
