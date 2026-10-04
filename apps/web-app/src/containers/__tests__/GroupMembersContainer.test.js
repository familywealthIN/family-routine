/* eslint-env jest */
/**
 * The roster container and the per-member row container.
 *
 * Two properties matter here. You are always in your own member list — before the
 * read lands and when you are in no group at all — and the list is ordered you
 * first, then today's score descending, from the stats the rows report upward.
 *
 * Also asserted: each row's read is skipped until it has both a group and an
 * email, so a half-resolved identity never fires `routinesByGroupEmail` with an
 * empty groupId.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const MembersContainer = require('../GroupMembersContainer.vue').default;
const RowContainer = require('../GroupMemberRowContainer.vue').default;

const ME = { name: 'Alex Morgan', email: 'alex@routine.app', picture: '' };

const membersOf = (ctx) => MembersContainer.computed.members.call(ctx);
const sortedOf = (ctx) => MembersContainer.computed.sortedMembers.call({
  ...ctx,
  members: membersOf(ctx),
  me: ctx.me,
  stats: ctx.stats,
});

describe('GroupMembersContainer', () => {
  it('lists you even before the roster read lands', () => {
    expect(membersOf({ me: ME, groupUsers: [] }).map((m) => m.email))
      .toEqual(['alex@routine.app']);
  });

  it('does not list you twice when the roster comes back with you in it', () => {
    const ctx = {
      me: ME,
      groupUsers: [
        { name: 'Alex Morgan', email: 'alex@routine.app' },
        { name: 'Priya Shah', email: 'priya@shah.in' },
      ],
    };
    expect(membersOf(ctx).map((m) => m.email))
      .toEqual(['alex@routine.app', 'priya@shah.in']);
  });

  it('orders you first, then today’s score descending', () => {
    const ctx = {
      me: ME,
      groupUsers: [
        { name: 'Priya Shah', email: 'priya@shah.in' },
        { name: 'Leo Morgan', email: 'leo@school.edu' },
      ],
      stats: {
        'alex@routine.app': { todayScore: 10 },
        'priya@shah.in': { todayScore: 40 },
        'leo@school.edu': { todayScore: 90 },
      },
    };
    expect(sortedOf(ctx).map((m) => m.email))
      .toEqual(['alex@routine.app', 'leo@school.edu', 'priya@shah.in']);
  });

  it('skips the roster read until there is a group to read', () => {
    const { skip, variables } = MembersContainer.apollo.groupUsers;
    expect(skip.call({ groupId: '' })).toBe(true);
    expect(skip.call({ groupId: 'g1' })).toBe(false);
    expect(variables.call({ groupId: 'g1' })).toEqual({ groupId: 'g1' });
  });

  it('reads display data with cache-and-network so a stale slice self-heals', () => {
    expect(MembersContainer.apollo.groupUsers.fetchPolicy).toBe('cache-and-network');
    expect(RowContainer.apollo.memberRoutines.fetchPolicy).toBe('cache-and-network');
  });
});

describe('GroupMemberRowContainer', () => {
  const ROUTINE = {
    id: 'r1',
    date: '10-09-2026',
    tasklist: [
      {
        name: 'Morning Pages', time: '06:30', points: 10, ticked: true,
      },
      {
        name: 'Start Work', time: '09:00', points: 20, ticked: false,
      },
      {
        name: 'Lunch Walk', time: '12:30', points: 10, ticked: false,
      },
    ],
  };

  const ctx = {
    email: 'priya@shah.in',
    name: 'Priya Shah',
    picture: '',
    you: false,
    today: '10-09-2026',
    nowMinutes: 10 * 60,
    memberRoutines: [ROUTINE],
  };

  const derive = (overrides = {}) => {
    const base = { ...ctx, ...overrides };
    const self = { ...base };
    self.displayName = RowContainer.computed.displayName.call(self);
    self.color = RowContainer.computed.color.call(self);
    self.days = RowContainer.computed.days.call(self);
    self.todayRoutine = RowContainer.computed.todayRoutine.call(self);
    self.todayScore = RowContainer.computed.todayScore.call(self);
    self.dots = RowContainer.computed.dots.call(self);
    self.now = RowContainer.computed.now.call(self);
    self.stats = RowContainer.computed.stats.call(self);
    return self;
  };

  it('derives today’s score, the live line and the seven dots from one read', () => {
    const row = derive();

    expect(row.todayScore).toBe(25);
    expect(row.now).toEqual({ text: 'In Start Work · 1 of 3 done', live: true });
    expect(row.dots).toHaveLength(7);
    expect(row.dots[6].isToday).toBe(true);
  });

  it('reports its numbers upward so the pulse and the sort can use them', () => {
    const row = derive();

    expect(row.stats.email).toBe('priya@shah.in');
    expect(row.stats.todayScore).toBe(25);
    expect(row.stats.hasData).toBe(true);
    expect(typeof row.stats.average).toBe('number');
    expect(typeof row.stats.finishedRecently).toBe('boolean');
  });

  it('falls back to the email when the member has no name on file', () => {
    expect(derive({ name: '' }).displayName).toBe('priya@shah.in');
  });

  it('still reports a member whose history failed to read', () => {
    const row = derive({ memberRoutines: [] });

    expect(row.stats.hasData).toBe(false);
    expect(row.todayScore).toBe(0);
    expect(row.now.text).toBe('No routine logged today');
  });

  it('waits for both a group and an email before reading', () => {
    const { skip, variables } = RowContainer.apollo.memberRoutines;
    expect(skip.call({ groupId: '', email: 'a@b.com' })).toBe(true);
    expect(skip.call({ groupId: 'g1', email: '' })).toBe(true);
    expect(skip.call({ groupId: 'g1', email: 'a@b.com' })).toBe(false);
    expect(variables.call({ groupId: 'g1', email: 'a@b.com' }))
      .toEqual({ groupId: 'g1', email: 'a@b.com' });
  });

  it('reads YOUR week without a group, so a solo row is not seven blanks', () => {
    const own = RowContainer.apollo.ownRoutines;
    const solo = (overrides) => RowContainer.computed.solo.call({ you: true, groupId: '', ...overrides });

    expect(solo()).toBe(true);
    expect(solo({ groupId: 'g1' })).toBe(false);
    expect(solo({ you: false })).toBe(false);
    expect(own.skip.call({ solo: true })).toBe(false);
    expect(own.skip.call({ solo: false })).toBe(true);
    expect(own.update({ routineSevenDays: [ROUTINE] })).toEqual([ROUTINE]);

    const row = derive({
      you: true, solo: true, memberRoutines: [], ownRoutines: [ROUTINE],
    });
    expect(row.todayScore).toBe(25);
    expect(row.now.text).not.toBe('No routine logged today');
    expect(row.stats.hasData).toBe(true);
  });

  it('emits its stats only when they actually change', () => {
    const emit = jest.fn();
    const { handler } = RowContainer.watch.stats;
    const stats = { email: 'priya@shah.in', todayScore: 25 };

    handler.call({ $emit: emit }, stats, undefined);
    expect(emit).toHaveBeenCalledTimes(1);

    handler.call({ $emit: emit }, { ...stats }, stats);
    expect(emit).toHaveBeenCalledTimes(1);

    handler.call({ $emit: emit }, { ...stats, todayScore: 40 }, stats);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
