process.env.ENCRYPTION_KEY = 'routine-date-creates-day-test-key';

jest.mock('../src/utils/getEmailfromSession', () => () => 'user@example.com');

const { RoutineModel } = require('../src/schema/RoutineSchema');
const { RoutineItemModel } = require('../src/schema/RoutineItemSchema');
const { query, mutation } = require('../src/resolvers/routine');

const exec = (value) => ({ exec: () => Promise.resolve(value) });
const DATE = '11-11-2026';

/** A tiny Mongo: one user's routine documents, keyed by date. */
function fakeRoutines() {
  const docs = {};
  jest.spyOn(RoutineModel, 'findOne').mockImplementation(({ date }) => exec(docs[date] || null));
  jest.spyOn(RoutineModel, 'findOneAndUpdate').mockImplementation((filter, update, options) => {
    const { date } = filter;
    if (!docs[date] && options && options.upsert && update.$setOnInsert) {
      docs[date] = { _id: `doc-${date}`, ...update.$setOnInsert };
    }
    if (update.$set && docs[date]) Object.assign(docs[date], update.$set);
    return exec(docs[date] || null);
  });
  return docs;
}

// The shared templates, as Mongo hands them over: yesterday's flags still on.
const templates = () => [
  {
    _id: 'sleep', name: 'Sleep', time: '23:00', ticked: true, passed: true, redeemed: true, passedPoints: 5,
  },
  {
    _id: 'wake', name: 'Wake Up', time: '06:30', ticked: true, passed: false, redeemed: false,
  },
];

// The first open of a day used to take three round trips in a row: routineDate
// answered null, the app called addRoutine, then read routineDate again — on the
// open most likely to meet a cold server. The first read now makes the day.
describe('routineDate on a day that has no document yet', () => {
  let docs;

  beforeEach(() => {
    docs = fakeRoutines();
    jest.spyOn(RoutineItemModel, 'find').mockImplementation(() => exec(templates()));
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates the day and answers with it, in one call', async () => {
    const day = await query.routineDate.resolve(null, { date: DATE }, {});

    expect(day).not.toBeNull();
    expect(day.date).toBe(DATE);
    expect(docs[DATE]).toBeDefined();
    // Sorted by time, like every other read.
    expect(day.tasklist.map((t) => t._id)).toEqual(['wake', 'sleep']);
  });

  it('starts the day clean: no flag carries over from the shared templates', async () => {
    const day = await query.routineDate.resolve(null, { date: DATE }, {});
    day.tasklist.forEach((task) => {
      expect(task.ticked).toBe(false);
      expect(task.passed).toBe(false);
      expect(task.redeemed).toBe(false);
      expect(task.passedPoints).toBeUndefined();
      expect(task.stimuli.map((st) => st.name)).toEqual(['D', 'K', 'G']);
    });
  });

  it('writes with an atomic upsert, so a racing addRoutine still leaves one document', async () => {
    await Promise.all([
      query.routineDate.resolve(null, { date: DATE }, {}),
      mutation.addRoutine.resolve(null, { date: DATE }, {}),
    ]);

    const upserts = RoutineModel.findOneAndUpdate.mock.calls
      .filter(([, update, options]) => update.$setOnInsert && options && options.upsert);
    expect(upserts.length).toBeGreaterThan(0);
    upserts.forEach(([filter]) => expect(filter).toEqual({ date: DATE, email: 'user@example.com' }));
    expect(Object.keys(docs)).toEqual([DATE]);
  });

  it('leaves an existing day alone apart from its usual refresh', async () => {
    docs[DATE] = {
      _id: 'existing',
      date: DATE,
      tasklist: [{ _id: 'wake', time: '06:30', ticked: true, stimuli: [] }],
    };

    const day = await query.routineDate.resolve(null, { date: DATE }, {});

    expect(day._id).toBe('existing');
    const upserts = RoutineModel.findOneAndUpdate.mock.calls
      .filter(([, , options]) => options && options.upsert);
    expect(upserts).toHaveLength(0);
    expect(day.tasklist.find((t) => t._id === 'wake').ticked).toBe(true);
  });

  it('addRoutine still answers the existing day without writing it again', async () => {
    docs[DATE] = { _id: 'existing', date: DATE, tasklist: [{ _id: 'wake', time: '06:30' }] };
    const day = await mutation.addRoutine.resolve(null, { date: DATE }, {});
    expect(day._id).toBe('existing');
    expect(RoutineModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
