/* eslint-env jest */
/**
 * The Allow access page (`Profile and About.dc.html` § t3): who is asking,
 * where Allow sends you, and nothing to press until the request has checked out.
 */
const Vue = require('vue');

const ConnectConsent = require('./ConnectConsent.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(ConnectConsent, {
      props: {
        status: 'ready', clientName: 'Claude', redirectHost: 'claude.ai', email: 'alex@example.com', ...props,
      },
    }),
  }).$mount();
  return { vm, page: vm.$children[0], el: vm.$el };
};

const q = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismConnectConsent', () => {
  it('names the app, the account and where Allow goes', () => {
    const { el } = mount();
    expect(q(el, 'connect-consent-title').textContent.trim()).toBe('Allow Claude to use Routine Notes?');
    expect(el.textContent).toContain('Signed in as alex@example.com');
    expect(q(el, 'connect-consent-host').textContent).toBe('claude.ai');
    expect(q(el, 'connect-consent-initial').textContent).toBe('C');
  });

  it('falls back to the return host for an app with no name', () => {
    const { el } = mount({ clientName: '', redirectHost: 'n8n.example.com' });
    expect(q(el, 'connect-consent-title').textContent.trim()).toBe('Allow n8n.example.com to use Routine Notes?');
    expect(q(el, 'connect-consent-initial').textContent).toBe('N');
  });

  it('emits allow, cancel and switch-account, and nothing else decides', () => {
    const { page, el } = mount();
    const events = [];
    ['allow', 'cancel', 'switch-account'].forEach((name) => page.$on(name, () => events.push(name)));
    q(el, 'connect-consent-allow').click();
    q(el, 'connect-consent-cancel').click();
    q(el, 'connect-consent-switch').click();
    expect(events).toEqual(['allow', 'cancel', 'switch-account']);
  });

  it('cannot be pressed twice while allowing', () => {
    const { el } = mount({ status: 'working' });
    expect(q(el, 'connect-consent-allow').disabled).toBe(true);
    expect(q(el, 'connect-consent-cancel').disabled).toBe(true);
    expect(q(el, 'connect-consent-allow').textContent.trim()).toBe('Allowing…');
  });

  it('shows no Allow until the request has checked out', () => {
    const loading = mount({ status: 'loading' }).el;
    expect(q(loading, 'connect-consent-loading')).not.toBeNull();
    expect(q(loading, 'connect-consent-allow')).toBeNull();

    const { page, el } = mount({ status: 'invalid' });
    expect(q(el, 'connect-consent-allow')).toBeNull();
    expect(el.textContent).toContain("This connection link isn't valid");
    const back = [];
    page.$on('back', () => back.push(true));
    q(el, 'connect-consent-back').click();
    expect(back).toEqual([true]);
  });
});
