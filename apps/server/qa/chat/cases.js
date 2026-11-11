/**
 * The chat QA cases. Each is one user turn (with optional earlier turns) and
 * what a correct reply must do. Every reply is ALSO held to the universal
 * checks in checks.js (no leaked reasoning, no unearned "added", numbers that
 * exist in the context, chips that make sense…), so a case only lists what is
 * specific to it.
 *
 * expect:
 *   intent          one intent or a list of acceptable ones
 *   tasks           'none' | 'some'
 *   completeItemId  / targetItemId: the id the turn must resolve to
 *   mentions        [regex] — every one must appear in the reply
 *   mentionsAny     [regex] — at least one must appear
 *   avoid           [regex] — none may appear (invented facts, wrong items)
 *   taskMatches     [regex] — every one must match some returned task
 *   soft            names of checks that only warn here (see checks.js)
 */
const {
  deepWork, workout, fresh, allDone,
} = require('./fixtures');

const NO_TASKS = { tasks: 'none' };

module.exports = [
  // --- 1. questions about the last seven days: answered, never added -------
  {
    id: 'week-summary',
    category: 'week',
    context: deepWork,
    text: 'How was my week?',
    expect: {
      intent: 'chat', ...NO_TASKS, mentionsAny: [/5 of 6|five of six|5 sessions|five sessions/i], mentions: [/thu/i],
    },
  },
  {
    id: 'week-missed-day',
    category: 'week',
    context: deepWork,
    text: 'Which day did I miss?',
    expect: { intent: 'chat', ...NO_TASKS, mentions: [/thu/i], avoid: [/\b(mon|tue|wed|fri|sat)\w*day\b.*\bmissed\b/i] },
  },
  {
    id: 'week-left-open',
    category: 'week',
    context: deepWork,
    text: 'What did I leave unfinished this week?',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/demo video/i, /email beta/i] },
  },
  {
    id: 'week-trend-bad',
    category: 'week',
    context: workout,
    text: 'Am I being consistent with this?',
    expect: { intent: ['chat', 'status'], ...NO_TASKS, mentionsAny: [/3 of 6|three of six|half|3 missed|three missed|missed 3|missed three/i] },
  },
  {
    id: 'week-question-mark-free',
    category: 'week',
    context: deepWork,
    text: 'tell me about my last few sessions',
    expect: { intent: 'chat', ...NO_TASKS },
  },
  {
    id: 'week-no-history',
    category: 'week',
    context: fresh,
    text: 'How was my week?',
    expect: {
      intent: 'chat', ...NO_TASKS, mentionsAny: [/no (history|sessions|record|data)|new|first|haven'?t|not yet|nothing/i],
      avoid: [/\b\d+ of \d+\b/],
    },
  },

  // --- 2. project and area questions ---------------------------------------
  {
    id: 'project-next',
    category: 'project',
    context: deepWork,
    text: "What's next on the website project?",
    expect: { intent: ['chat', 'suggest_tasks'], mentionsAny: [/demo video/i, /pricing page/i, /beta list/i] },
  },
  {
    id: 'project-why',
    category: 'project',
    context: deepWork,
    text: 'What is this project for again?',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/beta launch|marketing site|1 november/i] },
  },
  {
    id: 'area-next',
    category: 'project',
    context: workout,
    text: "What's the next step for my health area?",
    expect: { intent: ['chat', 'suggest_tasks'], mentionsAny: [/physio/i, /long run/i] },
  },
  {
    id: 'project-goal-link',
    category: 'project',
    context: deepWork,
    text: 'Does today move the launch forward?',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/launch/i] },
  },
  {
    id: 'project-missing',
    category: 'project',
    context: fresh,
    text: "What's next on my project?",
    expect: {
      intent: 'chat', ...NO_TASKS, mentionsAny: [/no (project|area)|not (tagged|linked)|isn'?t (tagged|linked)|don'?t (see|have)|tag/i],
    },
  },

  // --- 3. coaching: an observation, an idea, an invitation -----------------
  {
    id: 'coach-plan-next',
    category: 'coaching',
    context: deepWork,
    text: 'Plan my next session',
    expect: { intent: ['chat', 'suggest_tasks'] },
  },
  {
    id: 'coach-consistency',
    category: 'coaching',
    context: workout,
    text: 'How can I stop missing workouts?',
    expect: { intent: ['chat', 'suggest_tasks'] },
  },
  {
    id: 'coach-what-should-i-add',
    category: 'coaching',
    context: deepWork,
    text: 'What should I add to tomorrow?',
    expect: { intent: ['chat', 'suggest_tasks'] },
  },
  {
    id: 'coach-motivate',
    category: 'coaching',
    context: workout,
    text: "I'm tired, give me a reason to do it",
    expect: { intent: 'chat', ...NO_TASKS },
  },
  {
    id: 'coach-add-word-in-question',
    category: 'coaching',
    context: workout,
    text: 'how do I add more running to my week?',
    expect: { intent: ['chat', 'suggest_tasks'] },
  },

  // --- 4. explicit adds: these MUST add -------------------------------------
  {
    id: 'add-one',
    category: 'add',
    context: deepWork,
    text: 'add record the demo video',
    expect: { intent: 'add_tasks', tasks: 'some', taskMatches: [/demo video/i] },
  },
  {
    id: 'add-two',
    category: 'add',
    context: deepWork,
    text: 'Can you add publish the pricing page and email the beta list?',
    expect: { intent: 'add_tasks', tasks: 'some', taskMatches: [/pricing/i, /beta/i] },
  },
  {
    id: 'add-put-on-list',
    category: 'add',
    context: workout,
    text: 'put book a physio check on my list',
    expect: { intent: 'add_tasks', tasks: 'some', taskMatches: [/physio/i] },
  },
  {
    id: 'add-remind',
    category: 'add',
    context: fresh,
    text: 'remind me to return the library book',
    expect: { intent: 'add_tasks', tasks: 'some', taskMatches: [/library|book/i] },
  },
  {
    id: 'add-after-suggestion',
    category: 'add',
    context: deepWork,
    history: [
      { from: 'me', text: "What's next on the website project?" },
      {
        from: 'routine',
        text: 'Two steps would move the launch: the demo video and the pricing page. Want them on the list?',
        proposals: ['Record the demo video', 'Publish the pricing page'],
      },
    ],
    text: 'yes, add them',
    expect: { intent: 'add_tasks', tasks: 'some', taskMatches: [/demo video/i, /pricing/i] },
  },

  // --- 5. break it down ------------------------------------------------------
  {
    id: 'break-named',
    category: 'break_down',
    context: deepWork,
    text: 'break down fix signup bug',
    expect: { intent: 'break_down', tasks: 'some', mentionsAny: [/signup/i] },
  },
  {
    id: 'break-implicit',
    category: 'break_down',
    context: workout,
    text: 'Break it down',
    // Two open items: breaking one down or asking which are both right.
    expect: { intent: ['break_down', 'chat'], mentionsAny: [/run|core/i] },
  },

  // --- 6. complete -----------------------------------------------------------
  {
    id: 'complete-open',
    category: 'complete',
    context: deepWork,
    text: 'done with the signup bug',
    expect: { intent: 'complete_task', completeItemId: 'gi2' },
  },
  {
    id: 'complete-fuzzy',
    category: 'complete',
    context: workout,
    text: 'finished my run',
    expect: { intent: 'complete_task', completeItemId: 'w1' },
  },
  {
    id: 'complete-already-done',
    category: 'complete',
    context: allDone,
    text: 'I finished the landing page copy',
    expect: { intent: 'chat', ...NO_TASKS },
  },

  // --- 7. defer and skip -----------------------------------------------------
  {
    id: 'defer-tomorrow',
    category: 'defer_skip',
    context: deepWork,
    text: 'move the analytics review to tomorrow',
    expect: { intent: 'defer_task', targetItemId: 'gi3' },
  },
  {
    id: 'skip-today',
    category: 'defer_skip',
    context: workout,
    text: "skip the core circuit today, my back hurts",
    expect: { intent: 'skip_task', targetItemId: 'w2' },
  },
  {
    id: 'defer-other-day',
    category: 'defer_skip',
    context: deepWork,
    text: 'move the signup bug to Friday',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/date chip|can'?t|cannot|only tomorrow/i] },
  },

  // --- 8. status -------------------------------------------------------------
  {
    id: 'status-today',
    category: 'status',
    context: deepWork,
    text: 'How am I doing today?',
    expect: { intent: ['status', 'chat'], ...NO_TASKS, mentionsAny: [/60/, /40/, /55/] },
  },

  // --- 9. out of scope: say so, change nothing ------------------------------
  {
    id: 'scope-delete',
    category: 'scope',
    context: deepWork,
    text: 'delete this routine',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/can'?t|cannot|not able|unable/i] },
  },
  {
    id: 'scope-points',
    category: 'scope',
    context: deepWork,
    text: 'make this routine worth 50 points',
    expect: { intent: 'chat', ...NO_TASKS, mentionsAny: [/can'?t|cannot|not able|unable/i] },
  },
  {
    id: 'scope-offtopic',
    category: 'scope',
    context: fresh,
    text: "what's the weather like?",
    expect: { intent: 'chat', ...NO_TASKS },
  },

  // --- 10. small talk and ambiguity ------------------------------------------
  {
    id: 'smalltalk-ok',
    category: 'smalltalk',
    context: deepWork,
    text: 'ok',
    expect: { intent: 'chat', ...NO_TASKS },
  },
  {
    id: 'smalltalk-thanks',
    category: 'smalltalk',
    context: workout,
    text: 'thanks, that helps',
    expect: { intent: 'chat', ...NO_TASKS },
  },
  {
    id: 'smalltalk-hinglish',
    category: 'smalltalk',
    context: deepWork,
    text: 'aaj ka kya plan hai?',
    expect: { intent: ['chat', 'suggest_tasks', 'status'] },
  },
];
