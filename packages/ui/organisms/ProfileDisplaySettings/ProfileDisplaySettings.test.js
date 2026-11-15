/* eslint-env jest */
/**
 * Profile's DISPLAY card (iPad and tablets): Always on display.
 */
const Vue = require('vue');

const ProfileDisplaySettings = require('./ProfileDisplaySettings.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({ render: (h) => h(ProfileDisplaySettings, { props }) }).$mount();
  return { vm, panel: vm.$children[0], el: vm.$el };
};

const text = (el, id) => el.querySelector(`[data-testid="${id}"]`).textContent.trim();
const segments = (el) => el.querySelectorAll('[data-testid="sliding-switch-segment"]');

describe('OrganismProfileDisplaySettings', () => {
  it('is off by default, and says what turning it on does', () => {
    const { el } = mount();
    expect(text(el, 'profile-always-on-sub')).toBe('Keep this screen on while Routine Notes is open');
    expect(text(el, 'profile-always-on-icon')).toBe('bedtime');
    expect([...segments(el)].map((s) => s.textContent.trim())).toEqual(['Off', 'On']);
  });

  it('says the screen stays on once it is on', () => {
    const { el } = mount({ alwaysOn: true });
    expect(text(el, 'profile-always-on-sub')).toBe('This screen stays on while Routine Notes is open');
    expect(text(el, 'profile-always-on-icon')).toBe('light_mode');
  });

  it('puts the thumb on the half that is chosen', () => {
    const left = (alwaysOn) => mount({ alwaysOn }).el
      .querySelector('[data-testid="sliding-switch-indicator"]').style.left;
    expect(left(false)).toContain('3px');
    expect(left(true)).toContain('0.5');
  });

  it('asks for a change, and only when it is a change', () => {
    const { panel, el } = mount({ alwaysOn: false });
    const changes = [];
    panel.$on('change-always-on', (value) => changes.push(value));
    segments(el)[0].click();
    segments(el)[1].click();
    expect(changes).toEqual([true]);
  });

  it('is never disabled', () => {
    const { el } = mount();
    expect(el.querySelector('[disabled]')).toBeNull();
  });
});
