const { routineActions, routineRoute, CATEGORIES } = require('../src/cue/routineActions');
const { buildMessage, ALARM_CHANNEL } = require('../src/utils/push');
const { dueCues, batchCues } = require('../src/cue/cueEngine');

describe('routineActions', () => {
  it.each([
    [{}, 'none', CATEGORIES.routine, 'complete'],
    [{ hasAiContext: true }, 'context', CATEGORIES.agentBuild, 'build'],
    [{ hasAgent: true, hasAiContext: true }, 'agent', CATEGORIES.agentStart, 'start'],
  ])('%j → %s', (input, level, category, action) => {
    expect(routineActions(input)).toEqual({ level, category, action });
  });

  it('links to the app route that runs the action', () => {
    expect(routineRoute('abc', 'start')).toBe('/home/abc/start?src=push');
  });
});

describe('buildMessage', () => {
  it('puts alarms on the alarm channel and iOS buttons on the category', () => {
    const m = buildMessage({
      tokens: ['t'], title: 'T', body: 'B', data: { n: 1, skip: undefined }, channel: ALARM_CHANNEL, category: 'AGENT_START_ACTIONS', timeSensitive: true,
    });
    expect(m.android.notification.channelId).toBe('routine-alarms');
    expect(m.apns.payload.aps).toMatchObject({ category: 'AGENT_START_ACTIONS', 'interruption-level': 'time-sensitive' });
    expect(m.data).toEqual({ n: '1', category: 'AGENT_START_ACTIONS' });
  });
});

describe('notifyMode', () => {
  const TZ = 'Asia/Kolkata';
  const TODAY = '20-10-2026';
  const at = (hhmm) => new Date(`2026-10-20T${hhmm}:00+05:30`);
  const item = (notifyMode) => ({
    _id: 'x', name: 'Run', time: '07:00', points: 10, notifyMode,
  });
  const cues = (mode, hhmm, routines = []) => dueCues({
    now: at(hhmm), timezone: TZ, today: TODAY, items: [item(mode)], routines,
  });

  it('off sends nothing', () => {
    expect(cues('off', '07:00')).toEqual([]);
  });

  it('alarm rings at the set time and once more five minutes later', () => {
    expect(cues('alarm', '07:00')[0]).toMatchObject({ alarm: true, kind: 'alarm', title: '⏰ Run · 07:00' });
    expect(cues('alarm', '07:05')[0].kind).toBe('alarmRepeat');
    expect(cues('alarm', '07:03')).toEqual([]);
    expect(cues('alarm', '07:05', [{ date: TODAY, tasklist: [{ _id: 'x', ticked: true }] }])).toEqual([]);
  });

  it('alarms are never folded into a batch', () => {
    const a = { item: item('alarm'), alarm: true, kind: 'alarm' };
    const b = { item: { name: 'B' }, kind: 'reward' };
    const c = { item: { name: 'C' }, kind: 'reward' };
    const out = batchCues([a, b, c]);
    expect(out.map((x) => x.kind)).toEqual(['alarm', 'batch']);
  });
});
