/* eslint-env jest */
/**
 * ResponsiveSheet — one overlay, two presentations.
 *
 * The chassis pins the sheet/dialog geometry to exact values because every
 * design file redraws the same thing twice. These tests lock the three shells,
 * the per-page width overrides and the two ways out (backdrop, close button) so
 * a page cannot quietly ship its own sheet again.
 */
const Vue = require('vue');

const ResponsiveSheet = require('./ResponsiveSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

/**
 * `slots` maps a slot name to a `(h) => vnode` factory. Named slots are passed
 * as children carrying `slot:` data so they land in `$slots` (not
 * `$scopedSlots`) — the component gates its footer on `$slots.footer`.
 */
const render = (props = {}, slots = {}) => {
  const vm = new Vue({
    render(h) {
      const children = Object.keys(slots).map((name) => {
        const vnode = slots[name](h);
        if (name !== 'default') vnode.data = { ...(vnode.data || {}), slot: name };
        return vnode;
      });
      return h(ResponsiveSheet, {
        props: { open: true, title: 'Edit routine', ...props },
      }, children);
    },
  }).$mount();
  return { vm, el: vm.$el, sheet: vm.$children[0] };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('ResponsiveSheet — open state', () => {
  it('renders nothing at all while closed', () => {
    const { el } = render({ open: false });
    // a v-if root renders as an empty comment placeholder, not a stray div that
    // would keep a scrim-sized element in the layout
    expect(el.nodeType).toBe(8);
    expect(el.querySelector).toBeUndefined();
  });

  it('renders a labelled modal dialog when open', () => {
    const { el } = render();
    const panel = el.querySelector('.rn-rsheet__panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe('Edit routine');
  });
});

describe('ResponsiveSheet — phone bottom sheet', () => {
  it('uses the sheet presentation', () => {
    const { el, sheet } = render({ shell: 'phone' });
    expect(sheet.mode).toBe('sheet');
    expect(el.className).toContain('rn-rsheet--sheet');
    expect(el.querySelector('.rn-rsheet__panel--sheet')).not.toBeNull();
  });

  it('spans the viewport instead of taking a dialog width', () => {
    const { el, sheet } = render({ shell: 'phone', width: 560 });
    expect(sheet.dialogWidth).toBeNull();
    expect(el.querySelector('.rn-rsheet__panel').style.width).toBe('');
  });

  it('shows the 40x4 drag handle by default', () => {
    const { el } = render({ shell: 'phone' });
    expect(q(el, 'responsive-sheet-handle')).not.toBeNull();
  });

  it('drops the handle when the page opts out', () => {
    const { el } = render({ shell: 'phone', handle: false });
    expect(q(el, 'responsive-sheet-handle')).toBeNull();
  });

  it('closes from the handle, which is the phone grab affordance', () => {
    const { el, sheet } = render({ shell: 'phone' });
    const closes = [];
    sheet.$on('close', () => closes.push(1));
    q(el, 'responsive-sheet-handle').click();
    expect(closes).toHaveLength(1);
  });
});

describe('ResponsiveSheet — tablet and desktop dialogs', () => {
  it('centres a 860px dialog on tablet', () => {
    const { el, sheet } = render({ shell: 'tablet' });
    expect(sheet.mode).toBe('dialog');
    expect(sheet.dialogWidth).toBe('860px');
    expect(el.querySelector('.rn-rsheet__panel').style.width).toBe('860px');
  });

  it('centres a 720px dialog on desktop', () => {
    expect(render({ shell: 'desktop' }).sheet.dialogWidth).toBe('720px');
  });

  it('never shows the drag handle on a centred dialog', () => {
    expect(q(render({ shell: 'tablet' }).el, 'responsive-sheet-handle')).toBeNull();
    expect(q(render({ shell: 'desktop' }).el, 'responsive-sheet-handle')).toBeNull();
  });

  it('falls back to the desktop width for an unknown shell rather than breaking', () => {
    expect(render({ shell: 'watch' }).sheet.dialogWidth).toBe('720px');
  });
});

describe('ResponsiveSheet — per-page width overrides', () => {
  const CASES = [
    { page: 'Routines editor', width: 560 },
    { page: 'Year Goals create/menu', width: 480 },
    { page: 'Goals new-goal', width: 500 },
  ];

  CASES.forEach(({ page, width }) => {
    it(`${page} overrides both dialogs to ${width}px`, () => {
      expect(render({ shell: 'tablet', width }).sheet.dialogWidth).toBe(`${width}px`);
      expect(render({ shell: 'desktop', width }).sheet.dialogWidth).toBe(`${width}px`);
    });
  });

  it('passes a string width through verbatim', () => {
    expect(render({ shell: 'desktop', width: '70vw' }).sheet.dialogWidth).toBe('70vw');
  });

  it('ignores an empty override instead of collapsing the dialog', () => {
    expect(render({ shell: 'tablet', width: '' }).sheet.dialogWidth).toBe('860px');
  });
});

describe('ResponsiveSheet — closing', () => {
  ['phone', 'tablet', 'desktop'].forEach((shell) => {
    it(`emits close from the backdrop on ${shell}`, () => {
      const { el, sheet } = render({ shell });
      const closes = [];
      sheet.$on('close', () => closes.push(1));
      q(el, 'responsive-sheet-backdrop').click();
      expect(closes).toHaveLength(1);
    });

    it(`emits close from the close affordance on ${shell}`, () => {
      const { el, sheet } = render({ shell });
      const closes = [];
      sheet.$on('close', () => closes.push(1));
      q(el, 'responsive-sheet-close').click();
      expect(closes).toHaveLength(1);
    });
  });

  it('hides the close button when the page owns dismissal itself', () => {
    const { el } = render({ closable: false, title: '' });
    expect(q(el, 'responsive-sheet-close')).toBeNull();
    expect(el.querySelector('.rn-rsheet__head')).toBeNull();
  });
});

describe('ResponsiveSheet — content', () => {
  it('renders the default slot in the scrolling body', () => {
    const { el } = render({}, { default: (h) => h('p', { attrs: { id: 'inner' } }, 'body') });
    expect(el.querySelector('.rn-rsheet__body #inner').textContent).toBe('body');
  });

  it('renders a footer only when one is supplied', () => {
    expect(render().el.querySelector('.rn-rsheet__foot')).toBeNull();
    const withFoot = render({}, { footer: (h) => h('button', 'Save') });
    expect(withFoot.el.querySelector('.rn-rsheet__foot').textContent).toBe('Save');
  });

  it('lets a header slot replace the plain title but keeps the close button', () => {
    const { el } = render({}, { header: (h) => h('div', { attrs: { id: 'custom' } }, 'Hi') });
    expect(el.querySelector('#custom')).not.toBeNull();
    expect(el.querySelector('.rn-rsheet__title')).toBeNull();
    expect(q(el, 'responsive-sheet-close')).not.toBeNull();
  });
});

describe('ResponsiveSheet — keyboard and focus', () => {
  const press = (key) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    return event;
  };

  // Mounted into the document so focus is real; each test tears down so the
  // module-level stack and the document listener never leak between cases.
  const mounted = [];
  const mountAttached = (props = {}) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const vm = new Vue({
      data: { open: true, ...props },
      render(h) {
        return h(ResponsiveSheet, { props: { title: 'Edit', ...this.$data, open: this.open } });
      },
    }).$mount(host);
    mounted.push(vm);
    return { vm, sheet: vm.$children[0] };
  };
  afterEach(() => {
    while (mounted.length) {
      const vm = mounted.pop();
      vm.$destroy();
      if (vm.$el && vm.$el.parentNode) vm.$el.parentNode.removeChild(vm.$el);
    }
  });

  it('emits close on Escape', () => {
    const { sheet } = mountAttached();
    const closes = [];
    sheet.$on('close', () => closes.push(1));
    press('Escape');
    expect(closes).toHaveLength(1);
  });

  it('emits close on Escape even when the page hides the × (same as the backdrop)', () => {
    const { sheet } = mountAttached({ closable: false });
    const closes = [];
    sheet.$on('close', () => closes.push(1));
    press('Escape');
    expect(closes).toHaveLength(1);
  });

  it('ignores other keys and an Escape something inside already handled', () => {
    const { sheet } = mountAttached();
    const closes = [];
    sheet.$on('close', () => closes.push(1));
    press('Enter');
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);
    expect(closes).toHaveLength(0);
  });

  it('closes only the topmost of two stacked sheets', () => {
    const bottom = mountAttached().sheet;
    const top = mountAttached().sheet;
    const closed = [];
    bottom.$on('close', () => closed.push('bottom'));
    top.$on('close', () => closed.push('top'));
    press('Escape');
    expect(closed).toEqual(['top']);
  });

  it('stops listening once closed', async () => {
    const { vm, sheet } = mountAttached();
    const closes = [];
    sheet.$on('close', () => closes.push(1));
    vm.open = false;
    await Vue.nextTick();
    press('Escape');
    expect(closes).toHaveLength(0);
  });

  it('moves focus into the dialog on open and returns it on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { vm } = mountAttached();
    await Vue.nextTick();
    const panel = document.querySelector('.rn-rsheet__panel');
    expect(document.activeElement).toBe(panel);
    vm.open = false;
    await Vue.nextTick();
    expect(document.activeElement).toBe(opener);
    document.body.removeChild(opener);
  });
});
