/* eslint-env jest */
/**
 * NewGoalSheet — one field and two choices.
 *
 * What matters here: the level chips are the five cascade levels, the routine row
 * only offers "No routine" where a goal is genuinely allowed to have none
 * (lifetime), an empty body cannot be submitted, and the draft resets on OPEN
 * rather than on every prop change — otherwise reopening the sheet would hand the
 * user back the sentence they already filed.
 */
const Vue = require('vue');

const NewGoalSheet = require('./NewGoalSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROUTINES = [
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'sw', name: 'Start Work', time: '09:00' },
];

const render = (props = {}) => {
  const submitted = [];
  const closed = [];
  const host = new Vue({
    data() {
      return {
        bound: {
          open: true, shell: 'phone', period: 'day', taskRef: 'sw', routines: ROUTINES, hint: 'For today · counts toward the week', ...props,
        },
      };
    },
    render(h) {
      return h(NewGoalSheet, {
        props: this.bound,
        on: { submit: (payload) => submitted.push(payload), close: () => closed.push(true) },
      });
    },
  }).$mount();
  return {
    host, sheet: host.$children[0], submitted, closed, el: () => host.$el,
  };
};

const q = (vm, testid) => vm.$el.querySelector(`[data-testid="${testid}"]`);

describe('NewGoalSheet', () => {
  it('offers the five cascade levels, with Today named Day in a form', () => {
    const { sheet } = render();
    expect(sheet.PERIOD_CHIPS.map((chip) => chip.label)).toEqual(['Day', 'Week', 'Month', 'Year', 'Life']);
    expect(q(sheet, 'new-goal-period-lifetime').textContent).toBe('Life');
  });

  it('opens on the level the ladder was showing', () => {
    expect(render({ period: 'month' }).sheet.draft.period).toBe('month');
  });

  it('pre-selects the routine whose window contains now', () => {
    const { sheet } = render();
    expect(sheet.draft.taskRef).toBe('sw');
    expect(q(sheet, 'new-goal-routine-sw').className).toContain('rn-ngoal__chip--on');
  });

  it('labels each routine chip with its clock time', () => {
    const { sheet } = render();
    expect(q(sheet, 'new-goal-routine-mp').textContent).toBe('06:30 Morning Pages');
  });

  it('only offers "No routine" for a lifetime goal, which may have none', async () => {
    const { sheet } = render();
    expect(q(sheet, 'new-goal-routine-none')).toBeNull();
    q(sheet, 'new-goal-period-lifetime').click();
    await Vue.nextTick();
    expect(q(sheet, 'new-goal-routine-none').textContent).toBe('No routine');
    expect(sheet.routineLabel).toBe('LINK TO A ROUTINE (OPTIONAL)');
  });

  it('re-places its placeholder on the level chosen', async () => {
    const { sheet } = render();
    expect(sheet.placeholder).toBe('e.g. Write release notes');
    q(sheet, 'new-goal-period-year').click();
    await Vue.nextTick();
    expect(sheet.placeholder).toBe('e.g. Learn Spanish to B1');
  });

  it('tells the container which level was chosen so its hint can follow', () => {
    const { sheet } = render();
    const changes = [];
    sheet.$on('period-change', (key) => changes.push(key));
    q(sheet, 'new-goal-period-year').click();
    expect(changes).toEqual(['year']);
  });

  it('refuses an empty body', () => {
    const { sheet, submitted } = render();
    q(sheet, 'new-goal-submit').click();
    expect(submitted).toEqual([]);
    expect(sheet.ready).toBe(false);
  });

  it('refuses whitespace too, and trims what it does send', async () => {
    const { sheet, submitted } = render();
    sheet.draft.body = '   ';
    await Vue.nextTick();
    q(sheet, 'new-goal-submit').click();
    expect(submitted).toEqual([]);
    sheet.draft.body = '  Write release notes  ';
    await Vue.nextTick();
    q(sheet, 'new-goal-submit').click();
    expect(submitted).toEqual([{ period: 'day', body: 'Write release notes', taskRef: 'sw' }]);
  });

  it('sends an empty routine for a lifetime goal that links to none', async () => {
    const { sheet, submitted } = render();
    q(sheet, 'new-goal-period-lifetime').click();
    sheet.draft.body = 'Run a marathon';
    sheet.draft.taskRef = '';
    await Vue.nextTick();
    q(sheet, 'new-goal-submit').click();
    expect(submitted).toEqual([{ period: 'lifetime', body: 'Run a marathon', taskRef: '' }]);
  });

  it('shows the Add button as ready only once there is something to add', async () => {
    const { sheet } = render();
    expect(q(sheet, 'new-goal-submit').className).not.toContain('rn-ngoal__add--ready');
    sheet.draft.body = 'Ship it';
    await Vue.nextTick();
    expect(q(sheet, 'new-goal-submit').className).toContain('rn-ngoal__add--ready');
  });

  it('keeps the typed draft while other props change, and resets it on reopen', async () => {
    const { host, sheet } = render();
    sheet.draft.body = 'half a sentence';
    host.bound = { ...host.bound, hint: 'For 8 Sep' };
    await Vue.nextTick();
    expect(sheet.draft.body).toBe('half a sentence');

    host.bound = { ...host.bound, open: false };
    await Vue.nextTick();
    host.bound = { ...host.bound, open: true, period: 'week' };
    await Vue.nextTick();
    expect(sheet.draft).toEqual({ period: 'week', body: '', taskRef: 'sw' });
  });

  it('takes the chassis 500px width on a centred dialog', () => {
    const { sheet } = render({ shell: 'desktop' });
    expect(sheet.SHEET_WIDTH).toBe(500);
    expect(sheet.$el.querySelector('.rn-rsheet__panel').style.width).toBe('500px');
  });
});
