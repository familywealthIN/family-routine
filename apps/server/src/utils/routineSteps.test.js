/**
 * Standard steps for a new routine (utils/routineSteps.js).
 *
 * Locked here:
 *   1. common routines match the library by keywords in the name, any case,
 *      with the specific entry winning over the broad one,
 *   2. every library step is short, imperative text with no emoji, 2-4 per
 *      routine, and step 1 is the physical cue,
 *   3. an unknown name asks the FREE roster first, then each paid Qwen in
 *      turn, never an OpenAI model, and answers [] when all of them fail,
 *   4. a model's answer is validated (2-4 short steps) before it is used,
 *   5. the whole model path stops at its deadline.
 */
jest.mock('./chatApi', () => {
  const actual = jest.requireActual('./chatApi');
  return { ...actual, completeChat: jest.fn() };
});

const { completeChat } = require('./chatApi');
const {
  LIBRARY,
  PAID_MODELS,
  STEP_MAX,
  libraryStepsFor,
  matchLibrary,
  parseSteps,
  suggestRoutineSteps,
  clearStepsCache,
} = require('./routineSteps');

const reply = (steps, model = 'm') => ({ content: JSON.stringify({ steps }), model });

beforeEach(() => {
  completeChat.mockReset();
  clearStepsCache();
});

describe('the library', () => {
  it.each([
    ['Jogging', 'jogging', 'Put on your running shoes'],
    ['Morning run', 'jogging', 'Put on your running shoes'],
    ['RUNNING', 'jogging', 'Put on your running shoes'],
    ['Meditation', 'meditation', 'Sit on your cushion'],
    ['mindfulness', 'meditation', 'Sit on your cushion'],
    ['Wake Up', 'wake-up', 'Feet on the floor'],
    ['Wind-down', 'wind-down', 'Dim the lights'],
    ['Evening wind down before sleep', 'wind-down', 'Dim the lights'],
    ['Bedtime', 'wind-down', 'Dim the lights'],
    ['Sleep Time', 'sleep', 'Set your alarm for tomorrow'],
    ['Reading', 'reading', 'Pick up your book'],
    ['Journaling', 'journaling', 'Open your journal'],
    ['Gratitude Practice', 'journaling', 'Open your journal'],
    ['Workout', 'workout', 'Put on your workout clothes'],
    ['Gym', 'workout', 'Put on your workout clothes'],
    ['Work out', 'workout', 'Put on your workout clothes'],
    ['Yoga', 'yoga', 'Roll out your mat'],
    ['Evening walk', 'walk', 'Put on your walking shoes'],
    ['Deep Work', 'deep-work', 'Put your phone in another room'],
    ['Start Work', 'deep-work', 'Put your phone in another room'],
    ['Study Spanish', 'study', 'Clear your desk'],
    ['Weekly review', 'review', 'Open your notes from the week'],
    ['Pay bills', 'finances', 'Open your banking app'],
    ['Budget check', 'finances', 'Open your banking app'],
    ['Day Planning', 'planning', 'Open your planner'],
    ['Prepare for Tomorrow', 'planning', 'Open your planner'],
    ['Drink water', 'hydration', 'Fill your water bottle'],
    ['Hydration', 'hydration', 'Fill your water bottle'],
    ['Light Stretching', 'stretching', 'Stand up from your chair'],
    ['Cooking', 'cooking', 'Put on your apron'],
    ['Meal prep', 'cooking', 'Put on your apron'],
    ['Breakfast', 'meals', 'Set a place at the table'],
    ['Clean the kitchen', 'cleaning', 'Put on some music'],
    ['Tidy up', 'cleaning', 'Put on some music'],
  ])('%s -> %s, cue "%s"', (name, key, cue) => {
    expect(matchLibrary(name).key).toBe(key);
    expect(libraryStepsFor(name)[0]).toBe(cue);
  });

  it('matches whole words, not fragments of other words', () => {
    expect(matchLibrary('Brunch with friends')).toBe(null); // not "run"
    expect(matchLibrary('Get ready')).toBe(null); // not "read"
    expect(matchLibrary('Homework').key).toBe('study'); // not "work"
    expect(matchLibrary('Housework').key).toBe('cleaning'); // not "work"
  });

  it('has nothing for a name it does not know, or no name', () => {
    expect(libraryStepsFor('Pottery')).toEqual([]);
    expect(libraryStepsFor('')).toEqual([]);
    expect(libraryStepsFor(null)).toEqual([]);
  });

  it('hands out copies, so a caller cannot edit the library', () => {
    libraryStepsFor('Jogging').push('Extra');
    expect(libraryStepsFor('Jogging')).toHaveLength(3);
  });

  it('keeps every entry to 2-4 short, plain, imperative steps', () => {
    LIBRARY.forEach((entry) => {
      expect(entry.steps.length).toBeGreaterThanOrEqual(2);
      expect(entry.steps.length).toBeLessThanOrEqual(4);
      entry.steps.forEach((step) => {
        expect(step.length).toBeLessThan(STEP_MAX);
        expect(step).toMatch(/^[A-Z]/);
        expect(step).not.toMatch(/[.!]$/);
        expect(step).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      });
    });
  });

  it('answers from the library without asking a model', async () => {
    await expect(suggestRoutineSteps('  jogging ')).resolves.toEqual([
      'Put on your running shoes', 'Step out the door', 'Run an easy 10 minutes',
    ]);
    expect(completeChat).not.toHaveBeenCalled();
  });
});

describe('the model fallback', () => {
  it('asks the free roster first, with no paid models named', async () => {
    completeChat.mockResolvedValueOnce(reply(['Get out the clay', 'Wet your hands', 'Throw one bowl']));
    await expect(suggestRoutineSteps('Pottery')).resolves.toEqual([
      'Get out the clay', 'Wet your hands', 'Throw one bowl',
    ]);
    expect(completeChat).toHaveBeenCalledTimes(1);
    const [messages, options] = completeChat.mock.calls[0];
    expect(options.models).toBeUndefined();
    expect(options.jsonMode).toBe(true);
    expect(messages[1].content).toContain('Pottery');
  });

  it('falls to the paid Qwen when the free roster fails', async () => {
    completeChat
      .mockRejectedValueOnce(new Error('All OpenRouter models failed'))
      .mockResolvedValueOnce(reply(['Get out the clay', 'Wet your hands']));
    await expect(suggestRoutineSteps('Pottery')).resolves.toEqual(['Get out the clay', 'Wet your hands']);
    expect(completeChat).toHaveBeenCalledTimes(2);
    expect(completeChat.mock.calls[1][1].models).toEqual([PAID_MODELS[0]]);
  });

  it('tries the second Qwen when the first answers nothing usable', async () => {
    completeChat
      .mockRejectedValueOnce(new Error('free failed'))
      .mockResolvedValueOnce({ content: 'Sure! Here are some steps…', model: PAID_MODELS[0] })
      .mockResolvedValueOnce(reply(['Get out the clay', 'Wet your hands', 'Throw one bowl']));
    await expect(suggestRoutineSteps('Pottery')).resolves.toHaveLength(3);
    expect(completeChat.mock.calls.map(([, o]) => o.models)).toEqual([
      undefined, [PAID_MODELS[0]], [PAID_MODELS[1]],
    ]);
  });

  it('answers no steps when every model fails', async () => {
    completeChat.mockRejectedValue(new Error('down'));
    await expect(suggestRoutineSteps('Pottery')).resolves.toEqual([]);
    expect(completeChat).toHaveBeenCalledTimes(1 + PAID_MODELS.length);
  });

  it('never names an OpenAI model', () => {
    expect(PAID_MODELS).toEqual(['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.5-flash-02-23']);
    PAID_MODELS.forEach((model) => expect(model).not.toMatch(/openai|gpt/i));
  });

  it('remembers a model\'s answer for the same name', async () => {
    completeChat.mockResolvedValue(reply(['Get out the clay', 'Wet your hands']));
    await suggestRoutineSteps('Pottery');
    await suggestRoutineSteps('pottery');
    expect(completeChat).toHaveBeenCalledTimes(1);
  });

  it('gives up at its deadline instead of holding the request', async () => {
    jest.useFakeTimers();
    try {
      completeChat.mockImplementation(() => new Promise(() => {})); // never answers
      const pending = suggestRoutineSteps('Pottery', { deadlineMs: 12000 });
      await jest.advanceTimersByTimeAsync(12100);
      await expect(pending).resolves.toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('skips the model entirely when asked to use the library only', async () => {
    await expect(suggestRoutineSteps('Pottery', { ai: false })).resolves.toEqual([]);
    expect(completeChat).not.toHaveBeenCalled();
  });
});

describe('validating a model\'s answer', () => {
  it('accepts 2-4 short steps, as strings or { name }', () => {
    expect(parseSteps('{"steps":["A b","C d","E f"]}')).toEqual(['A b', 'C d', 'E f']);
    expect(parseSteps('```json\n{"steps":[{"name":"A b"},{"name":"C d"}]}\n```')).toEqual(['A b', 'C d']);
  });

  it('cleans numbering, bullets, quotes and a full stop', () => {
    expect(parseSteps('{"steps":["1. Put on shoes.","- Step outside","Step 3: \\"Run\\""]}'))
      .toEqual(['Put on shoes', 'Step outside', 'Run']);
  });

  it('caps the list at four', () => {
    expect(parseSteps('{"steps":["a","b","c","d","e"]}')).toHaveLength(4);
  });

  it('drops long, emoji and repeated steps, and refuses what is left below two', () => {
    const long = 'x'.repeat(STEP_MAX + 1);
    expect(parseSteps(JSON.stringify({ steps: [long, 'Run 🏃', 'Walk', 'walk'] }))).toBe(null);
    expect(parseSteps(JSON.stringify({ steps: [long, 'Walk', 'Stretch'] }))).toEqual(['Walk', 'Stretch']);
  });

  it('refuses anything that is not the JSON shape', () => {
    expect(parseSteps('Here are your steps')).toBe(null);
    expect(parseSteps('{"reply":"hi"}')).toBe(null);
    expect(parseSteps('')).toBe(null);
  });
});
