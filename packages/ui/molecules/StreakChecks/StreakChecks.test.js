/* eslint-env jest */

// The atoms barrel this molecule imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const StreakChecks = require('./StreakChecks.vue').default;

// D-11: the streak filled left-to-right by completion count, so the beta week
// (completed 16, 17, 18; MISSED 19; completed 20, 21) drew five solid green
// nodes in a row and every unearned node was a GREEN outline.
const betaWeek = [
  { date: '16-08-2026', status: 'complete' },
  { date: '17-08-2026', status: 'complete' },
  { date: '18-08-2026', status: 'complete' },
  { date: '19-08-2026', status: 'missed' },
  { date: '20-08-2026', status: 'complete' },
  { date: '21-08-2026', status: 'complete' },
  { date: '22-08-2026', status: 'upcoming' },
];

const nodesFor = (days) => StreakChecks.computed.nodes.call({ days });

describe('MoleculeStreakChecks nodes', () => {
  it('draws one node per calendar day, in the order given', () => {
    expect(nodesFor(betaWeek).map((node) => node.date))
      .toEqual(betaWeek.map((day) => day.date));
  });

  it('labels every node with its weekday and date', () => {
    expect(nodesFor(betaWeek).map((node) => node.label))
      .toEqual(['Su 16', 'Mo 17', 'Tu 18', 'We 19', 'Th 20', 'Fr 21', 'Sa 22']);
  });

  it('carries the full date and what happened in each node tooltip', () => {
    const [first, , , missed] = nodesFor(betaWeek);

    expect(first.title).toBe('Sun 16 Aug 2026 — completed');
    expect(missed.title).toBe('Wed 19 Aug 2026 — missed');
  });

  it('never draws an unearned day in green', () => {
    const unearned = nodesFor(betaWeek).filter((node) => node.status !== 'complete');

    expect(unearned).not.toHaveLength(0);
    unearned.forEach((node) => expect(node.color).not.toContain('green'));
  });

  it('marks a missed day with a red cancel, not an outlined check', () => {
    expect(nodesFor(betaWeek)[3]).toMatchObject({ icon: 'cancel', color: 'red' });
  });

  it('falls back to the neutral visual for an unknown or absent status', () => {
    expect(nodesFor([{ date: '16-08-2026' }])[0])
      .toMatchObject({ status: 'none', icon: 'remove', color: 'grey lighten-1' });
  });

  it('renders nothing when no days were supplied', () => {
    expect(StreakChecks.computed.nodes.call({ days: undefined })).toEqual([]);
  });
});

describe('MoleculeStreakChecks isLinkUnbroken', () => {
  const context = (days) => ({ nodes: nodesFor(days) });

  it('joins two completed days', () => {
    expect(StreakChecks.methods.isLinkUnbroken.call(context(betaWeek), 0)).toBe(true);
  });

  it('breaks the connector on either side of a missed day', () => {
    expect(StreakChecks.methods.isLinkUnbroken.call(context(betaWeek), 2)).toBe(false);
    expect(StreakChecks.methods.isLinkUnbroken.call(context(betaWeek), 3)).toBe(false);
  });
});

describe('MoleculeStreakChecks animation', () => {
  it('animates the most recent win rather than a fixed index', () => {
    const nodes = nodesFor(betaWeek);
    const context = {
      nodes,
      animate: true,
      animateComplete: false,
      latestCompleteIndex: StreakChecks.computed.latestCompleteIndex.call({ nodes }),
    };

    expect(context.latestCompleteIndex).toBe(5);
    expect(StreakChecks.methods.iconFor.call(context, nodes[5], 5)).toBe('check_circle_outline');
    expect(StreakChecks.methods.iconFor.call(context, nodes[3], 3)).toBe('cancel');
  });
});
