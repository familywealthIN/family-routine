/* eslint-env jest */
/**
 * Connect AI's container home — the clipboard and the MCP endpoint, which an
 * organism in `packages/ui` may not touch.
 *
 * The clipboard is the part worth testing: the old page `alert`ed "Copied to
 * clipboard!" from its FALLBACK path too, so a refused copy still claimed
 * success and the user pasted whatever was there before.
 */
const Vue = require('vue');

const { SECRET_PREFIX } = require('@routine-notes/ui/constants/profile');
const Container = require('../ConnectAiContainer.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const withClipboard = (impl) => {
  const original = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true });
  return () => Object.defineProperty(navigator, 'clipboard', {
    value: original, configurable: true,
  });
};

const mount = (props = {}) => {
  const vm = new Vue({ render: (h) => h(Container, { props }) }).$mount();
  const container = vm.$children[0];
  const events = [];
  ['copied', 'copy-failed'].forEach((name) => {
    container.$on(name, (...args) => events.push([name, ...args]));
  });
  return {
    vm, container, el: vm.$el, events,
  };
};

describe('ConnectAiContainer — what it hands the panel', () => {
  it('passes the server\'s connected flag straight through, default false', () => {
    expect(mount().el.querySelector('[data-testid="connect-ai-status"]').textContent)
      .toContain('Not connected');
    expect(mount({ connected: true }).el.querySelector('[data-testid="connect-ai-status"]').textContent)
      .toContain('Connected');
  });

  it('uses the server\'s secret prefix, not the mock\'s rn_sec_', () => {
    const { container } = mount();
    expect(container.clientSecret.startsWith(SECRET_PREFIX)).toBe(true);
    expect(container.clientSecret).not.toContain('rn_sec_');
  });

  it('points at the MCP endpoint, which is not the GraphQL one', () => {
    expect(mount().container.serverUrl).toBe('http://localhost:4000/mcp');
  });
});

describe('ConnectAiContainer — copying', () => {
  it('ticks the row and reports copied only when the clipboard took it', async () => {
    const written = [];
    const restore = withClipboard({
      writeText: (value) => { written.push(value); return Promise.resolve(); },
    });
    const { vm, el, events } = mount();

    el.querySelector('[data-testid="connect-ai-copy-url"]').click();
    await flush();
    await vm.$nextTick();

    expect(written).toEqual(['http://localhost:4000/mcp']);
    expect(events).toEqual([['copied', 'Server URL']]);
    expect(el.querySelector('[data-testid="connect-ai-copy-url"]').textContent.trim())
      .toBe('check');
    restore();
  });

  it('survives a browser with no clipboard API at all', async () => {
    const restore = withClipboard(undefined);
    document.execCommand = jest.fn(() => true);
    const { el, events } = mount();

    el.querySelector('[data-testid="connect-ai-copy-cid"]').click();
    await flush();

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(events).toEqual([['copied', 'Client ID']]);
    restore();
  });

  it('says it could not copy rather than claiming it did', async () => {
    const restore = withClipboard({ writeText: () => Promise.reject(new Error('denied')) });
    document.execCommand = jest.fn(() => false);
    const { vm, el, events } = mount();

    el.querySelector('[data-testid="connect-ai-copy-sec"]').click();
    await flush();
    await vm.$nextTick();

    expect(events).toEqual([['copy-failed', 'Client secret']]);
    expect(el.querySelector('[data-testid="connect-ai-copy-sec"]').textContent.trim())
      .toBe('content_copy');
    restore();
  });
});
