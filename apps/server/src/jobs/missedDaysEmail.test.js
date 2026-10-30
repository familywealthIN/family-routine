const mockSendEmailCommand = jest.fn(function SendEmailCommand(input) { this.input = input; });
jest.mock('@aws-sdk/client-sesv2', () => ({ SendEmailCommand: mockSendEmailCommand }), { virtual: true });

const { runMissedDaysEmail, sesSender } = require('./missedDaysEmail');
const { historyDates } = require('./missedDays');

const TODAY = '29-10-2026';
const day = (n) => historyDates(TODAY, 40)[n];
// 10:30 in Kolkata on 29 Oct 2026.
const NOW = new Date('2026-10-29T05:00:00Z');

const matches = (doc, query) => Object.entries(query).every(([k, v]) => {
  if (v && v.$in) return v.$in.includes(doc[k]);
  if (v && v.$exists !== undefined) return (doc[k] !== undefined) === v.$exists;
  if (v && v.$gte) return doc[k] >= v.$gte;
  return doc[k] === v;
});

function fakeDb(data) {
  const store = { notificationlogs: [], ...data };
  return {
    store,
    collection: (name) => ({
      find: (query) => ({ toArray: async () => (store[name] || []).filter((d) => matches(d, query)) }),
      createIndex: async () => {},
      insertOne: async (doc) => {
        if (store[name].some((d) => d.email === doc.email && d.key === doc.key)) {
          throw Object.assign(new Error('dup'), { code: 11000 });
        }
        store[name].push(doc);
      },
      deleteOne: async (q) => { store[name] = store[name].filter((d) => !matches(d, q)); },
    }),
  };
}

const ticks = (email, ns) => ns.map((n) => ({ email, date: day(n), tasklist: [{ ticked: true }] }));
const data = () => ({
  users: [
    { email: 'away@example.invalid', name: 'Away Person', timezone: 'Asia/Kolkata' },
    { email: 'daily@example.invalid', timezone: 'Asia/Kolkata' },
    { email: 'off@example.invalid', timezone: 'Asia/Kolkata', notificationPrefs: { missedEmail: false } },
  ],
  routines: [
    ...ticks('away@example.invalid', [4, 5, 6, 7]),
    ...ticks('daily@example.invalid', [1, 2, 3, 4]),
    ...ticks('off@example.invalid', [4, 5, 6, 7]),
  ],
  routineitems: ['away', 'daily', 'off'].map((p) => ({ email: `${p}@example.invalid`, name: 'Walk', time: '07:00' })),
});

describe('runMissedDaysEmail', () => {
  it('sends one email to the person who missed 3 days, logged first', async () => {
    const db = fakeDb(data());
    const send = jest.fn(async () => {});
    const out = await runMissedDaysEmail({ db, send, now: NOW });
    expect(out).toMatchObject({ checked: 3, sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'away@example.invalid', subject: '3 days off — pick up with Walk' });
    expect(db.store.notificationlogs).toEqual([expect.objectContaining({
      email: 'away@example.invalid', key: `email:missed:${day(4)}`, channel: 'email', date: TODAY,
    })]);

    // A second run the same hour sends nothing.
    await runMissedDaysEmail({ db, send, now: NOW });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('dry run plans without logging or sending', async () => {
    const db = fakeDb(data());
    const out = await runMissedDaysEmail({ db, dryRun: true, now: NOW });
    expect(out.planned.map((p) => p.email)).toEqual(['away@example.invalid']);
    expect(db.store.notificationlogs).toEqual([]);
  });

  it('removes the log when SES refuses, so the next run retries', async () => {
    const db = fakeDb(data());
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const out = await runMissedDaysEmail({ db, send: async () => { throw new Error('throttled'); }, now: NOW });
    expect(out).toMatchObject({ sent: 0, failed: 1 });
    expect(db.store.notificationlogs).toEqual([]);
    errorSpy.mockRestore();
  });

  it('refuses to send without a sender', async () => {
    await expect(runMissedDaysEmail({ db: fakeDb(data()), now: NOW })).rejects.toThrow('send()');
  });
});

describe('sesSender', () => {
  it('sends text and HTML from the configured sender', async () => {
    const client = { send: jest.fn(async () => ({ MessageId: 'm1' })) };
    await sesSender({ client, from: 'Routine Notes <noreply@familywealth.in>' })({
      to: 'a@example.invalid', subject: 'S', text: 'T', html: '<p>H</p>',
    });
    expect(client.send.mock.calls[0][0].input).toEqual({
      FromEmailAddress: 'Routine Notes <noreply@familywealth.in>',
      Destination: { ToAddresses: ['a@example.invalid'] },
      Content: {
        Simple: {
          Subject: { Data: 'S', Charset: 'UTF-8' },
          Body: { Text: { Data: 'T', Charset: 'UTF-8' }, Html: { Data: '<p>H</p>', Charset: 'UTF-8' } },
        },
      },
    });
  });
});
