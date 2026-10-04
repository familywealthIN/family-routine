/* eslint-env jest */
/**
 * The read-only half of Profile, rendered.
 *
 * The point of these tests is that the card cannot be edited back into the
 * mock's literals: every figure has to arrive through `PROFILE_SETTINGS`.
 */
const Vue = require('vue');

const ProfileRatesCard = require('./ProfileRatesCard.vue').default;
const { PROFILE_SETTINGS } = require('../../constants/settings');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => new Vue({
  render: (h) => h(ProfileRatesCard, { props }),
}).$mount().$el;

const text = (el, selector) => el.querySelector(selector).textContent.trim();

describe('MoleculeProfileRatesCard — the point rates', () => {
  it('prints the shipped rates, not the design\'s 3 h / 1 h / 25%', () => {
    const el = render();
    expect(text(el, '[data-testid="profile-rate-value-D"]')).toBe('24 h');
    expect(text(el, '[data-testid="profile-rate-value-K"]')).toBe('2 h');
    expect(text(el, '[data-testid="profile-rate-value-G"]')).toBe('25%');
    expect(el.textContent).not.toContain('3 h');
  });

  it('tints each card with its own D / K / G colour', () => {
    const el = render();
    expect(el.querySelector('[data-testid="profile-rate-D"]').style.background)
      .toContain('rgba(76, 175, 80');
    expect(el.querySelector('[data-testid="profile-rate-K"]').style.background)
      .toContain('rgba(229, 57, 53');
    expect(el.querySelector('[data-testid="profile-rate-G"]').style.background)
      .toContain('rgba(33, 150, 243');
  });

  it('re-renders from a settings object handed in, so the server can own them', () => {
    const el = render({
      settings: {
        ...PROFILE_SETTINGS, routineDiscipline: 8, taskKinetics: 1, goalGeniuses: 50,
      },
    });
    expect(text(el, '[data-testid="profile-rate-value-D"]')).toBe('8 h');
    expect(text(el, '[data-testid="profile-rate-value-G"]')).toBe('50%');
  });
});

describe('MoleculeProfileRatesCard — the roll-up chain', () => {
  it('ticks the year at 6 months, not the mock\'s 9', () => {
    const el = render();
    expect(text(el, '[data-testid="profile-rollup-year"]')).toContain('6');
    expect(text(el, '[data-testid="profile-rollup-year"]')).toContain('mos = yr');
    expect(text(el, '[data-testid="profile-rollup-chain"]')).not.toContain('9');
  });

  it('reads all four cells out of autoCheckThreshold', () => {
    const el = render();
    const cells = Array.from(el.querySelectorAll('.rn-prates__cell-n'))
      .map((node) => node.textContent.trim());
    expect(cells).toEqual(['1', '5', '3', '6']);
  });

  it('follows a threshold it is given rather than a literal', () => {
    const el = render({
      settings: { ...PROFILE_SETTINGS, autoCheckThreshold: { day: 4, week: 2, month: 8 } },
    });
    const cells = Array.from(el.querySelectorAll('.rn-prates__cell-n'))
      .map((node) => node.textContent.trim());
    expect(cells).toEqual(['1', '4', '2', '8']);
    expect(text(el, '[data-testid="profile-rollup-sentence"]')).toContain('8 months tick the year');
  });

  it('says the same thing in the sentence as in the chain', () => {
    expect(text(render(), '[data-testid="profile-rollup-sentence"]'))
      .toBe('5 day wins tick the week goal, 3 weeks tick the month, 6 months tick the year.');
  });
});

describe('MoleculeProfileRatesCard — read-only without a banner', () => {
  // The yellow "most settings here are READ ONLY" alert is gone; the lock moved
  // onto the sections it is actually true of.
  it('locks both section headers instead of warning above the card', () => {
    const el = render();
    const locks = Array.from(el.querySelectorAll('.rn-prates__lock'));
    expect(locks).toHaveLength(2);
    locks.forEach((lock) => expect(lock.textContent.trim()).toBe('lock'));
    expect(el.textContent).not.toContain('READ ONLY');
  });
});
