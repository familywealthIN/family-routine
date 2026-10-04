/* eslint-env jest */
/**
 * agentRoutines — joining agents to the routines they are bound to.
 *
 * Two rules worth pinning:
 *   1. the join DE-DUPES by agent id (ARCHITECTURE §3.6 — a repeated id is a
 *      repeated `:key`, which is what produced two agent badges on Home),
 *   2. the form's routine options exclude routines another agent already owns,
 *      because the server has a one-agent-per-routine unique index — offering a
 *      taken routine offers a save that cannot succeed.
 */
const { indexRoutines, joinAgentRoutines, routineOptionsFor } = require('../agentRoutines');

const ROUTINES = [
  { id: 'r1', name: 'Start Work', time: '09:00' },
  { id: 'r2', name: 'Lunch Walk', time: '12:30' },
  { id: 'r3', name: 'No clock', time: '' },
];

describe('indexRoutines', () => {
  it('keys routines by id and ignores junk', () => {
    expect(Object.keys(indexRoutines([...ROUTINES, null, {}])).sort()).toEqual(['r1', 'r2', 'r3']);
    expect(indexRoutines(undefined)).toEqual({});
  });
});

describe('joinAgentRoutines', () => {
  it('attaches the routine time and name', () => {
    const [agent] = joinAgentRoutines([{ id: 'a1', taskRef: 'r1' }], ROUTINES);
    expect(agent.routineTime).toBe('09:00');
    expect(agent.routineName).toBe('Start Work');
  });

  it('falls back to the raw taskRef when the routine is gone, so the row is still deletable', () => {
    const [agent] = joinAgentRoutines([{ id: 'a1', taskRef: 'ghost' }], ROUTINES);
    expect(agent.routineName).toBe('ghost');
    expect(agent.routineTime).toBe('');
  });

  it('de-dupes by agent id', () => {
    const joined = joinAgentRoutines(
      [{ id: 'a1', taskRef: 'r1' }, { id: 'a1', taskRef: 'r2' }, { id: 'a2', taskRef: 'r2' }],
      ROUTINES,
    );
    expect(joined.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(joined[0].routineName).toBe('Start Work');
  });

  it('drops records with no id and survives no input', () => {
    expect(joinAgentRoutines([{ taskRef: 'r1' }, null], ROUTINES)).toEqual([]);
    expect(joinAgentRoutines(undefined, undefined)).toEqual([]);
  });
});

describe('routineOptionsFor', () => {
  it('hides routines another agent already owns', () => {
    const options = routineOptionsFor(ROUTINES, [{ id: 'a1', taskRef: 'r1' }]);
    expect(options.map((o) => o.value)).toEqual(['r2', 'r3']);
  });

  it('keeps the edited agent\'s own routine visible to itself', () => {
    const options = routineOptionsFor(ROUTINES, [{ id: 'a1', taskRef: 'r1' }], 'a1');
    expect(options.map((o) => o.value)).toEqual(['r1', 'r2', 'r3']);
  });

  it('labels with the time when there is one and without when there is not', () => {
    const options = routineOptionsFor(ROUTINES, []);
    expect(options[0].label).toBe('09:00 — Start Work');
    expect(options[2].label).toBe('No clock');
    expect(options[2].time).toBe('');
  });

  it('returns an empty list rather than throwing on missing input', () => {
    expect(routineOptionsFor(undefined, undefined)).toEqual([]);
  });
});
