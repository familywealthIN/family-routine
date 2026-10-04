/* eslint-env jest */
/**
 * Connect AI, in both states.
 *
 * The design only ever draws the connected one — `docs/redesign/chassis.md`
 * § Conflicts says to model the disconnected state too, because `oauthConnected`
 * defaults false and a chip that is green before anything has connected is a
 * claim the app cannot support.
 */
const Vue = require('vue');

const ConnectAiPanel = require('./ConnectAiPanel.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const SECRET = 'frt_secret_4b9c1e77a03d8f2a';

const mount = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(ConnectAiPanel, {
      props: {
        serverUrl: 'http://localhost:4000/mcp',
        clientSecret: SECRET,
        ...props,
      },
    }),
  }).$mount();
  return { vm, panel: vm.$children[0], el: vm.$el };
};

const text = (el, selector) => el.querySelector(selector).textContent.trim();

describe('OrganismConnectAiPanel — connected', () => {
  it('shows the green Connected chip', () => {
    const { el } = mount({ connected: true });
    const chip = el.querySelector('[data-testid="connect-ai-status"]');
    expect(chip.textContent).toContain('Connected');
    expect(chip.textContent).toContain('check_circle');
    expect(chip.className).toContain('rn-cai__chip--on');
  });

  it('leads with what the credentials are for', () => {
    expect(text(mount({ connected: true }).el, '[data-testid="connect-ai-lead"]'))
      .toBe('Use these with any MCP client to read and add goals.');
  });
});

describe('OrganismConnectAiPanel — disconnected (the state the design omits)', () => {
  it('defaults to Not connected rather than claiming a connection', () => {
    const { el } = mount();
    const chip = el.querySelector('[data-testid="connect-ai-status"]');
    expect(chip.textContent).toContain('Not connected');
    expect(chip.textContent).not.toContain('check_circle');
    expect(chip.className).toContain('rn-cai__chip--off');
  });

  it('says what will make the chip flip', () => {
    expect(text(mount().el, '[data-testid="connect-ai-lead"]'))
      .toContain('turns Connected');
  });

  it('still shows every credential, because that is how you connect', () => {
    const { el } = mount();
    expect(el.querySelector('[data-testid="connect-ai-cred-url"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="connect-ai-cred-cid"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="connect-ai-cred-sec"]')).not.toBeNull();
  });
});

describe('OrganismConnectAiPanel — the credentials', () => {
  it('shows the server URL and the one client id the server validates', () => {
    const { el } = mount();
    expect(text(el, '[data-testid="connect-ai-value-url"]')).toBe('http://localhost:4000/mcp');
    expect(text(el, '[data-testid="connect-ai-value-cid"]')).toBe('routine-notes-mcp');
  });

  it('masks the secret with the server\'s prefix, not the mock\'s', () => {
    const { el } = mount();
    const shown = text(el, '[data-testid="connect-ai-value-sec"]');
    expect(shown).toContain('frt_secret_');
    expect(shown).not.toContain('rn_sec_');
    expect(shown).not.toBe(SECRET);
    expect(shown).toContain('8f2a');
  });

  it('reveals and re-hides the secret behind the eye', async () => {
    const { vm, el } = mount();
    el.querySelector('[data-testid="connect-ai-reveal"]').click();
    await vm.$nextTick();
    expect(text(el, '[data-testid="connect-ai-value-sec"]')).toBe(SECRET);
    expect(el.querySelector('[data-testid="connect-ai-reveal"]').textContent.trim())
      .toBe('visibility_off');

    el.querySelector('[data-testid="connect-ai-reveal"]').click();
    await vm.$nextTick();
    expect(text(el, '[data-testid="connect-ai-value-sec"]')).not.toBe(SECRET);
  });

  it('offers an eye on the secret only', () => {
    expect(mount().el.querySelectorAll('[data-testid="connect-ai-reveal"]')).toHaveLength(1);
  });

  it('asks the container to copy — it never touches the clipboard itself', () => {
    const { panel, el } = mount();
    const copies = [];
    panel.$on('copy', (payload) => copies.push(payload));
    el.querySelector('[data-testid="connect-ai-copy-url"]').click();
    expect(copies).toEqual([
      { key: 'url', value: 'http://localhost:4000/mcp', label: 'Server URL' },
    ]);
  });

  it('keeps acronyms capitalised in the copied label', () => {
    const { panel, el } = mount();
    const labels = [];
    panel.$on('copy', (payload) => labels.push(payload.label));
    el.querySelector('[data-testid="connect-ai-copy-cid"]').click();
    expect(labels).toEqual(['Client ID']);
  });

  it('ticks only the row whose copy actually succeeded', () => {
    const { el } = mount({ copiedKey: 'cid' });
    expect(el.querySelector('[data-testid="connect-ai-copy-cid"]').textContent.trim()).toBe('check');
    expect(el.querySelector('[data-testid="connect-ai-copy-url"]').textContent.trim())
      .toBe('content_copy');
  });

  it('cannot copy a value that was never issued', () => {
    const { panel, el } = mount({ clientSecret: '' });
    const copies = [];
    panel.$on('copy', (payload) => copies.push(payload));
    const button = el.querySelector('[data-testid="connect-ai-copy-sec"]');
    expect(button.disabled).toBe(true);
    button.click();
    expect(copies).toEqual([]);
    expect(text(el, '[data-testid="connect-ai-value-sec"]')).toBe('—');
  });
});

describe('OrganismConnectAiPanel — the platform guides', () => {
  it('offers the four platforms as chips, ChatGPT first', () => {
    const { el } = mount();
    const chips = Array.from(el.querySelectorAll('.rn-cai__platform'))
      .map((chip) => chip.textContent.trim());
    expect(chips).toEqual(['ChatGPT', 'n8n', 'Gemini', 'Perplexity']);
    expect(el.querySelector('[data-testid="connect-ai-platform-ChatGPT"]').className)
      .toContain('rn-cai__platform--on');
  });

  it('swaps the numbered steps when a chip is tapped', async () => {
    const { vm, el } = mount();
    expect(text(el, '[data-testid="connect-ai-steps"]')).toContain('Beta features');

    el.querySelector('[data-testid="connect-ai-platform-n8n"]').click();
    await vm.$nextTick();
    const steps = text(el, '[data-testid="connect-ai-steps"]');
    expect(steps).toContain('OAuth2 API');
    expect(steps).not.toContain('Beta features');
    // The real endpoints, not the design's ellipsis.
    expect(steps).toContain('http://localhost:4000/mcp/oauth/token');
  });

  it('numbers the steps it shows', async () => {
    const { vm, el } = mount();
    el.querySelector('[data-testid="connect-ai-platform-Gemini"]').click();
    await vm.$nextTick();
    const numbers = Array.from(el.querySelectorAll('.rn-cai__step-n'))
      .map((node) => node.textContent.trim());
    expect(numbers).toEqual(['1', '2', '3', '4']);
  });
});
