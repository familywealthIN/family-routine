/* eslint-env jest */
/**
 * The legacy API key card.
 *
 * Two contracts: the card only ever ASKS for a key (the mutation is the
 * container's — `chassis.md` § Conflicts), and replacing an existing key, which
 * is irreversible, takes two presses.
 */
const Vue = require('vue');

const ApiKeyCard = require('./ApiKeyCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({ render: (h) => h(ApiKeyCard, { props }) }).$mount();
  const card = vm.$children[0];
  const generated = [];
  const copied = [];
  card.$on('generate', () => generated.push(true));
  card.$on('copy', (payload) => copied.push(payload));
  return {
    vm, card, el: vm.$el, generated, copied,
  };
};

const button = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('OrganismApiKeyCard — no key yet', () => {
  it('says there is none rather than showing an empty field', () => {
    const { el } = mount();
    expect(button(el, 'api-key-value').textContent.trim()).toBe('No API key yet');
    expect(button(el, 'api-key-generate').textContent.trim()).toBe('Generate');
  });

  it('offers no copy button for a key that does not exist', () => {
    expect(button(mount().el, 'api-key-copy')).toBeNull();
  });

  it('generates on the first press — there is nothing to destroy', () => {
    const { el, generated } = mount();
    button(el, 'api-key-generate').click();
    expect(generated).toEqual([true]);
  });
});

describe('OrganismApiKeyCard — a key exists', () => {
  const KEY = 'frt_8a1d4c6e-2f31-4b77-9ac0-55e1d0f4a912';

  it('shows the key and the warning the design carries', () => {
    const { el } = mount({ apiKey: KEY });
    expect(button(el, 'api-key-value').textContent.trim()).toBe(KEY);
    expect(button(el, 'api-key-note').textContent)
      .toContain('Regenerating breaks anything still using the old key');
    expect(button(el, 'api-key-generate').textContent.trim()).toBe('Regenerate');
  });

  // A caption does not stop a mis-tap, and the old key dies the instant the
  // mutation resolves.
  it('does not regenerate on the first press', async () => {
    const { vm, el, generated } = mount({ apiKey: KEY });
    button(el, 'api-key-generate').click();
    await vm.$nextTick();
    expect(generated).toEqual([]);
    expect(button(el, 'api-key-generate').textContent.trim()).toBe('Confirm regenerate');
    expect(button(el, 'api-key-confirm-note').textContent).toContain('stops working immediately');
  });

  it('regenerates on the second press', async () => {
    const { vm, el, generated } = mount({ apiKey: KEY });
    button(el, 'api-key-generate').click();
    await vm.$nextTick();
    button(el, 'api-key-generate').click();
    expect(generated).toEqual([true]);
  });

  it('can be backed out of', async () => {
    const { vm, el, generated } = mount({ apiKey: KEY });
    button(el, 'api-key-generate').click();
    await vm.$nextTick();
    button(el, 'api-key-cancel').click();
    await vm.$nextTick();
    expect(generated).toEqual([]);
    expect(button(el, 'api-key-generate').textContent.trim()).toBe('Regenerate');
  });

  it('disarms when a new key lands, so the next press cannot fire blind', async () => {
    const vm = new Vue({
      data: { apiKey: KEY },
      render(h) { return h(ApiKeyCard, { props: { apiKey: this.apiKey } }); },
    }).$mount();
    const card = vm.$children[0];
    vm.$el.querySelector('[data-testid="api-key-generate"]').click();
    await vm.$nextTick();
    expect(card.confirming).toBe(true);

    vm.apiKey = 'frt_a-brand-new-key';
    await vm.$nextTick();
    expect(card.confirming).toBe(false);
  });

  it('asks the container to copy, and ticks only once it succeeded', () => {
    const { el, copied } = mount({ apiKey: KEY });
    expect(button(el, 'api-key-copy').textContent.trim()).toBe('content_copy');
    button(el, 'api-key-copy').click();
    expect(copied).toEqual([{ key: 'apiKey', value: KEY, label: 'API key' }]);

    expect(mount({ apiKey: KEY, copied: true }).el
      .querySelector('[data-testid="api-key-copy"]').textContent.trim()).toBe('check');
  });
});
