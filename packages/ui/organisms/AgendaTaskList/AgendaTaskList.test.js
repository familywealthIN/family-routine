/* eslint-env jest */
const AgendaTaskList = require('./AgendaTaskList.vue').default;

// Build a fresh fixture for each test so mutation in one case can't leak.
const makeGroups = () => [
  {
    taskId: 'task-1',
    taskName: 'Morning Routine',
    goals: [
      {
        id: 'goal-1',
        period: 'day',
        date: '27-05-2026',
        goalItems: [
          {
            id: 'gi-1',
            body: 'Stretch for 5 minutes',
            taskRef: 'task-1',
            isComplete: false,
            isMilestone: false,
          },
          {
            id: 'gi-2',
            body: 'Drink water',
            taskRef: 'task-1',
            isComplete: true,
            isMilestone: true,
          },
        ],
      },
    ],
  },
  {
    taskId: 'task-2',
    taskName: 'Evening Routine',
    goals: [
      {
        id: 'goal-2',
        period: 'day',
        date: '27-05-2026',
        goalItems: [
          {
            id: 'gi-3',
            body: 'Read 10 pages',
            taskRef: 'task-2',
            isComplete: false,
            isMilestone: false,
          },
        ],
      },
    ],
  },
];

// Minimal vm-like context that records emit calls.
const makeCtx = (overrides = {}) => {
  const ctx = {
    emitted: [],
    $emit(event, payload) {
      ctx.emitted.push({ event, payload });
    },
    ...overrides,
  };
  return ctx;
};

describe('OrganismAgendaTaskList', () => {
  describe('Component contract', () => {
    it('has the correct component name', () => {
      expect(AgendaTaskList.name).toBe('OrganismAgendaTaskList');
    });

    it('defines groups prop with default empty array', () => {
      expect(AgendaTaskList.props.groups.type).toBe(Array);
      expect(AgendaTaskList.props.groups.default()).toEqual([]);
    });

    it('defines loading prop as Boolean with default false', () => {
      expect(AgendaTaskList.props.loading.type).toBe(Boolean);
      expect(AgendaTaskList.props.loading.default).toBe(false);
    });

    it('defines hideCheckbox prop as Boolean with default false', () => {
      expect(AgendaTaskList.props.hideCheckbox.type).toBe(Boolean);
      expect(AgendaTaskList.props.hideCheckbox.default).toBe(false);
    });

    it('exposes the three methods needed by the template', () => {
      expect(typeof AgendaTaskList.methods.handleComplete).toBe('function');
      expect(typeof AgendaTaskList.methods.handleEdit).toBe('function');
      expect(typeof AgendaTaskList.methods.handleDelete).toBe('function');
    });
  });

  describe('hasGroups computed', () => {
    it('returns false when groups is an empty array', () => {
      const value = AgendaTaskList.computed.hasGroups.call({ groups: [] });
      expect(value).toBe(false);
    });

    it('returns true when groups has at least one entry', () => {
      const value = AgendaTaskList.computed.hasGroups.call({ groups: makeGroups() });
      expect(value).toBe(true);
    });

    it('returns false when groups is not an array (defensive)', () => {
      expect(AgendaTaskList.computed.hasGroups.call({ groups: null })).toBe(false);
      expect(AgendaTaskList.computed.hasGroups.call({ groups: undefined })).toBe(false);
      expect(AgendaTaskList.computed.hasGroups.call({ groups: 'not-an-array' })).toBe(false);
    });
  });

  describe('handleComplete', () => {
    it('emits complete-goal-item with the expected payload', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[0].goals[0].goalItems[0];
      const taskGoals = groups[0].goals[0];

      AgendaTaskList.methods.handleComplete.call(ctx, goalItem, taskGoals, true);

      expect(ctx.emitted).toEqual([
        {
          event: 'complete-goal-item',
          payload: {
            id: 'gi-1',
            period: 'day',
            date: '27-05-2026',
            taskRef: 'task-1',
            isComplete: true,
            isMilestone: false,
          },
        },
      ]);
    });

    it('coerces the isComplete argument to a Boolean (null -> false)', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      AgendaTaskList.methods.handleComplete.call(
        ctx,
        groups[0].goals[0].goalItems[0],
        groups[0].goals[0],
        null,
      );
      expect(ctx.emitted[0].payload.isComplete).toBe(false);
    });

    it('coerces truthy non-boolean to true', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      AgendaTaskList.methods.handleComplete.call(
        ctx,
        groups[0].goals[0].goalItems[0],
        groups[0].goals[0],
        'yes',
      );
      expect(ctx.emitted[0].payload.isComplete).toBe(true);
    });

    it('forwards isMilestone from the goalItem', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const milestoneGoalItem = groups[0].goals[0].goalItems[1];

      AgendaTaskList.methods.handleComplete.call(
        ctx,
        milestoneGoalItem,
        groups[0].goals[0],
        false,
      );

      expect(ctx.emitted[0].payload.isMilestone).toBe(true);
      expect(ctx.emitted[0].payload.id).toBe('gi-2');
    });
  });

  describe('handleEdit', () => {
    it('emits edit-goal-item with the goal item spread plus period and date', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[0].goals[0].goalItems[0];
      const taskGoals = groups[0].goals[0];

      AgendaTaskList.methods.handleEdit.call(ctx, goalItem, taskGoals);

      expect(ctx.emitted).toEqual([
        {
          event: 'edit-goal-item',
          payload: {
            id: 'gi-1',
            body: 'Stretch for 5 minutes',
            taskRef: 'task-1',
            isComplete: false,
            isMilestone: false,
            period: 'day',
            date: '27-05-2026',
          },
        },
      ]);
    });

    it('does not mutate the original goal item', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[0].goals[0].goalItems[0];
      const taskGoals = groups[0].goals[0];
      const before = JSON.parse(JSON.stringify(goalItem));

      AgendaTaskList.methods.handleEdit.call(ctx, goalItem, taskGoals);

      expect(goalItem).toEqual(before);
    });

    it('passes through period and date from taskGoals (not goalItem)', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = { ...groups[0].goals[0].goalItems[0], period: 'week', date: '01-01-2000' };
      const taskGoals = groups[0].goals[0];

      AgendaTaskList.methods.handleEdit.call(ctx, goalItem, taskGoals);

      expect(ctx.emitted[0].payload.period).toBe('day');
      expect(ctx.emitted[0].payload.date).toBe('27-05-2026');
    });
  });

  describe('handleDelete', () => {
    it('emits delete-goal-item with id, period, and date', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[0].goals[0].goalItems[0];
      const taskGoals = groups[0].goals[0];

      AgendaTaskList.methods.handleDelete.call(ctx, goalItem, taskGoals);

      expect(ctx.emitted).toEqual([
        {
          event: 'delete-goal-item',
          payload: {
            id: 'gi-1',
            period: 'day',
            date: '27-05-2026',
          },
        },
      ]);
    });

    it('emits the id of the specific clicked item only', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[1].goals[0].goalItems[0];
      const taskGoals = groups[1].goals[0];

      AgendaTaskList.methods.handleDelete.call(ctx, goalItem, taskGoals);

      expect(ctx.emitted[0].payload.id).toBe('gi-3');
    });

    it('does not include taskRef, isComplete, or isMilestone in the delete payload', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      const goalItem = groups[0].goals[0].goalItems[1];
      const taskGoals = groups[0].goals[0];

      AgendaTaskList.methods.handleDelete.call(ctx, goalItem, taskGoals);

      const payload = ctx.emitted[0].payload;
      expect(Object.keys(payload).sort()).toEqual(['date', 'id', 'period']);
    });
  });

  describe('Event isolation', () => {
    it('does not emit complete or delete when only edit is invoked', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      AgendaTaskList.methods.handleEdit.call(
        ctx,
        groups[0].goals[0].goalItems[0],
        groups[0].goals[0],
      );

      const events = ctx.emitted.map((e) => e.event);
      expect(events).toEqual(['edit-goal-item']);
    });

    it('does not emit edit or delete when only complete is invoked', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      AgendaTaskList.methods.handleComplete.call(
        ctx,
        groups[0].goals[0].goalItems[0],
        groups[0].goals[0],
        true,
      );

      const events = ctx.emitted.map((e) => e.event);
      expect(events).toEqual(['complete-goal-item']);
    });

    it('does not emit complete or edit when only delete is invoked', () => {
      const ctx = makeCtx();
      const groups = makeGroups();
      AgendaTaskList.methods.handleDelete.call(
        ctx,
        groups[0].goals[0].goalItems[0],
        groups[0].goals[0],
      );

      const events = ctx.emitted.map((e) => e.event);
      expect(events).toEqual(['delete-goal-item']);
    });
  });
});
