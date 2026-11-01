/**
 * insightStrategy — the reasoning half of the post-tick message.
 *
 * The old message handed a free-form prompt a page of statistics and asked it
 * to "find the most compelling thing". It read like a report card: counts
 * restated, today's checklist status recited, no reason to read it and nothing
 * to try. Reasoning about a person's routine is arithmetic and judgement, and
 * neither belongs to a writer that can miscount, so it happens HERE, in code:
 *
 *   1. diagnose — read the summary, list every situation that is TRUE, each
 *      with its evidence, and rank them;
 *   2. pick ONE hook (why this tick matters: the motivation) and ONE lever
 *      (the single change most likely to make this routine better next time);
 *   3. hand the writer only that brief plus the facts it may quote.
 *
 * The writer (routineInsight.js) turns the brief into words; a validator holds
 * it to the facts; `fallbackMessage` writes the same brief without a model.
 * Everything here is pure, so every decision is unit-testable.
 */

const wordsOf = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Lines of the area/project brief that read as next steps. */
function briefSteps(brief) {
  return String(brief || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line && wordsOf(line).length >= 2 && wordsOf(line).length <= 16)
    .filter((line) => !/:$/.test(line))
    .slice(0, 5);
}

/** "Name (state)" strings from the summary's todayItems, split back apart. */
function todayItemStates(summary) {
  return (summary.todayItems || []).map((entry) => {
    const match = /^(.*) \((done|late|not done)\)$/.exec(entry);
    return match ? { body: match[1], state: match[2] } : { body: entry, state: 'done' };
  });
}

/**
 * Every hook that is true right now, best first. A hook is the reason this
 * tick is worth feeling good about — always grounded in a real number.
 */
function hooks(s) {
  const out = [];
  const firstTime = !s.showedUp || s.showedUp <= 1;
  if (firstTime) {
    out.push({ key: 'first', score: 100, evidence: 'their first check-in on this routine in 30 days' });
    return out;
  }
  if (s.streak >= 3 && s.streak >= s.bestStreak) {
    out.push({
      key: 'record',
      score: 90 + s.streak,
      evidence: `${s.streak} check-ins in a row, the longest run in the last 30 days`,
    });
  }
  if (s.lastBefore === 'missed' || s.lastBefore === 'absent') {
    out.push({
      key: 'comeback',
      score: 80,
      evidence: 'back today after missing the previous session',
    });
  }
  if (s.streak >= 2 && s.bestStreak > s.streak) {
    out.push({
      key: 'chase',
      score: 70 + Math.round((s.streak / s.bestStreak) * 10),
      evidence: `${s.streak} in a row, ${plural(s.bestStreak + 1 - s.streak, 'more session')} beats the best run of ${s.bestStreak}`,
    });
  }
  if (s.thisWeek > s.lastWeek && s.lastWeek > 0) {
    out.push({
      key: 'weekUp',
      score: 60 + (s.thisWeek - s.lastWeek) * 5,
      evidence: `${s.thisWeek} check-ins this week against ${s.lastWeek} last week`,
    });
  }
  const m = s.moment || {};
  if (s.todayState === 'onTime' && Number.isFinite(m.minutesLeft) && m.minutesLeft >= 15) {
    out.push({
      key: 'early',
      score: 50,
      evidence: `ticked inside the window with ${m.minutesLeft} minutes to spare`,
    });
  }
  if (s.showedUp >= 2) {
    out.push({
      key: 'volume',
      score: 40,
      evidence: `${s.showedUp} sessions of this routine in the last 30 days`,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Every lever that applies, best first. A lever is ONE concrete change to how
 * the routine is done next time — the recommendation the message exists for.
 * `hint` is what the writer must turn into an action; `fallback` is that
 * action in plain words for when no writer answers.
 */
function levers(s, { brief } = {}) {
  const out = [];
  const m = s.moment || {};
  const later = (s.plan || []).filter((r) => !r.current && r.state === 'not yet');
  const open = todayItemStates(s).filter((i) => i.state === 'not done');
  const top = (s.topActivities || [])[0];
  const lateShare = s.days ? (s.late + s.missed) / s.days : 0;
  const steps = briefSteps(brief);
  const goal = (s.linked || []).find((g) => !g.done);

  if ((s.missedToday || []).length && later.length) {
    const missed = s.missedToday[0];
    const host = later[0];
    out.push({
      key: 'compensate',
      when: 'now',
      score: 95,
      hint: `make up the missed "${missed}" routine with a compressed version folded into "${host.name}" at ${host.time}`,
      fallback: `fold a five-minute "${missed}" into ${host.name} at ${host.time}.`,
    });
  }
  if (open.length && Number.isFinite(m.minutesLeft) && m.minutesLeft >= 10) {
    out.push({
      key: 'finish',
      when: 'now',
      score: 90,
      hint: `"${open[0].body}" is still open with ${m.minutesLeft} minutes left in the window: suggest a compact way to finish it now`,
      fallback: `use the ${m.minutesLeft} minutes left for a short "${open[0].body}".`,
    });
  }
  if (goal) {
    out.push({
      key: 'goal',
      score: 75,
      hint: `aim the next session at the open ${goal.period} goal "${goal.body}" with one specific step that moves it`,
      fallback: `give the next session one step toward "${goal.body}".`,
    });
  }
  if (s.days >= 5 && lateShare >= 0.4) {
    out.push({
      key: 'timing',
      score: 70,
      hint: `this routine slips often (${Math.round(lateShare * 100)}% late or missed): suggest a two-minute starter version that makes starting on time effortless`,
      fallback: 'open with a two-minute starter so the session begins on time.',
    });
  }
  if (top && top.count >= 3) {
    out.push({
      key: 'progress',
      score: 65,
      hint: `"${top.body}" was done ${top.count} times this month: suggest a specific progression or variation of it (a harder variant, one more rep, a new format)`,
      fallback: `level up "${top.body}" with one harder variation.`,
    });
  }
  if (steps.length) {
    out.push({
      key: 'area',
      score: 60,
      hint: `turn the area's next step "${steps[0]}" into the focus of the next session`,
      fallback: `make "${steps[0]}" the focus of the next session.`,
    });
  }
  if (s.bestWeekday && s.weekday && !s.bestWeekday.startsWith(s.weekday)) {
    out.push({
      key: 'pattern',
      score: 40,
      hint: `${s.bestWeekday} are this routine's strongest day: suggest copying what makes those sessions work`,
      fallback: `copy what works on ${s.bestWeekday} into the next session.`,
    });
  }
  out.push({
    key: 'twist',
    score: 10,
    hint: 'suggest one fresh twist for the next session that makes it more rewarding (a format change, a mini challenge, a reward)',
    fallback: 'add one small challenge to the next session and beat it.',
  });
  return out.sort((a, b) => b.score - a.score);
}

/**
 * The strategy for one message.
 * @returns {{ hook, lever, alternatives, facts: string[], numbers: Set<string> }}
 *   `facts` are the only claims the writer may make; `numbers` every number in
 *   them, which is what the validator accepts in the output.
 */
function diagnose(summary, options = {}) {
  const s = summary || {};
  const hookList = hooks(s);
  const leverList = levers(s, options);
  const hook = hookList[0];
  // A lever that only restates the hook adds nothing; the next one does.
  const lever = leverList[0];
  const doneToday = todayItemStates(s).filter((i) => i.state !== 'not done').map((i) => i.body);
  const top = (s.topActivities || [])[0];
  const feeds = (s.linked || []).map((g) => `${g.period} goal "${g.body}" (${g.done ? 'done' : 'open'})`);
  // Colour for the spark: true, specific, and nothing the writer could miscount.
  const facts = [
    hook && hook.evidence,
    ...hookList.slice(1, 3).map((h) => h.evidence),
    doneToday.length && `done in this session: ${doneToday.join(', ')}`,
    top && `most-done activity this month: "${top.body}" (${plural(top.count, 'time')})`,
    feeds.length && `this routine feeds: ${feeds.join('; ')}`,
    s.milestone && `next target: ${s.milestone}`,
  ].filter(Boolean);
  const numbers = new Set();
  [...facts, lever && lever.hint].join(' ').replace(/\d+/g, (n) => {
    numbers.add(n);
    return n;
  });
  return {
    hook,
    lever,
    alternatives: leverList.slice(1, 3),
    facts,
    numbers,
  };
}

const capFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** The brief written out without a model: title, spark, next-time action. */
function fallbackMessage(strategy, routineName = 'this routine') {
  const { hook, lever } = strategy;
  const titles = {
    first: `${routineName} is on the board`,
    record: 'Your longest run yet',
    comeback: 'Back in the game',
    chase: 'The record is in sight',
    weekUp: 'A stronger week',
    early: 'Done with time to spare',
    volume: `${routineName}, done again`,
  };
  const title = titles[hook && hook.key] || `${routineName} done`;
  const spark = hook ? `${capFirst(hook.evidence)}.` : 'Another session banked.';
  return {
    title,
    spark,
    action: capFirst(lever ? lever.fallback : 'add one small challenge to the next session and beat it.'),
    when: (lever && lever.when) || 'next',
  };
}

module.exports = {
  briefSteps,
  hooks,
  levers,
  diagnose,
  fallbackMessage,
  wordsOf,
};
