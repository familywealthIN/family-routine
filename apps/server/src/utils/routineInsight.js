/**
 * routineInsight — "How do I improve the current routine?", answered once the
 * routine is ticked, in three sentences grounded in the user's own record.
 *
 * The routine chat only ever sees today. This looks back over the routine's
 * recent days — whether it was ticked inside its window, late (after the window
 * had passed) or not at all, and what checklist work hung off it and how that
 * went — and joins it with the area/project context the client already caches
 * (description + next steps). The model gets the measurements, not the raw
 * documents, so the prompt stays small enough for a free model.
 *
 * The summariser and the fallback are pure so the arithmetic is testable
 * without Mongo or a model.
 */
const { completeChat } = require('./chatApi');

const LOOKBACK_DAYS = 14;
const MAX_ACTIVITIES = 8;
const BRIEF_MAX = 1500;

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/** DD-MM-YYYY for each of the `days` days strictly before `date`, newest first. */
function previousDates(date, days = LOOKBACK_DAYS) {
  const [d, m, y] = String(date).split('-').map(Number);
  const out = [];
  for (let i = 1; i <= days; i += 1) {
    const day = new Date(Date.UTC(y, m - 1, d - i));
    const dd = String(day.getUTCDate()).padStart(2, '0');
    const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
    out.push(`${dd}-${mm}-${day.getUTCFullYear()}`);
  }
  return out;
}

/**
 * @param {Object} p
 * @param {Array}  p.routines day routine docs ({ date, skip, tasklist[] })
 * @param {Array}  p.goals    day goal docs ({ date, goalItems[] })
 * @param {string} p.taskRef  the routine item id
 */
function summariseRoutineHistory({ routines = [], goals = [], taskRef }) {
  const ref = String(taskRef);
  const summary = {
    days: 0, onTime: 0, late: 0, missed: 0, skipped: 0,
    itemsDone: 0, itemsLate: 0, itemsOpen: 0, activities: [],
  };

  routines.forEach((routine) => {
    const task = (routine.tasklist || []).find((t) => String(t._id || t.id) === ref);
    if (!task) return;
    summary.days += 1;
    if (routine.skip) summary.skipped += 1;
    // `passed` is stamped when the window closes untouched, so a tick on a
    // passed task was a late check-in.
    else if (task.ticked && task.passed) summary.late += 1;
    else if (task.ticked) summary.onTime += 1;
    else summary.missed += 1;
  });

  goals
    .slice()
    .sort((a, b) => String(b.date).split('-').reverse().join('')
      .localeCompare(String(a.date).split('-').reverse().join('')))
    .forEach((goal) => {
      (goal.goalItems || []).forEach((item) => {
        if (String(item.taskRef) !== ref) return;
        if (item.isComplete && item.status === 'missed') summary.itemsLate += 1;
        else if (item.isComplete) summary.itemsDone += 1;
        else summary.itemsOpen += 1;
        if (summary.activities.length < MAX_ACTIVITIES && item.body) {
          const state = item.isComplete ? (item.status === 'missed' ? 'late' : 'done') : 'not done';
          summary.activities.push(`${item.body} (${state})`);
        }
      });
    });

  return summary;
}

function describeHistory(summary) {
  const s = summary;
  const items = s.itemsDone + s.itemsLate + s.itemsOpen;
  return `Last ${LOOKBACK_DAYS} days of this routine (${s.days} scheduled):
- In time: ${s.onTime} (${pct(s.onTime, s.days)}%) · late: ${s.late} · missed: ${s.missed} · skipped: ${s.skipped}
- Checklist work: ${items} items — ${s.itemsDone} done on time, ${s.itemsLate} done late, ${s.itemsOpen} not done
- Recent activities: ${s.activities.length ? s.activities.join('; ') : 'none recorded'}`;
}

/** Three sentences built from the numbers alone, for when no model answers. */
function fallbackInsight(summary, routineName = 'this routine') {
  const s = summary;
  if (!s.days) {
    return `${routineName} has no history yet, so the best improvement is consistency: tick it inside its window every day this week. `
      + 'Keep its checklist to one or two concrete tasks so it is easy to finish on time. '
      + 'After a week, the record here will show where it slips.';
  }
  const rate = pct(s.onTime, s.days);
  const first = `You ticked ${routineName} in time on ${s.onTime} of the last ${s.days} days (${rate}%), with ${s.late} late and ${s.missed} missed.`;
  const second = s.late + s.missed > s.onTime
    ? 'The biggest gain is starting inside the window — set it up the night before so the first step takes under two minutes.'
    : 'Your timing is solid, so raise the bar on the work itself rather than the start time.';
  const third = s.itemsOpen > s.itemsDone
    ? `More checklist items were left open (${s.itemsOpen}) than finished on time (${s.itemsDone}), so plan fewer, smaller tasks per session.`
    : `You finished ${s.itemsDone} checklist items on time, so add one next step from your area plan to keep it moving forward.`;
  return `${first} ${second} ${third}`;
}

/** First three sentences of the model's prose, as one plain paragraph. */
function threeSentences(text) {
  const plain = String(text || '')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•\d.)]+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length < 3) return '';
  return sentences.slice(0, 3).map((x) => x.trim()).join(' ');
}

async function generateRoutineInsight({ summary, routineName, brief }) {
  const context = String(brief || '').slice(0, BRIEF_MAX);
  const messages = [
    {
      role: 'system',
      content: 'You are a routine coach inside a habit app. Answer the question '
        + '"How do I improve the current routine?" in EXACTLY three sentences, as one '
        + 'plain paragraph: no lists, no headings, no greeting. Ground every sentence in '
        + 'the measurements given — cite at least one number — and make the last '
        + 'sentence one concrete next action. Never invent data that is not given.',
    },
    {
      role: 'user',
      content: `Routine: ${routineName || 'this routine'}\n${describeHistory(summary)}`
        + `${context ? `\nArea / project context (description and next steps):\n${context}` : ''}`
        + '\n\nHow do I improve the current routine?',
    },
  ];
  try {
    const { content, model } = await completeChat(messages, { maxTokens: 400 });
    const paragraph = threeSentences(content);
    if (paragraph) return { text: paragraph, model };
  } catch (error) {
    // Fall through to the measured fallback: the user ticked and expects an answer.
  }
  return { text: fallbackInsight(summary, routineName), model: null };
}

module.exports = {
  LOOKBACK_DAYS,
  previousDates,
  summariseRoutineHistory,
  describeHistory,
  fallbackInsight,
  threeSentences,
  generateRoutineInsight,
};
