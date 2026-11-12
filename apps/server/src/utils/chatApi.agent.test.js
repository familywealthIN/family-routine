// "Allow routine chat to trigger the events if the user is not satisfied or the
// tasks changed": the chat can run the routine's agent again. A run calls the
// user's own webhook, so it goes out only for an agent the client listed, in a
// stage that can take one, on words that ask for it, and the reply never
// claims a run that is not going out.

const {
  chatWithRoutine, describeContext, asksToRunAgent, claimsAgentRun,
  NO_AGENT_REPLY, RUN_AGAIN_CHIP,
} = require('./chatApi');

const okResponse = (content) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});

const CONTEXT = {
  routineName: 'Start Work',
  routineTime: '09:00',
  routineEnd: '12:30',
  items: [
    { id: 'gi1', body: 'Ship dashboard PR', isComplete: false },
    { id: 'gi2', body: 'Reply to Ana', isComplete: true },
  ],
  scores: { D: 64, K: 100, G: 56 },
};

const withAgent = (stage) => ({ ...CONTEXT, agent: { name: 'Day log', stage } });

const savedKey = process.env.OPENROUTER_API_KEY;
beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key';
  // A pinned roster skips the model-discovery fetch, so the mock below is the
  // chat call itself.
  process.env.OPENROUTER_FREE_MODELS = 'test/model:free';
});
afterEach(() => {
  global.fetch = undefined;
  delete process.env.OPENROUTER_FREE_MODELS;
  if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = savedKey;
});

const modelSays = (body) => {
  global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify(body)));
};

describe('asksToRunAgent', () => {
  it.each([
    RUN_AGAIN_CHIP,
    'rerun the agent',
    'yes, run the agent again',
    'Can you restart the agent?',
    'please re-run my automation',
    'retry the agent',
    'Start the Start Work agent',
  ])('treats "%s" as a run', (text) => {
    expect(asksToRunAgent(text, 'Start Work')).toBe(true);
  });

  it.each([
    // The routine's own name starts with a verb.
    'Start Work agent is great',
    "Why didn't the agent run again?",
    'Did the agent run?',
    "don't run the agent again",
    'Stop running the agent',
    'The agent result is fine',
  ])('does not treat "%s" as a run', (text) => {
    expect(asksToRunAgent(text, 'Start Work')).toBe(false);
  });
});

describe('claimsAgentRun', () => {
  it.each([
    "I've restarted the agent for you.",
    "I'm re-running your agent now.",
    "I'll start the agent now.",
    'Restarted the agent.',
    'Your agent is running again.',
  ])('reads "%s" as a claim', (reply) => {
    expect(claimsAgentRun(reply)).toBe(true);
  });

  it.each([
    'Want me to run the agent again?',
    'Try running the agent again once the PR is in.',
    'The agent started at 09:02 and finished at 09:40.',
    'Since you started the agent this morning, two items are done.',
    "I can't start the agent from here.",
  ])('leaves "%s" alone', (reply) => {
    expect(claimsAgentRun(reply)).toBe(false);
  });
});

describe('describeContext', () => {
  it('tells the model about the agent and how it did today', () => {
    expect(describeContext(withAgent('finished')))
      .toContain('Agent: "Day log" finished today, and its result is saved on the task.');
  });

  it('says so when the routine has no agent', () => {
    expect(describeContext(CONTEXT)).toContain('Agent: none on this routine.');
  });
});

describe('an explicit "run the agent again"', () => {
  // The chip and the user's own words need no model: the action and the reply
  // are both fixed, and a free model can take tens of seconds to answer.
  it('runs without asking the model', async () => {
    global.fetch = jest.fn();

    const result = await chatWithRoutine({ text: RUN_AGAIN_CHIP, context: withAgent('finished') });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Running “Day log” again with today’s checklist.');
  });

  it.each([
    ['none', 'Starting “Day log” now.'],
    ['stalled', 'Retrying “Day log” now: its end event was due and never finished.'],
    ['failed', 'Running “Day log” again with today’s checklist.'],
    ['listening', 'Running “Day log” again with today’s checklist.'],
  ])('says what goes out when the agent is %s', async (stage, reply) => {
    global.fetch = jest.fn();

    const result = await chatWithRoutine({ text: 'rerun the agent', context: withAgent(stage) });

    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe(reply);
  });

  it.each([
    [null, NO_AGENT_REPLY],
    ['running', /already running on this routine/],
    ['firing', /already running on this routine/],
    ['closed', /only runs on today’s routine/],
    ['no_points', /worth 0 points/],
  ])('refuses, and says why, when the agent is %s', async (stage, reply) => {
    global.fetch = jest.fn();
    const context = stage ? withAgent(stage) : CONTEXT;

    const result = await chatWithRoutine({ text: RUN_AGAIN_CHIP, context });

    expect(result.intent).toBe('chat');
    expect(result.reply).toEqual(typeof reply === 'string' ? reply : expect.stringMatching(reply));
  });

  // "Run the agent again and add a review step" asks for two things.
  it('goes to the model when the message asks for something else too', async () => {
    modelSays({ reply: 'Sure thing!', intent: 'chat' });

    const result = await chatWithRoutine({
      text: 'run the agent again and keep the summary short',
      context: withAgent('finished'),
    });

    expect(global.fetch).toHaveBeenCalled();
    // Filed as talk by the model, but the words asked for a run.
    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Running “Day log” again with today’s checklist.');
  });
});

describe('a run the model chose', () => {
  // The point of the intent: unhappiness needs no word "agent".
  it('runs when the user is not happy with the result', async () => {
    modelSays({
      reply: 'Got it — running Day log again so it picks up both tasks.',
      intent: 'run_agent',
    });

    const result = await chatWithRoutine({
      text: 'That summary is wrong, it missed the second task',
      context: withAgent('finished'),
    });

    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Got it — running Day log again so it picks up both tasks.');
  });

  it('runs on a polite request', async () => {
    modelSays({ reply: 'Running it again now.', intent: 'run_agent' });

    const result = await chatWithRoutine({ text: 'Can you redo it?', context: withAgent('finished') });

    expect(result.intent).toBe('run_agent');
  });

  it('replaces a reply that is not about the run', async () => {
    modelSays({ reply: 'Sure!', intent: 'run_agent' });

    const result = await chatWithRoutine({ text: 'redo it please', context: withAgent('finished') });

    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Running “Day log” again with today’s checklist.');
  });

  // Seen on the free roster: the run went out under a reply that only offered it.
  it('replaces a reply that offers the run it is already making', async () => {
    modelSays({
      reply: 'I can run it again now that you have changed the checklist. It will regenerate.',
      intent: 'run_agent',
    });

    const result = await chatWithRoutine({ text: 'That summary is wrong', context: withAgent('finished') });

    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Running “Day log” again with today’s checklist.');
  });

  // A question about the agent never calls the webhook.
  it('does not run on a question, and takes back the reply it wrote for one', async () => {
    modelSays({ reply: 'Running it again.', intent: 'run_agent' });

    const result = await chatWithRoutine({
      text: 'why is the result so short?',
      context: withAgent('finished'),
    });

    expect(result.intent).toBe('chat');
    expect(result.reply).toBe('I haven’t started “Day log”. Say “run the agent again” and I will.');
  });

  it('does not run without an agent', async () => {
    modelSays({ reply: 'Running it again.', intent: 'run_agent' });

    const result = await chatWithRoutine({ text: 'That result is wrong', context: CONTEXT });

    expect(result.intent).toBe('chat');
    expect(result.reply).toBe(NO_AGENT_REPLY);
  });

  it('does not run an agent that is already running', async () => {
    modelSays({ reply: 'Running it again.', intent: 'run_agent' });

    const result = await chatWithRoutine({ text: 'That result is wrong', context: withAgent('running') });

    expect(result.intent).toBe('chat');
    expect(result.reply).toMatch(/already running on this routine/);
  });

  // A run adds, moves and completes nothing.
  it('replaces a run reply that claims a checklist change', async () => {
    modelSays({ reply: 'Running it again and I added a review step.', intent: 'run_agent' });

    const result = await chatWithRoutine({ text: 'redo it', context: withAgent('finished') });

    expect(result.intent).toBe('run_agent');
    expect(result.reply).toBe('Running “Day log” again with today’s checklist.');
  });
});

describe('a reply that claims a run', () => {
  it('is replaced when nothing is going out', async () => {
    modelSays({ reply: "I've restarted the agent for you.", intent: 'chat' });

    const result = await chatWithRoutine({ text: 'thanks', context: withAgent('finished') });

    expect(result.intent).toBe('chat');
    expect(result.reply).toBe('I haven’t started “Day log”. Say “run the agent again” and I will.');
  });

  it('says there is no agent when the routine has none', async () => {
    modelSays({ reply: "I've restarted the agent for you.", intent: 'chat' });

    const result = await chatWithRoutine({ text: 'thanks', context: CONTEXT });

    expect(result.reply).toBe(NO_AGENT_REPLY);
  });

  it('is left alone while the agent really is running', async () => {
    modelSays({ reply: 'Your agent is running again right now.', intent: 'chat' });

    const result = await chatWithRoutine({ text: 'is it working?', context: withAgent('running') });

    expect(result.reply).toBe('Your agent is running again right now.');
  });

  // The rule every guard here follows: an intent that acts keeps its own words.
  it('is left on a turn that really added something', async () => {
    modelSays({
      reply: 'Added “Write the summary”. I’ll start the agent once it is done.',
      intent: 'add_tasks',
      tasks: ['Write the summary'],
    });

    const result = await chatWithRoutine({ text: 'add write the summary', context: withAgent('finished') });

    expect(result.intent).toBe('add_tasks');
    expect(result.reply).toMatch(/^Added “Write the summary”/);
  });

  it('is replaced in a prose answer too', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse("I've restarted the agent for you."));

    const result = await chatWithRoutine({ text: 'thanks', context: CONTEXT });

    expect(result.intent).toBe('chat');
    expect(result.reply).toBe(NO_AGENT_REPLY);
  });
});

describe('after the checklist changes', () => {
  const addTurn = () => modelSays({
    reply: 'Added “Write the summary”.',
    intent: 'add_tasks',
    tasks: ['Write the summary'],
    suggestions: ['How was my week?'],
  });

  // The agent's result is about the old list; one tap hands it the new one.
  it('offers to run a finished agent again', async () => {
    addTurn();

    const result = await chatWithRoutine({ text: 'add write the summary', context: withAgent('finished') });

    expect(result.intent).toBe('add_tasks');
    expect(result.suggestions).toEqual([RUN_AGAIN_CHIP, 'How was my week?']);
  });

  it.each([
    ['an agent still listening', withAgent('listening')],
    ['an agent on another day', withAgent('closed')],
    ['no agent', CONTEXT],
  ])('offers nothing for %s', async (label, context) => {
    addTurn();

    const result = await chatWithRoutine({ text: 'add write the summary', context });

    expect(result.suggestions).toEqual(['How was my week?']);
  });
});
