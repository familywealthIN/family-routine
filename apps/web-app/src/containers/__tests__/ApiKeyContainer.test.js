/* eslint-env jest */
/**
 * The legacy API key goes through the server, not through `Math.random()`.
 *
 * The design's prototype mints `'rn_' + random` in the browser; the real key is
 * `frt_<uuid>` from `generateApiKey` (`docs/redesign/chassis.md` § Conflicts).
 * These tests pin that, and that the old `alert('API Key generated
 * successfully!')` is gone — the page toasts off `generated`.
 */
const Vue = require('vue');

const Container = require('../ApiKeyContainer.vue').default;
const { GENERATE_API_KEY_MUTATION } = require('../../composables/graphql/profileQueries');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const KEY = 'frt_8a1d4c6e-2f31-4b77-9ac0-55e1d0f4a912';

const mount = (mutate, props = {}) => {
  const vm = new Vue({
    data: { apiKey: props.apiKey || '' },
    render(h) { return h(Container, { props: { apiKey: this.apiKey } }); },
  }).$mount();
  const container = vm.$children[0];
  // vue-apollo is not installed in the unit environment.
  container.$apollo = { mutate };
  const events = [];
  ['generated', 'failed', 'changed', 'copied', 'copy-failed'].forEach((name) => {
    container.$on(name, (...args) => events.push([name, ...args]));
  });
  return {
    vm, container, el: vm.$el, events,
  };
};

const press = (el) => el.querySelector('[data-testid="api-key-generate"]').click();

describe('ApiKeyContainer', () => {
  it('calls the mutation instead of generating a key locally', async () => {
    const mutate = jest.fn(() => Promise.resolve({ data: { generateApiKey: { apiKey: KEY } } }));
    const { el, events } = mount(mutate);

    press(el);
    await flush();

    expect(mutate).toHaveBeenCalledWith({ mutation: GENERATE_API_KEY_MUTATION });
    expect(events).toEqual([['generated', KEY, false], ['changed']]);
  });

  it('shows the server\'s key, which never starts with the mock\'s rn_ prefix', async () => {
    const { el } = mount(() => Promise.resolve({ data: { generateApiKey: { apiKey: KEY } } }));
    press(el);
    await flush();
    await Vue.nextTick();

    const shown = el.querySelector('[data-testid="api-key-value"]').textContent.trim();
    expect(shown).toBe(KEY);
    expect(shown.startsWith('rn_')).toBe(false);
  });

  it('reports a replacement as a replacement, so the toast can say so', async () => {
    const { el, events } = mount(
      () => Promise.resolve({ data: { generateApiKey: { apiKey: KEY } } }),
      { apiKey: 'frt_an-older-key' },
    );
    // Regenerating is two presses — the card arms first.
    press(el);
    await Vue.nextTick();
    press(el);
    await flush();

    expect(events[0]).toEqual(['generated', KEY, true]);
  });

  it('asks the read container to re-read, because UserItem cannot be patched by id', async () => {
    const { el, events } = mount(() => Promise.resolve({ data: { generateApiKey: { apiKey: KEY } } }));
    press(el);
    await flush();
    expect(events.map(([name]) => name)).toContain('changed');
  });

  it('reports a failure rather than pretending a key was issued', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { el, events } = mount(() => Promise.reject(new Error('offline')));

    press(el);
    await flush();
    await Vue.nextTick();

    expect(events).toEqual([['failed', 'Your existing key still works']]);
    expect(el.querySelector('[data-testid="api-key-value"]').textContent.trim())
      .toBe('No API key yet');
    console.error.mockRestore();
  });

  it('treats an empty payload as a failure, not as a blank key', async () => {
    const { el, events } = mount(() => Promise.resolve({ data: { generateApiKey: {} } }));
    press(el);
    await flush();
    expect(events).toEqual([['failed', 'The server returned no key']]);
  });

  it('lets the server value win once the re-read lands', async () => {
    const { vm, el } = mount(() => Promise.resolve({ data: { generateApiKey: { apiKey: KEY } } }));
    press(el);
    await flush();
    vm.apiKey = 'frt_the-refetched-one';
    await Vue.nextTick();
    expect(el.querySelector('[data-testid="api-key-value"]').textContent.trim())
      .toBe('frt_the-refetched-one');
  });
});

describe('ApiKeyContainer — copying', () => {
  const withClipboard = (impl) => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true });
    return () => Object.defineProperty(navigator, 'clipboard', {
      value: original, configurable: true,
    });
  };

  it('reports copied only when the clipboard took it', async () => {
    const restore = withClipboard({ writeText: () => Promise.resolve() });
    const { el, events } = mount(jest.fn(), { apiKey: KEY });

    el.querySelector('[data-testid="api-key-copy"]').click();
    await flush();

    expect(events).toEqual([['copied', 'API key']]);
    restore();
  });

  it('reports a refused clipboard instead of claiming success', async () => {
    // No clipboard API at all, and execCommand reports failure.
    const restore = withClipboard(undefined);
    document.execCommand = jest.fn(() => false);
    const { el, events } = mount(jest.fn(), { apiKey: KEY });

    el.querySelector('[data-testid="api-key-copy"]').click();
    await flush();

    expect(events).toEqual([['copy-failed', 'API key']]);
    restore();
  });
});
