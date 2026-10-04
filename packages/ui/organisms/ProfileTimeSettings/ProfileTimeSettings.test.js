/* eslint-env jest */
/**
 * Profile's TIME card.
 *
 * Three things the design got wrong or left implicit are guarded here: the real
 * timezone list and its label format, the two time-format previews, and that
 * nothing on this card is ever disabled (ARCHITECTURE.md § 3.7 — the `busy` prop
 * is gone and must not come back through a `disabled` attribute).
 */
const Vue = require('vue');

const ProfileTimeSettings = require('./ProfileTimeSettings.vue').default;
const { TIMEZONE_OPTIONS, PROFILE_SETTINGS } = require('../../constants/settings');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({ render: (h) => h(ProfileTimeSettings, { props }) }).$mount();
  return { vm, panel: vm.$children[0], el: vm.$el };
};

const text = (el, selector) => el.querySelector(selector).textContent.trim();

describe('OrganismProfileTimeSettings — the time-format preview', () => {
  it('previews two 24-hour times', () => {
    const { el } = mount({ timeFormat: '24' });
    expect(text(el, '[data-testid="profile-time-preview"]')).toBe('09:00 · 18:30');
  });

  it('previews two 12-hour times', () => {
    const { el } = mount({ timeFormat: '12' });
    expect(text(el, '[data-testid="profile-time-preview"]')).toBe('9:00 AM · 6:30 PM');
  });

  it('puts the thumb on the half the format names', () => {
    const left = (format) => mount({ timeFormat: format }).el
      .querySelector('[data-testid="sliding-switch-indicator"]').style.left;
    // SlidingSwitch's thumb geometry is `3px + i * (100% - 6px) / n`, which the
    // browser folds: index 0 of 2 stays at the 3px origin, index 1 lands halfway.
    expect(left('12')).not.toBe(left('24'));
    expect(left('12')).toContain('3px');
    expect(left('24')).toContain('0.5');
  });

  it('asks for a change rather than owning the value', () => {
    const { panel, el } = mount({ timeFormat: '24' });
    const changes = [];
    panel.$on('change-time-format', (value) => changes.push(value));
    el.querySelectorAll('[data-testid="sliding-switch-segment"]')[0].click();
    expect(changes).toEqual(['12']);
  });

  it('accepts the "24h" spelling PROFILE_SETTINGS uses', () => {
    const { el } = mount({ timeFormat: PROFILE_SETTINGS.timeFormat });
    expect(text(el, '[data-testid="profile-time-preview"]')).toBe('09:00 · 18:30');
  });
});

describe('OrganismProfileTimeSettings — the time zone', () => {
  it('shows the saved zone when the options and the zone arrive in the same tick', async () => {
    // The profile finishing its load swaps a one-entry placeholder list for the
    // full list AND sets the zone at once; the browser must not fall back to the
    // first option (the "-12:00 Kwajalein" regression).
    const host = new Vue({
      data: () => ({
        timezone: '',
        timezoneOptions: [{ value: '', label: 'Loading your time zone…' }],
      }),
      render(h) {
        return h(ProfileTimeSettings, {
          props: { timezone: this.timezone, timezoneOptions: this.timezoneOptions },
        });
      },
    }).$mount();
    host.timezoneOptions = TIMEZONE_OPTIONS;
    host.timezone = 'America/New_York';
    await Vue.nextTick();
    expect(host.$el.querySelector('[data-testid="profile-timezone"]').value).toBe('America/New_York');
  });

  it('offers the real IANA list, not the mock\'s five entries', () => {
    const { el } = mount();
    const options = el.querySelectorAll('[data-testid="profile-timezone"] option');
    expect(options.length).toBe(TIMEZONE_OPTIONS.length);
    expect(options.length).toBeGreaterThan(30);
  });

  it('uses the real label format', () => {
    const { el } = mount();
    const labels = Array.from(el.querySelectorAll('[data-testid="profile-timezone"] option'))
      .map((option) => option.textContent.trim());
    expect(labels).toContain('(GMT +5:30) Bombay, Calcutta, Madras, New Delhi');
    // The mock's own format, which must not have been copied in.
    expect(labels).not.toContain('India (GMT+5:30)');
  });

  it('selects the saved zone', () => {
    const { el } = mount({ timezone: 'Europe/London' });
    expect(el.querySelector('[data-testid="profile-timezone"]').value).toBe('Europe/London');
  });

  it('emits the picked zone', () => {
    const { panel, el } = mount({ timezone: 'Asia/Kolkata' });
    const picked = [];
    panel.$on('change-timezone', (value) => picked.push(value));
    const select = el.querySelector('[data-testid="profile-timezone"]');
    select.value = 'Asia/Tokyo';
    select.dispatchEvent(new Event('change'));
    expect(picked).toEqual(['Asia/Tokyo']);
  });

  // The old page carried `:disabled="savingTimezone"`. A control is never gated
  // on a request in flight — the container echoes the new value instead.
  it('never disables the select', () => {
    const { el } = mount();
    expect(el.querySelector('[data-testid="profile-timezone"]').disabled).toBe(false);
  });
});

describe('OrganismProfileTimeSettings — what is fixed', () => {
  it('locks the start of the week with a glyph, not a banner', () => {
    const { el } = mount();
    expect(text(el, '[data-testid="profile-week-lock"]')).toBe('lock');
    expect(el.textContent).not.toContain('READ ONLY');
  });

  it('says what the fixed week actually means', () => {
    expect(mount().el.textContent).toContain('Weeks run Sunday to Saturday');
    expect(mount({ weekStart: 'mon' }).el.textContent).toContain('Weeks run Monday to Sunday');
  });

  it('marks the active day in the locked pill', () => {
    const { el } = mount();
    const on = el.querySelectorAll('[data-testid="profile-week-start"] .rn-ptime__locked-seg--on');
    expect(on).toHaveLength(1);
    expect(on[0].textContent.trim()).toBe('Sun');
  });
});
