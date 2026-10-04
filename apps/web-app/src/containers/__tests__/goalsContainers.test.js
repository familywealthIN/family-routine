/* eslint-env jest */
/**
 * The Goals page's containers — the read wiring, which is where a silent mistake
 * would hide.
 *
 * The one that matters most is negative: the calendar's month read must NOT select
 * `progress`. `goalsOptimized` never computes it, both reads normalize into the
 * same `GoalItem:<id>` records, and Apollo 2.x has no field `merge` to protect one
 * — so asking for it would write null over the streak count the cascade read just
 * published, and every bar on the page would blink to an em dash on each month
 * read (ARCHITECTURE § 3.2).
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const { print } = require('graphql');

const {
  AGENDA_GOALS_QUERY,
  GOALS_CALENDAR_QUERY,
  ROUTINE_INDEX_QUERY,
} = require('../../composables/graphql/goalsQueries');
const { AGENDA_GOALS_QUERY: FROM_QUERIES } = require('../../composables/graphql/queries');
const { AGENT_ROUTINE_ITEMS_QUERY } = require('../../composables/graphql/agentQueries');

const GoalCalendarContainer = require('../GoalCalendarContainer.vue').default;
const GoalsCascadeContainer = require('../GoalsCascadeContainer.vue').default;
const GoalRoutineIndexContainer = require('../GoalRoutineIndexContainer.vue').default;
const GoalItemCreateContainer = require('../GoalItemCreateContainer.vue').default;

const TODAY = '12-09-2026';

describe('the two reads', () => {
  it('leaves `progress` out of the month read, because that resolver cannot fill it', () => {
    const text = print(GOALS_CALENDAR_QUERY);
    expect(text).toContain('goalsOptimized(currentMonth: $currentMonth)');
    expect(text).not.toMatch(/\bprogress\b/);
    expect(text).not.toMatch(/milestones/);
  });

  it('takes `progress` from the cascade read, which does compute it', () => {
    expect(print(AGENDA_GOALS_QUERY)).toMatch(/\bprogress\b/);
  });

  it('re-exports the existing documents instead of declaring second owners', () => {
    expect(AGENDA_GOALS_QUERY).toBe(FROM_QUERIES);
    expect(ROUTINE_INDEX_QUERY).toBe(AGENT_ROUTINE_ITEMS_QUERY);
  });

  it('reads both display queries cache-and-network, so a stale slice self-heals', () => {
    expect(GoalCalendarContainer.apollo.monthGoals.fetchPolicy).toBe('cache-and-network');
    expect(GoalsCascadeContainer.apollo.goals.fetchPolicy).toBe('cache-and-network');
    expect(GoalRoutineIndexContainer.apollo.routineItems.fetchPolicy).toBe('cache-and-network');
  });
});

describe('GoalCalendarContainer', () => {
  const call = (name, context) => GoalCalendarContainer.computed[name].call(context);
  /**
   * Computeds are called in isolation here, so the two that the others read
   * (`month`, and `monthEnd` for the query variables) are resolved up front —
   * the same way Vue would have.
   */
  const vm = (selectedDate = TODAY, monthDate = '') => {
    const base = {
      selectedDate, monthDate, today: TODAY, monthGoals: [],
    };
    base.month = call('month', base);
    base.monthEnd = call('monthEnd', base);
    return base;
  };

  it('keys the month by its last day, which is what the server expects', () => {
    expect(call('monthEnd', vm())).toBe('30-09-2026');
    expect(call('monthEnd', vm('03-02-2027'))).toBe('28-02-2027');
  });

  it('titles the grid with the month the selected day is in', () => {
    expect(call('monthLabel', vm())).toBe('September 2026');
    expect(call('monthLabel', vm('03-02-2027'))).toBe('February 2027');
  });

  describe('stepping months', () => {
    /**
     * `monthDate` is the ONLY thing a chevron moves. It is a separate variable
     * from `selectedDate` on purpose: the cascade read is keyed on the selected
     * date and its resolver WRITES (`autoCheckTaskPeriod`), so browsing months
     * must not drag the selection along behind it.
     */
    const stepped = (monthDate) => vm(TODAY, monthDate);

    it('falls back to the selection before anyone steps the month', () => {
      expect(call('month', stepped(''))).toBe(TODAY);
      expect(call('monthEnd', stepped(''))).toBe('30-09-2026');
    });

    it('reads and titles the month in view, not the month the selection is in', () => {
      const back = stepped('01-07-2026');
      expect(call('monthEnd', back)).toBe('31-07-2026');
      expect(call('monthLabel', back)).toBe('July 2026');
      const forward = stepped('01-11-2026');
      expect(call('monthEnd', forward)).toBe('30-11-2026');
      expect(call('monthLabel', forward)).toBe('November 2026');
    });

    it('grids the month in view while the selection stays where it was', () => {
      const cells = call('cells', stepped('01-07-2026'));
      const real = cells.filter((cell) => !cell.blank);
      expect(real.length).toBe(31);
      expect(real[0].date).toBe('01-07-2026');
      // September's 12th is still the selection; July has no selected cell.
      expect(real.some((cell) => cell.selected)).toBe(false);
    });

    /**
     * A past month needs no `goalsPast`: `goalsOptimized`'s day branch is every
     * date in the asked-for month, past days included. A second query over the
     * same `GoalItem` records would only be a second cache owner.
     */
    it('answers a past month from the one month query', () => {
      expect(GoalCalendarContainer.apollo.monthGoals.variables.call(stepped('01-07-2026')))
        .toEqual({ currentMonth: '31-07-2026' });
    });

    it('still does not select `progress` for whatever month it lands on', () => {
      expect(print(GOALS_CALENDAR_QUERY)).not.toMatch(/\bprogress\b/);
    });
  });

  it('builds the cells from the month read, not from a second query', () => {
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      monthGoals: [{
        id: 'g1', period: 'day', date: '11-09-2026', goalItems: [{ id: 'a', isComplete: true }],
      }],
    };
    const cells = call('cells', context);
    expect(cells.length).toBe(35);
    expect(cells.find((cell) => cell.day === 11)).toMatchObject({ total: 1, done: 1, value: 100 });
  });

  it('refetches only its own query when the page asks it to', () => {
    let refetched = 0;
    const context = { $apollo: { queries: { monthGoals: { refetch: () => { refetched += 1; return Promise.resolve(); } } } } };
    GoalCalendarContainer.methods.refresh.call(context);
    expect(refetched).toBe(1);
    // A container mounted without Apollo must not throw on refresh.
    expect(() => GoalCalendarContainer.methods.refresh.call({})).not.toThrow();
  });
});

describe('GoalsCascadeContainer', () => {
  const ROUTINES = [{ id: 'sw', name: 'Start Work', time: '09:00' }];

  describe('while a newly picked day loads', () => {
    const pending = (loading, loadedDate, selectedDate = '07-10-2026') => GoalsCascadeContainer.computed
      .pendingDate.call({ $apollo: { queries: { goals: { loading } } }, loadedDate, selectedDate });

    it('is pending until the read answers for the selected day', () => {
      expect(pending(true, '03-10-2026')).toBe(true);
      expect(pending(true, '')).toBe(true);
    });

    it('is not pending once that day answered, even during a background refetch', () => {
      expect(pending(true, '07-10-2026')).toBe(false);
      expect(pending(false, '03-10-2026')).toBe(false);
    });

    it('records which day a result belongs to', () => {
      const ctx = { selectedDate: '07-10-2026', loadedDate: '', readFailed: true };
      GoalsCascadeContainer.apollo.goals.result.call(ctx, { data: { agendaGoals: [] } });
      expect(ctx.loadedDate).toBe('07-10-2026');
      expect(ctx.readFailed).toBe(false);
      GoalsCascadeContainer.apollo.goals.result.call({ ...ctx, loadedDate: 'x' }, { data: undefined });
    });
  });

  const context = (overrides = {}) => {
    const emitted = [];
    const base = {
      routines: ROUTINES,
      view: {
        isToday: true,
        items: {
          day: [
            { id: 'd1', taskRef: 'sw', isComplete: true },
            { id: 'd2', taskRef: 'sw', isComplete: false },
          ],
          week: [{
            id: 'w1', body: 'Ship it', taskRef: 'sw', progress: 4, period: 'week', date: '11-09-2026',
          }],
          month: [],
          year: [{
            id: 'y1', body: 'Ship v2', taskRef: 'sw', progress: 3, period: 'year', date: '31-12-2026',
          }],
          lifetime: [],
        },
      },
      $emit: (name, payload) => emitted.push([name, payload]),
      ...overrides,
    };
    return { ctx: base, emitted };
  };

  it('hands the page a plan rather than writing anything itself', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.methods.onToggleRow.call(ctx, {
      id: 'd2', period: 'day', date: TODAY, taskRef: 'sw', done: false,
    });
    expect(emitted.length).toBe(1);
    const [name, plan] = emitted[0];
    expect(name).toBe('tick');
    expect(plan.ticks.map((tick) => tick.period)).toEqual(['day', 'week']);
    expect(plan.toast.title).toContain('auto-ticked');
  });

  /**
   * A row carries only what it draws. The editor needs the WHOLE item — tags,
   * subtasks, `goalRef` — plus the period + date the mutations are addressed to,
   * which is why the row id is resolved back against this container's own read
   * instead of the page reaching into it.
   */
  it('resolves an edit back to the complete goal item, with its address', () => {
    const { ctx, emitted } = context({
      view: {
        isToday: true,
        items: {
          day: [{
            id: 'd2',
            body: 'Ship it',
            taskRef: 'sw',
            goalRef: 'wg1',
            tags: ['area:product'],
            subTasks: [{ id: 's1', body: 'Fix offsets', isComplete: false }],
            isMilestone: true,
            period: 'day',
            date: TODAY,
          }],
          week: [],
          month: [],
          year: [{ id: 'y1', period: 'year', date: '31-12-2026' }],
          lifetime: [],
        },
      },
    });
    GoalsCascadeContainer.methods.onEditRow.call(ctx, { id: 'd2', period: 'day' });
    expect(emitted.length).toBe(1);
    const [name, item] = emitted[0];
    expect(name).toBe('edit');
    expect(item).toMatchObject({
      id: 'd2', period: 'day', date: TODAY, goalRef: 'wg1', isMilestone: true,
    });
    expect(item.tags).toEqual(['area:product']);
    expect(item.subTasks.length).toBe(1);
  });

  it('never edits a year goal from here — it has its own page', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.methods.onEditRow.call(ctx, { id: 'y1', period: 'year' });
    expect(emitted).toEqual([]);
  });

  /**
   * Delete moved OUT of the editor and onto the row — where DashBoard has it —
   * so the resolution is the same one `edit-row` does, and what goes up is the
   * address `deleteGoalItem` is sent to plus the body the confirmation names. The
   * mutation itself is never run here: the server cascades it to every transitive
   * `goalRef` descendant, so the page runs it behind `GoalDeleteConfirmContainer`.
   */
  it('asks the page to delete, with the address and the body the dialog names', () => {
    const { ctx, emitted } = context({
      view: {
        isToday: true,
        items: {
          day: [{
            id: 'd2', body: 'Ship it', taskRef: 'sw', period: 'day', date: TODAY,
          }],
          week: [],
          month: [],
          year: [{ id: 'y1', period: 'year', date: '31-12-2026' }],
          lifetime: [],
        },
      },
    });
    GoalsCascadeContainer.methods.onDeleteRow.call(ctx, { id: 'd2', period: 'day' });
    expect(emitted).toEqual([['delete', {
      id: 'd2', period: 'day', date: TODAY, body: 'Ship it',
    }]]);
  });

  it('never deletes a year goal from here, and never a row the read does not hold', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.methods.onDeleteRow.call(ctx, { id: 'y1', period: 'year' });
    GoalsCascadeContainer.methods.onDeleteRow.call(ctx, { id: 'ghost', period: 'day' });
    GoalsCascadeContainer.methods.onDeleteRow.call(ctx, null);
    expect(emitted).toEqual([]);
  });

  it('emits nothing for a row whose item is not in the read', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.methods.onEditRow.call(ctx, { id: 'ghost', period: 'day' });
    GoalsCascadeContainer.methods.onEditRow.call(ctx, null);
    expect(emitted).toEqual([]);
  });

  it('turns a year row into navigation, never into a tick', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.methods.onToggleRow.call(ctx, {
      id: 'y1', period: 'year', date: '31-12-2026', taskRef: 'sw', done: false,
    });
    expect(emitted).toEqual([['open-year', 'y1']]);
  });

  it('scopes its read to the selected date', () => {
    expect(GoalsCascadeContainer.apollo.goals.variables.call({ selectedDate: '08-09-2026' }))
      .toEqual({ date: '08-09-2026' });
  });

  it('hands the year average up so the nav ring reads ONE figure', () => {
    const { ctx, emitted } = context();
    GoalsCascadeContainer.watch.yearAverageOut.handler.call(ctx, 58);
    expect(emitted).toEqual([['year-average', 58]]);
  });

  it('reports the year average as unknown (null) until a read has answered', () => {
    const out = (loadedDate) => GoalsCascadeContainer.computed.yearAverageOut
      .call({ loadedDate, view: { yearAverage: 0 } });
    expect(out('')).toBeNull();
    expect(out('07-10-2026')).toBe(0);
  });

  it('treats a failed read for a day never answered as an error, not an empty day', () => {
    const loadError = (over) => GoalsCascadeContainer.computed.loadError.call({
      readFailed: true, goals: [{ id: 'g' }], loadedDate: '03-10-2026', selectedDate: '07-10-2026', ...over,
    });
    expect(loadError()).toBe(true);
    // A failed background refetch of the day already on screen keeps its rows.
    expect(loadError({ selectedDate: '03-10-2026' })).toBe(false);
    expect(loadError({ readFailed: false })).toBe(false);
  });

  it('skips both reads until there is a session to read for', () => {
    const noEmail = { $root: { $data: {} } };
    expect(GoalsCascadeContainer.apollo.goals.skip.call(noEmail)).toBe(true);
    expect(GoalCalendarContainer.apollo.monthGoals.skip.call(noEmail)).toBe(true);
    const signedIn = { $root: { $data: { email: 'a@b.c' } } };
    expect(GoalsCascadeContainer.apollo.goals.skip.call(signedIn)).toBe(false);
  });
});

describe('GoalRoutineIndexContainer', () => {
  it('sorts the routines by their clock once, here', () => {
    const context = {
      routineItems: [
        { id: 'dw', name: 'Deep Work', time: '15:00' },
        { id: 'mp', name: 'Morning Pages', time: '06:30' },
      ],
    };
    expect(GoalRoutineIndexContainer.computed.routines.call(context).map((routine) => routine.id))
      .toEqual(['mp', 'dw']);
  });

  it('renders nothing of its own', () => {
    expect(GoalRoutineIndexContainer.render.call({ $scopedSlots: {} })).toBeNull();
  });
});

describe('GoalItemCreateContainer', () => {
  it('derives the date from the period instead of asking for one', () => {
    const added = [];
    const emitted = [];
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: (payload) => { added.push(payload); return Promise.resolve({}); } },
      $emit: (name, payload) => emitted.push([name, payload]),
    };
    return GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'week', body: 'Ship it', taskRef: 'sw' }).then(() => {
      expect(added[0]).toMatchObject({
        body: 'Ship it', period: 'week', date: '11-09-2026', taskRef: 'sw', isComplete: false,
      });
      expect(emitted.map(([name]) => name)).toContain('close');
    });
  });

  it('files a lifetime goal under the no-date date', () => {
    const added = [];
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: (payload) => { added.push(payload); return Promise.resolve({}); } },
      $emit: () => {},
    };
    GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'lifetime', body: 'Run a marathon', taskRef: '' });
    expect(added[0].date).toBe('01-01-1970');
  });

  it('reports a create so the page can refetch the reads it owns', async () => {
    const emitted = [];
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: () => Promise.resolve({}) },
      $emit: (name, payload) => emitted.push([name, payload]),
    };
    await GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'day', body: 'Ship it', taskRef: 'sw' });
    expect(emitted.map(([name]) => name)).toEqual(['close', 'created']);
  });

  it('keeps the sheet open on a failed save so the typed text survives', async () => {
    const emitted = [];
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: () => Promise.reject(new Error('offline')) },
      $emit: (name, payload) => emitted.push([name, payload]),
    };
    await GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'day', body: 'Ship it', taskRef: 'sw' });
    expect(emitted.map(([name]) => name)).toEqual(['failed']);
    expect(context.saving).toBe(false);
  });

  it('does not close before the save has landed', () => {
    const emitted = [];
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: () => new Promise(() => {}) },
      $emit: (name, payload) => emitted.push([name, payload]),
    };
    GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'day', body: 'Ship it', taskRef: 'sw' });
    expect(emitted).toEqual([]);
  });

  it('ignores a second submit while the first is in flight', () => {
    let calls = 0;
    const context = {
      selectedDate: TODAY,
      today: TODAY,
      $goals: { addGoalItem: () => { calls += 1; return new Promise(() => {}); } },
      $emit: () => {},
    };
    GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'day', body: 'Ship it', taskRef: 'sw' });
    GoalItemCreateContainer.methods.onSubmit.call(context, { period: 'day', body: 'Ship it', taskRef: 'sw' });
    expect(calls).toBe(1);
  });

  it('describes the period chip the user picked, not the step the sheet opened from', () => {
    const hint = (draftPeriod) => GoalItemCreateContainer.computed.hint.call({
      period: 'day', draftPeriod, selectedDate: TODAY, today: TODAY,
    });
    expect(hint('week')).not.toBe(hint(null));
    expect(hint(null)).toBe(GoalItemCreateContainer.computed.hint.call({
      period: 'day', draftPeriod: null, selectedDate: TODAY, today: TODAY,
    }));
  });
});
