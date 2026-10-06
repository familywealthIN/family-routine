/* eslint-env jest */
/**
 * The invite sheet. The design's own "Try:" is the test: type "jo@" (invalid),
 * then "jo@family.com" — so each hint state is asserted as rendered copy, not
 * only as a return value from `inviteState`.
 */
const Vue = require('vue');

const GroupInviteSheet = require('./GroupInviteSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(GroupInviteSheet, {
      props: {
        open: true,
        shell: 'phone',
        email: '',
        taken: ['priya@shah.in'],
        slotsLeft: 6,
        ...props,
      },
    }),
  }).$mount();
  return { vm, sheet: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);
const hint = (props) => testid(render(props).el, 'group-invite-hint').textContent.trim();

describe('OrganismGroupInviteSheet', () => {
  it('opens nothing while closed', () => {
    // A closed ResponsiveSheet renders no element at all, only a placeholder.
    expect(render({ open: false }).el.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('says how many spots are left, out of ten', () => {
    expect(render().el.querySelector('.rn-ginvite__sub').textContent.replace(/\s+/g, ' '))
      .toContain('6 of 10 spots left.');
  });

  it('walks the five hint states', () => {
    expect(hint({ email: '' })).toBe('They need a Routine Notes account — the invite appears in their app.');
    expect(hint({ email: 'jo@' })).toBe('Keep typing…');
    expect(hint({ email: 'jo@', tried: true })).toBe('Enter a valid email address.');
    expect(hint({ email: 'priya@shah.in' })).toBe('Already in your group.');
    expect(hint({ email: 'jo@family.com' })).toBe('Looks good.');
  });

  it('dims Send until the address can actually be sent', () => {
    expect(testid(render({ email: 'jo@' }).el, 'group-invite-send').className)
      .toContain('rn-ginvite__send--off');
    expect(testid(render({ email: 'jo@family.com' }).el, 'group-invite-send').className)
      .not.toContain('rn-ginvite__send--off');
  });

  it('still emits send while dimmed — pressing it is how you ask for the hint', () => {
    const { sheet, el } = render({ email: 'jo@' });
    const events = [];
    sheet.$on('send', () => events.push('send'));
    testid(el, 'group-invite-send').click();
    expect(events).toEqual(['send']);
  });

  it('reports every keystroke up rather than owning the value', () => {
    const { sheet, el } = render({ email: 'jo' });
    const typed = [];
    sheet.$on('update:email', (value) => typed.push(value));

    const input = testid(el, 'group-invite-input');
    input.value = 'jo@family.com';
    input.dispatchEvent(new Event('input'));

    expect(typed).toEqual(['jo@family.com']);
  });

  it('shows Sending… and takes no presses while a send is in flight', () => {
    const { sheet, el } = render({ email: 'jo@family.com', sending: true });
    const events = [];
    sheet.$on('send', () => events.push('send'));
    const send = testid(el, 'group-invite-send');

    expect(send.textContent).toContain('Sending…');
    expect(send.disabled).toBe(true);
    send.click();
    expect(events).toEqual([]);
  });

  it('closes from Cancel', () => {
    const { sheet, el } = render();
    const events = [];
    sheet.$on('close', () => events.push('close'));
    testid(el, 'group-invite-cancel').click();
    expect(events).toEqual(['close']);
  });

  it('is a 560px dialog on tablet and desktop, a bottom sheet on phone', () => {
    const panel = (shell) => render({ shell }).el.querySelector('.rn-rsheet__panel');
    expect(panel('phone').className).toContain('rn-rsheet__panel--sheet');
    expect(panel('tablet').className).toContain('rn-rsheet__panel--dialog');
    expect(panel('tablet').style.width).toBe('560px');
    expect(panel('desktop').style.width).toBe('560px');
  });
});
