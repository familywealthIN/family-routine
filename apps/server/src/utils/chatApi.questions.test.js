// "It adds tasks although we asked a question": the model read a question about
// the week or a project as a request for work, and an add_tasks intent is
// written straight onto the checklist. Only an explicit command adds; anything
// else the model wanted to add comes back as one-tap proposals, and every
// reply offers follow-up chips.

const {
  chatWithRoutine, asksToAdd, coerceSuggestions, usableProse,
} = require('./chatApi');

const okResponse = (content) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});

const CONTEXT = {
  routineName: 'Deep Work',
  routineTime: '09:00',
  routineEnd: '12:00',
  items: [{ id: 'gi1', body: 'Ship dashboard PR', isComplete: false }],
  scores: { D: 64, K: 100, G: 56 },
};

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

describe('asksToAdd', () => {
  it.each([
    'add review analytics events',
    'Can you add a stretch break?',
    'yes, add them',
    'Ok add those to my checklist',
    'put call the bank on my list',
    'remind me to send the invoice',
  ])('treats "%s" as an add', (text) => {
    expect(asksToAdd(text)).toBe(true);
  });

  it.each([
    'How was my week?',
    "What's next on the website project?",
    'Plan my next session',
    'how do I add more focus to mornings?',
    'What did I miss this week?',
  ])('treats "%s" as a question', (text) => {
    expect(asksToAdd(text)).toBe(false);
  });
});

describe('chatWithRoutine on a question', () => {
  it('turns an unasked add into suggestions and drops the "added" claim', async () => {
    modelSays({
      reply: 'Added the next steps to your checklist.',
      intent: 'add_tasks',
      tasks: ['Draft the pricing page', 'Email two beta users'],
    });
    const result = await chatWithRoutine({ text: "What's next on the website project?", context: CONTEXT });
    expect(result.intent).toBe('suggest_tasks');
    expect(result.tasks).toEqual(['Draft the pricing page', 'Email two beta users']);
    expect(result.reply).not.toMatch(/added/i);
  });

  it('keeps a suggestion reply that does not claim an add', async () => {
    const reply = 'Two steps would move the site forward. Want them on the list?';
    modelSays({ reply, intent: 'add_tasks', tasks: ['Draft the pricing page'] });
    const result = await chatWithRoutine({ text: 'what should I do next?', context: CONTEXT });
    expect(result.intent).toBe('suggest_tasks');
    expect(result.reply).toBe(reply);
  });

  it('falls back to a plain answer when a suggestion has no tasks', async () => {
    modelSays({ reply: 'Keep going.', intent: 'add_tasks', tasks: [] });
    const result = await chatWithRoutine({ text: 'how am I doing?', context: CONTEXT });
    expect(result.intent).toBe('chat');
  });

  it('still adds when the user asks for it', async () => {
    modelSays({ reply: 'Added.', intent: 'add_tasks', tasks: ['Stretch for 5 minutes'] });
    const result = await chatWithRoutine({ text: 'add a 5 minute stretch', context: CONTEXT });
    expect(result.intent).toBe('add_tasks');
    expect(result.tasks).toEqual(['Stretch for 5 minutes']);
  });

  it('answers as chat, with tidy follow-up chips', async () => {
    modelSays({
      reply: 'Five of six sessions landed; only Thursday slipped. Want to protect Thursdays?',
      intent: 'chat',
      suggestions: ['  "Protect Thursdays"  ', 'how was my week?', 'Protect Thursdays',
        'This one is far too long to ever fit on a chip in the UI', 'What next?', 'Extra'],
    });
    const result = await chatWithRoutine({ text: 'How was my week?', context: CONTEXT });
    expect(result.intent).toBe('chat');
    expect(result.tasks).toEqual([]);
    expect(result.suggestions).toEqual(['Protect Thursdays', 'What next?', 'Extra']);
  });

  it('gives the model the week and the area/project context', async () => {
    modelSays({ reply: 'ok', intent: 'chat' });
    await chatWithRoutine({
      text: 'How was my week?',
      context: {
        ...CONTEXT,
        week: 'Last 7 days: 5 of 6 scheduled sessions done',
        brief: '[project:site]\nNext steps:\n- Ship pricing',
      },
    });
    const { messages } = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(messages[1].content).toMatch(/LAST 7 DAYS[^\n]*\nLast 7 days: 5 of 6/);
    expect(messages[1].content).toMatch(/AREA \/ PROJECT CONTEXT:\n\[project:site\]/);
    expect(messages[0].content).toMatch(/A QUESTION IS NEVER AN ADD/);
  });
});

// These three markers were written with a literal backspace where `\b` was
// meant (2b9c866), so they never matched and a leaked monologue reached the
// bubble.
describe('usableProse catches leaked reasoning', () => {
  it.each([
    'Okay, so the user wants to know about their week.',
    '**Analyze** the request first.',
    'The reply has intent: "chat" and no tasks.',
  ])('rejects: %s', (text) => {
    expect(usableProse(text)).toBe('');
  });

  it('keeps an ordinary reply', () => {
    expect(usableProse('Five of six sessions landed this week.')).toBe('Five of six sessions landed this week.');
  });
});

// Found by the live chat QA suite (qa/chat), 25 Oct.
describe('what the live QA run found', () => {
  it('ends an answer with the model\'s own question when the reply just stops', async () => {
    modelSays({
      reply: 'You missed Thursday 22 October.',
      intent: 'chat',
      ask: 'Want to line up the demo video for tomorrow?',
    });
    const result = await chatWithRoutine({ text: 'Which day did I miss?', context: CONTEXT });
    expect(result.reply).toBe('You missed Thursday 22 October. Want to line up the demo video for tomorrow?');
  });

  it('adds no question to a reply that has one, or to a confirmation', async () => {
    modelSays({ reply: 'Thursday. Shall we fix it?', intent: 'chat', ask: 'Want a plan?' });
    expect((await chatWithRoutine({ text: 'Which day?', context: CONTEXT })).reply).toBe('Thursday. Shall we fix it?');
    modelSays({ reply: 'Added.', intent: 'add_tasks', tasks: ['Stretch'], ask: 'Anything else?' });
    expect((await chatWithRoutine({ text: 'add stretch', context: CONTEXT })).reply).toBe('Added.');
  });

  it('asks the next model when the first answers with an empty reply', async () => {
    process.env.OPENROUTER_FREE_MODELS = 'first/model:free,second/model:free';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(okResponse(JSON.stringify({ reply: '', intent: 'chat' })))
      .mockResolvedValueOnce(okResponse(JSON.stringify({ reply: 'Thursday slipped.', intent: 'chat' })));
    const result = await chatWithRoutine({ text: 'How was my week?', context: CONTEXT });
    expect(result.reply).toBe('Thursday slipped.');
    expect(result.model).toBe('second/model:free');
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).model).toBe('second/model:free');
  });

  it('never shows raw JSON when no model gives a reply', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({ reply: '', intent: 'chat' })));
    const result = await chatWithRoutine({ text: 'How was my week?', context: CONTEXT });
    expect(result.reply).not.toMatch(/[{}]/);
    expect(result.reply).not.toBe('Noted.');
  });

  it('keeps a suggestion that plans for tomorrow instead of calling it a move', async () => {
    const reply = "Two ideas for tomorrow's session: the demo video and the pricing page. Want them?";
    modelSays({ reply, intent: 'suggest_tasks', tasks: ['Record the demo video', 'Publish the pricing page'] });
    const result = await chatWithRoutine({ text: 'What should I add to tomorrow?', context: CONTEXT });
    expect(result.reply).toBe(reply);
  });

  it('reads "not added yet" as the opposite of an add claim', async () => {
    const reply = 'Three steps for the run. These are proposals, not added yet. Want them?';
    modelSays({ reply, intent: 'break_down', tasks: ['Warm up', 'Run', 'Cool down'] });
    expect((await chatWithRoutine({ text: 'break down my run', context: CONTEXT })).reply).toBe(reply);
  });

  it('gives up on a hung model and moves to the next one', async () => {
    const { completeChat } = require('./chatApi'); // eslint-disable-line global-require
    global.fetch = jest.fn()
      .mockImplementationOnce((url, opts) => new Promise((resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }))
      .mockResolvedValueOnce(okResponse('{"reply":"ok"}'));
    const result = await completeChat([{ role: 'user', content: 'hi' }], {
      models: ['slow/model:free', 'fast/model:free'], timeoutMs: 20,
    });
    expect(result.model).toBe('fast/model:free');
  });

  it('never lets "Routine deleted." stand when nothing was deleted', async () => {
    modelSays({ reply: 'Routine deleted. Shall I also remove the week goal?', intent: 'chat' });
    const result = await chatWithRoutine({ text: 'delete this routine', context: CONTEXT });
    expect(result.reply).toMatch(/^I can't delete, rename or remove anything from here, so nothing changed/);
  });

  it('leaves an honest refusal that names the action alone', async () => {
    const reply = "I can't delete a routine from here, so it is not deleted. Open it in the app to remove it.";
    modelSays({ reply, intent: 'chat' });
    expect((await chatWithRoutine({ text: 'delete this routine', context: CONTEXT })).reply).toBe(reply);
  });

  it('does not read an offer about tomorrow as a claim that something moved', async () => {
    const reply = "Your next steps are the physio check and a Sunday long run. Want them on tomorrow's list?";
    modelSays({ reply, intent: 'chat' });
    expect((await chatWithRoutine({ text: "What's next for my health area?", context: CONTEXT })).reply).toBe(reply);
  });

  it('states today and tomorrow so no date is worked out', () => {
    const { describeContext } = require('./chatApi'); // eslint-disable-line global-require
    expect(describeContext({ date: '25-10-2026' })).toMatch(/^Today is Sun 25-10-2026\. Tomorrow is Mon 26-10-2026\./);
  });
});

describe('coerceSuggestions', () => {
  it('drops repeats of the question and keeps at most three', () => {
    expect(coerceSuggestions(['A', 'a', 'Ask', 'B', 'C', 'D'], 'ask')).toEqual(['A', 'B', 'C']);
    expect(coerceSuggestions('nope')).toEqual([]);
  });

  // Seen live: a chip that names nothing would ask the model to invent a task.
  it('drops add chips that name nothing, keeps ones that do', () => {
    expect(coerceSuggestions(['Add another task', 'Add a task', 'add new item', 'Add Record demo video']))
      .toEqual(['Add Record demo video']);
  });
});
