/* eslint-env jest */
/**
 * Profile's identity card.
 *
 * The design draws "128" points and a "6-day streak" on it. Neither figure has an
 * owner on this page — `AppShellContainer` owns the one `xpBalance` read and no
 * query returns a streak at all — so the chips are conditional: an unknown
 * balance renders nothing rather than a confident 0 (D-10).
 */
const Vue = require('vue');

const ProfileIdentityCard = require('./ProfileIdentityCard.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(ProfileIdentityCard, {
      props: { name: 'Gaurav Panchal', email: 'g@example.com', ...props },
    }),
  }).$mount();
  return { vm, card: vm.$children[0], el: vm.$el };
};

const node = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('MoleculeProfileIdentityCard', () => {
  it('shows who you are', () => {
    const { el } = mount();
    expect(node(el, 'profile-identity-name').textContent.trim()).toBe('Gaurav Panchal');
    expect(node(el, 'profile-identity-email').textContent.trim()).toBe('g@example.com');
  });

  it('falls back to the shell\'s own avatar when there is no picture', () => {
    expect(node(mount().el, 'profile-identity-avatar').getAttribute('src'))
      .toBe('/img/default-user.png');
    expect(node(mount({ picture: 'https://example.com/me.png' }).el, 'profile-identity-avatar')
      .getAttribute('src')).toBe('https://example.com/me.png');
  });

  it('draws no points chip while the balance is unknown', () => {
    const { el } = mount();
    expect(node(el, 'profile-identity-points')).toBeNull();
    expect(el.textContent).not.toContain('0');
  });

  it('draws the chips once there are real figures', () => {
    const { el } = mount({ points: 128, streakDays: 6 });
    expect(node(el, 'profile-identity-points').textContent).toContain('128');
    expect(node(el, 'profile-identity-streak').textContent).toContain('6-day streak');
  });

  it('shows a genuine zero balance, which is not the same as unknown', () => {
    expect(node(mount({ points: 0 }).el, 'profile-identity-points').textContent).toContain('0');
  });

  it('renders an unknown name empty, never the app name', () => {
    const { el } = mount({ name: '' });
    expect(node(el, 'profile-identity-name').textContent.trim()).toBe('');
    expect(el.textContent).not.toContain('Routine Notes');
  });

  it('emits sign-out rather than knowing how to sign out', () => {
    const { card, el } = mount();
    const out = [];
    card.$on('sign-out', () => out.push(true));
    node(el, 'profile-identity-signout').click();
    expect(out).toEqual([true]);
  });
});
