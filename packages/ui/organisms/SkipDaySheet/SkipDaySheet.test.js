/* eslint-env jest */
/**
 * SkipDaySheet — one question, two directions.
 *
 * The copy is the feature: the thing people hesitate over is whether skipping
 * costs them their streak, so the consequence line has to lead with the fact that
 * it does not. The reason field only exists in the skip direction — there is
 * nothing to explain about turning routines back on.
 */
const Vue = require('vue');

const SkipDaySheet = require('./SkipDaySheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(SkipDaySheet, {
        props: { open: true, dayLabel: 'Saturday, 12 September', ...props },
      });
    },
  }).$mount();
  const sheet = vm.$children[0];
  const events = { close: [], confirm: [] };
  Object.keys(events).forEach((name) => {
    sheet.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, sheet, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('SkipDaySheet — skipping', () => {
  it('asks about the named day and promises the streak survives', () => {
    const { el } = render();
    expect(q(el, 'skip-title').textContent).toBe('Skip Saturday, 12 September?');
    expect(q(el, 'skip-text').textContent)
      .toBe('Routines pause for the day. Your streak and history stay intact, '
        + 'and a skipped day doesn’t count against your efficiency.');
    expect(q(el, 'skip-confirm').textContent.trim()).toBe('Skip today');
  });

  it('offers an optional reason', () => {
    const { el } = render();
    expect(q(el, 'skip-reason').getAttribute('placeholder'))
      .toBe('Reason (optional) — travel, sick, rest day');
  });

  it('confirms with skip true and the trimmed reason', () => {
    const { el, events } = render();
    const reason = q(el, 'skip-reason');
    reason.value = '  travel  ';
    reason.dispatchEvent(new Event('input'));
    q(el, 'skip-confirm').click();
    expect(events.confirm).toEqual([{ skip: true, reason: 'travel' }]);
  });

  it('an empty reason is an empty string, not undefined', () => {
    const { el, events } = render();
    q(el, 'skip-confirm').click();
    expect(events.confirm).toEqual([{ skip: true, reason: '' }]);
  });
});

describe('SkipDaySheet — undoing', () => {
  it('asks the other question, with the other consequence', () => {
    const { el } = render({ skipped: true });
    expect(q(el, 'skip-title').textContent).toBe('Undo today’s skip?');
    expect(q(el, 'skip-text').textContent)
      .toBe('Routines come back on for today and ticks count again.');
    expect(q(el, 'skip-confirm').textContent.trim()).toBe('Undo skip');
  });

  it('has no reason field — there is nothing to explain', () => {
    const { el } = render({ skipped: true });
    expect(q(el, 'skip-reason')).toBeNull();
  });

  it('confirms with skip false', () => {
    const { el, events } = render({ skipped: true });
    q(el, 'skip-confirm').click();
    expect(events.confirm).toEqual([{ skip: false, reason: '' }]);
  });
});

describe('SkipDaySheet — refusal and dismissal', () => {
  it('shows the server reason verbatim — the weekly quota is actionable', () => {
    const { el } = render({ errorMessage: 'You have already skip 2 days this week.' });
    expect(q(el, 'skip-error').textContent.trim())
      .toBe('You have already skip 2 days this week.');
  });

  it('has no error block when nothing failed', () => {
    const { el } = render();
    expect(q(el, 'skip-error')).toBeNull();
  });

  it('Cancel closes without confirming', () => {
    const { el, events } = render();
    q(el, 'skip-cancel').click();
    expect(events.close).toHaveLength(1);
    expect(events.confirm).toEqual([]);
  });

  it('closing forgets a half-typed reason', async () => {
    const host = new Vue({
      data: () => ({ open: true }),
      render(h) {
        return h(SkipDaySheet, { props: { open: this.open, dayLabel: 'today' } });
      },
    }).$mount();
    const sheet = host.$children[0];
    sheet.reason = 'sick';
    host.open = false;
    await Vue.nextTick();
    expect(sheet.reason).toBe('');
  });
});
