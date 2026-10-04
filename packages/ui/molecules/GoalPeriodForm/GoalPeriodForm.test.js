/* eslint-env jest */
/**
 * The create / edit sheet's body. The point of the test is the LOCK: the parent
 * is shown and cannot be changed, because the sheet was opened from inside that
 * parent and re-parenting here would move the goal off the card you are looking
 * at.
 */
const Vue = require('vue');

const GoalPeriodForm = require('./GoalPeriodForm.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const DRAFT = {
  kind: 'week',
  period: 'week',
  date: '18-09-2026',
  goalRef: 'm9',
  parentLabel: 'Launch mobile dashboard',
  periodIcon: 'view_week',
  periodLabel: 'Week 38 · 13 – 19 Sep',
  placeholder: 'e.g. Beta feedback triage',
  title: 'New week goal',
};

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render: (h) => h(GoalPeriodForm, {
      props: { draft: DRAFT, value: '', ...props },
      on: {
        input: (v) => events.push(['input', v]),
        submit: () => events.push(['submit']),
      },
    }),
  }).$mount();
  return { el: vm.$el, events };
};

describe('MoleculeGoalPeriodForm', () => {
  it('shows the period the goal will land in', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="goal-period-form-period"]').textContent)
      .toContain('Week 38 · 13 – 19 Sep');
  });

  it('shows the parent as a locked chip — a glyph, not a control', () => {
    const { el } = render();
    const parent = el.querySelector('[data-testid="goal-period-form-parent"]');
    expect(parent.textContent).toContain('Launch mobile dashboard');
    expect(parent.querySelector('[data-testid="goal-period-form-lock"]').textContent.trim())
      .toBe('lock');
    // Nothing inside the chip can be clicked, typed into, or chosen from.
    expect(parent.querySelector('button')).toBeNull();
    expect(parent.querySelector('input')).toBeNull();
    expect(parent.querySelector('select')).toBeNull();
  });

  it('omits the chip entirely when there is no parent to lock', () => {
    const { el } = render({ draft: { ...DRAFT, parentLabel: '' } });
    expect(el.querySelector('[data-testid="goal-period-form-parent"]')).toBeNull();
  });

  it('types the body up and submits on Enter', () => {
    const { el, events } = render();
    const input = el.querySelector('[data-testid="goal-period-form-input"]');
    input.value = 'Beta feedback triage';
    input.dispatchEvent(new Event('input'));
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(enter);
    expect(events).toEqual([['input', 'Beta feedback triage'], ['submit']]);
  });

  it('says Add for a new goal and Save for an edit', () => {
    expect(render().el.querySelector('[data-testid="goal-period-form-submit"]').textContent.trim())
      .toBe('Add');
    expect(render({ draft: { ...DRAFT, edit: 'w1' } })
      .el.querySelector('[data-testid="goal-period-form-submit"]').textContent.trim())
      .toBe('Save');
  });

  it('greys the CTA until there is something to add — without disabling it', () => {
    const empty = render().el.querySelector('[data-testid="goal-period-form-submit"]');
    expect(empty.style.background).toBe('rgba(0, 0, 0, 0.2)');
    expect(empty.disabled).toBe(false);
    const filled = render({ value: 'Beta triage' })
      .el.querySelector('[data-testid="goal-period-form-submit"]');
    expect(filled.style.background).toBe('rgb(40, 139, 213)');
  });
});
