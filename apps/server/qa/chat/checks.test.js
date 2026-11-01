// The QA grader is only useful if it fails the replies the owner complained
// about and passes good ones. This pins it on hand-written replies, so the live
// suite's verdicts can be trusted. No model is called here.
const { grade, ungroundedNumbers } = require('./checks');
const cases = require('./cases');
const { INTENTS } = require('../../src/utils/chatApi');
const { deepWork } = require('./fixtures');

const byId = (id) => cases.find((c) => c.id === id);
const result = (over) => ({
  reply: 'Five of six sessions landed; Thursday slipped. Want to protect Thursdays?',
  intent: 'chat',
  tasks: [],
  suggestions: ['Protect Thursdays'],
  completeItemId: null,
  targetItemId: null,
  model: 'test',
  error: null,
  ...over,
});
const checksOf = (list) => list.map((f) => f.check);

describe('the cases', () => {
  it('have unique ids and only expect intents the chat has', () => {
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    cases.forEach((c) => {
      const wanted = [].concat(c.expect.intent || []);
      wanted.forEach((intent) => expect(INTENTS).toContain(intent));
    });
  });

  it('only target items that exist in their context', () => {
    cases.forEach((c) => {
      const ids = c.context.items.map((item) => item.id);
      [c.expect.completeItemId, c.expect.targetItemId].filter(Boolean)
        .forEach((id) => expect(ids).toContain(id));
    });
  });
});

describe('grade', () => {
  it('passes a grounded answer to a week question', () => {
    const { failures } = grade(byId('week-summary'), result({}));
    expect(failures).toEqual([]);
  });

  it('fails the owner\'s complaint: a question answered with tasks', () => {
    const { failures } = grade(byId('week-summary'), result({
      intent: 'add_tasks', tasks: ['Record demo video'], reply: 'Added Record demo video.',
    }));
    expect(checksOf(failures)).toEqual(expect.arrayContaining(['intent', 'tasks']));
  });

  it('fails a reply that claims an add which did not happen', () => {
    const { failures } = grade(byId('project-next'), result({
      intent: 'suggest_tasks', tasks: ['Record the demo video'], reply: "I've added the demo video to your list.",
    }));
    expect(checksOf(failures)).toContain('added-claim');
  });

  it('fails an invented number, warns on a small worked-out one', () => {
    const invented = grade(byId('week-summary'), result({ reply: 'You hit 92% this week on Thursday?' }));
    expect(checksOf(invented.failures)).toContain('grounded-numbers');
    const small = grade(byId('week-summary'), result({ reply: 'Two open: 5 of 6 done, Thursday missed, 2 left today?' }));
    expect(checksOf(small.failures)).not.toContain('grounded-numbers');
  });

  it('fails leaked reasoning and vague add chips', () => {
    const { failures } = grade(byId('week-summary'), result({
      reply: 'Okay, so the user wants their week. 5 of 6 on Thursday.',
      suggestions: ['Add another task'],
    }));
    expect(checksOf(failures)).toEqual(expect.arrayContaining(['leak', 'chips']));
  });

  it('checks the item a complete or defer resolves to', () => {
    expect(grade(byId('complete-open'), result({ intent: 'complete_task', completeItemId: 'gi3', reply: 'Done.' })).failures
      .map((f) => f.check)).toContain('target');
    expect(grade(byId('complete-open'), result({ intent: 'complete_task', completeItemId: 'gi2', reply: 'Marked Fix signup bug done.' })).failures)
      .toEqual([]);
  });

  it('requires the asked-for content in an explicit add', () => {
    const { failures } = grade(byId('add-two'), result({
      intent: 'add_tasks', tasks: ['Publish the pricing page'], reply: 'Added.',
    }));
    expect(failures).toEqual([{ check: 'task-content', detail: 'no task matches /beta/i' }]);
  });

  it('reports an outage separately, never as a wrong answer', () => {
    expect(grade(byId('week-summary'), result({ error: 'All OpenRouter models failed' })))
      .toEqual({ failures: [], warnings: [], infra: true });
  });
});

describe('ungroundedNumbers', () => {
  it('lists only numbers the context never gave', () => {
    expect(ungroundedNumbers('5 of 6, 92% and 09:00', '5 of 6 at 09:00')).toEqual(['92']);
    expect(deepWork.week).toMatch(/5 of 6/);
  });

  // Seen live: "try a 15-minute starter" is advice; "you were 45 minutes late"
  // is a claim about data the model never had.
  it('lets a duration offered as advice through, never a stated one', () => {
    expect(ungroundedNumbers('Try a 15-minute starter or add a 20 min run.', '')).toEqual([]);
    expect(ungroundedNumbers('You were 45 minutes late on Friday.', '')).toEqual(['45']);
  });
});

describe('interactive', () => {
  // The owner's ask is a conversation: an answer that just stops fails.
  it('fails an answer to a question that hands nothing back', () => {
    const { failures } = grade(byId('week-summary'), result({
      reply: 'You did 5 of 6 sessions and missed Thursday.',
    }));
    expect(checksOf(failures)).toEqual(['interactive']);
  });

  it('does not ask it of an add or a tick', () => {
    const { failures } = grade(byId('add-one'), result({
      intent: 'add_tasks', tasks: ['Record the demo video'], reply: 'Added Record the demo video.',
    }));
    expect(failures).toEqual([]);
  });
});
