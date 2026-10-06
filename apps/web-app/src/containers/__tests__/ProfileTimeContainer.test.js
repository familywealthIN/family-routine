/* eslint-env jest */
/**
 * The two settings a user can change on Profile.
 *
 * The timezone case is the interesting one: the old page DISABLED the select for
 * the whole round trip. ARCHITECTURE.md § 3.7 forbids gating a control on a
 * request in flight, so the container echoes the chosen value and only a refusal
 * puts the old one back. Time format is a client preference — localStorage plus
 * the `timeFormatChanged` root event `TimeFormatMixin` listens for.
 */
const Vue = require('vue');

const Container = require('../ProfileTimeContainer.vue').default;
const { UPDATE_USER_TIMEZONE_MUTATION } = require('../../composables/graphql/profileQueries');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (mutate, timezone = 'Asia/Kolkata', extra = {}) => {
  const root = new Vue({
    data: {
      timezone, loaded: true, failed: false, ...extra,
    },
    render(h) {
      return h(Container, {
        props: { timezone: this.timezone, loaded: this.loaded, failed: this.failed },
      });
    },
  }).$mount();
  const container = root.$children[0];
  container.$apollo = { mutate };
  const events = [];
  ['saved', 'failed', 'changed', 'format-changed'].forEach((name) => {
    container.$on(name, (...args) => events.push([name, ...args]));
  });
  const emitted = [];
  root.$on('timeFormatChanged', (value) => emitted.push(value));
  return {
    root, container, el: root.$el, events, emitted,
  };
};

const select = (el) => el.querySelector('[data-testid="profile-timezone"]');
const pick = (el, value) => {
  const node = select(el);
  node.value = value;
  node.dispatchEvent(new Event('change'));
};

describe('ProfileTimeContainer — the time zone', () => {
  it('saves through the mutation', async () => {
    const mutate = jest.fn(() => Promise.resolve({ data: {} }));
    const { el, events } = mount(mutate);

    pick(el, 'Asia/Tokyo');
    await flush();

    expect(mutate).toHaveBeenCalledWith({
      mutation: UPDATE_USER_TIMEZONE_MUTATION,
      variables: { timezone: 'Asia/Tokyo' },
    });
    expect(events).toEqual([
      ['saved', '(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk'],
      ['changed'],
    ]);
  });

  it('shows the picked zone at once, without disabling the select', async () => {
    let resolveMutation;
    const { el, container } = mount(() => new Promise((resolve) => { resolveMutation = resolve; }));

    pick(el, 'Europe/London');
    await Vue.nextTick();

    expect(select(el).value).toBe('Europe/London');
    expect(select(el).disabled).toBe(false);

    resolveMutation({ data: {} });
    await flush();
    expect(container.pending).toBe('Europe/London');
  });

  it('stops echoing once the re-read confirms the new zone', async () => {
    const { root, container, el } = mount(() => Promise.resolve({ data: {} }));
    pick(el, 'Europe/London');
    await flush();
    expect(container.pending).toBe('Europe/London');

    root.timezone = 'Europe/London';
    await Vue.nextTick();
    expect(container.pending).toBeNull();
    expect(select(el).value).toBe('Europe/London');
  });

  it('puts the saved zone back when the server refuses', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { el, events } = mount(() => Promise.reject(new Error('offline')));

    pick(el, 'Europe/London');
    await flush();
    await Vue.nextTick();

    expect(select(el).value).toBe('Asia/Kolkata');
    expect(events).toEqual([['failed', 'Your time zone is unchanged']]);
    console.error.mockRestore();
  });

  it('does not re-save the zone already showing', async () => {
    const mutate = jest.fn();
    const { el } = mount(mutate);
    pick(el, 'Asia/Kolkata');
    await flush();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('falls back to the shipped default when the server has no zone', () => {
    const { el } = mount(jest.fn(), '');
    expect(select(el).value).toBe('Asia/Kolkata');
  });
});

describe('ProfileTimeContainer — before the profile has loaded', () => {
  it('shows no zone at all rather than the Asia/Kolkata default', () => {
    const { el } = mount(jest.fn(), '', { loaded: false });
    const options = select(el).querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(select(el).value).toBe('');
    expect(el.textContent).not.toContain('Bombay');
  });

  it('says the read failed when it did', () => {
    const { el } = mount(jest.fn(), '', { loaded: false, failed: true });
    expect(select(el).textContent).toContain("Couldn't load your time zone");
  });

  it('never saves a zone picked while the real one is unknown', async () => {
    const mutate = jest.fn();
    const { container } = mount(mutate, '', { loaded: false });
    container.setTimezone('America/New_York');
    await flush();
    expect(mutate).not.toHaveBeenCalled();
    expect(container.pending).toBeNull();
  });

  it('offers the full list once the read lands', async () => {
    const { root, el } = mount(jest.fn(), '', { loaded: false });
    root.timezone = 'America/New_York';
    root.loaded = true;
    await Vue.nextTick();
    expect(select(el).querySelectorAll('option').length).toBeGreaterThan(1);
  });
});

describe('ProfileTimeContainer — the time format', () => {
  beforeEach(() => localStorage.clear());

  it('persists the choice where every other screen reads it', async () => {
    const { el, events, emitted } = mount(jest.fn());

    el.querySelectorAll('[data-testid="sliding-switch-segment"]')[0].click();
    await Vue.nextTick();

    expect(localStorage.getItem('timeFormat')).toBe('12');
    // What TimeFormatMixin listens for, so rendered times re-render.
    expect(emitted).toEqual(['12']);
    expect(events).toEqual([['format-changed', '12', '12-hour · 6:30 PM']]);
  });

  it('previews the format it switched to', async () => {
    const { el } = mount(jest.fn());
    expect(el.querySelector('[data-testid="profile-time-preview"]').textContent.trim())
      .toBe('09:00 · 18:30');

    el.querySelectorAll('[data-testid="sliding-switch-segment"]')[0].click();
    await Vue.nextTick();
    expect(el.querySelector('[data-testid="profile-time-preview"]').textContent.trim())
      .toBe('9:00 AM · 6:30 PM');
  });

  it('reads the saved preference on mount', () => {
    localStorage.setItem('timeFormat', '12');
    const { el } = mount(jest.fn());
    expect(el.querySelector('[data-testid="profile-time-preview"]').textContent.trim())
      .toBe('9:00 AM · 6:30 PM');
  });

  it('never writes a timezone mutation for a format change', async () => {
    const mutate = jest.fn();
    const { el } = mount(mutate);
    el.querySelectorAll('[data-testid="sliding-switch-segment"]')[0].click();
    await flush();
    expect(mutate).not.toHaveBeenCalled();
  });
});
