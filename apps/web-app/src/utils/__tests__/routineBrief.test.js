/* eslint-env jest */
/**
 * The brief's shaping rules.
 *
 * The load-bearing one is `parseNextSteps`: whatever survives it is appended to
 * the user's checklist verbatim, so a sentence, a heading or the server's
 * "unable to generate" fallback getting through is a real defect, not cosmetic.
 */
const {
  tagKind,
  breadcrumbSegments,
  breadcrumbLabel,
  parseNextSteps,
  parseDescription,
  buildBriefBlocks,
  briefSubline,
  unaddedSteps,
  briefQuickReplyIntent,
  buildRecapReply,
  buildPlanReply,
} = require('../routineBrief');

const ENTRY = {
  tag: 'area:health:fitness',
  description: 'About 3 km every lunch break toward Walk 1,000 km.',
  nextSteps: 'Try the river loop\n\nLog shoe mileage',
  activity: [
    { date: 'Fri', text: '3.1 km', done: true },
    { date: 'Thu', text: 'Missed · meeting ran over', done: false },
  ],
};

describe('tagKind / breadcrumbSegments', () => {
  it('reads the kind off the first segment and nothing else', () => {
    expect(tagKind('area:health')).toBe('area');
    expect(tagKind('project:dashboard')).toBe('project');
    expect(tagKind('AREA:health')).toBe('area');
    expect(tagKind('context:home')).toBeNull();
    expect(tagKind('')).toBeNull();
  });

  it('drops the kind segment and title-cases the kebab-case rest', () => {
    expect(breadcrumbSegments('area:health:fitness')).toEqual(['Health', 'Fitness']);
    expect(breadcrumbSegments('project:routine-notes-v2')).toEqual(['Routine Notes V2']);
    expect(breadcrumbLabel('area:health:fitness')).toBe('Health › Fitness');
    // A bare kind has no breadcrumb to draw.
    expect(breadcrumbSegments('area')).toEqual([]);
  });
});

describe('parseNextSteps', () => {
  it('recovers the fragments from the blank-line-joined cache blob', () => {
    expect(parseNextSteps('Try the river loop\n\nLog shoe mileage'))
      .toEqual(['Try the river loop', 'Log shoe mileage']);
  });

  it('strips list markers, emphasis, quotes and trailing punctuation', () => {
    expect(parseNextSteps('- **Clear inbox to zero**.\n2) "Log shoe mileage";'))
      .toEqual(['Clear inbox to zero', 'Log shoe mileage']);
  });

  it('refuses a sentence, a heading and the server fallback', () => {
    expect(parseNextSteps([
      'Next steps:',
      'Unable to generate next steps at this time. Please try again later.',
      'You should probably consider reviewing the dashboard pull request comments today',
      'Review the PR',
    ])).toEqual(['Review the PR']);
  });

  it('keeps at most three, and never the same fragment twice', () => {
    expect(parseNextSteps('Alpha one\nalpha ONE\nBeta two\nGamma three\nDelta four'))
      .toEqual(['Alpha one', 'Beta two', 'Gamma three']);
  });

  it('is empty for nothing at all', () => {
    expect(parseNextSteps('')).toEqual([]);
    expect(parseNextSteps(null)).toEqual([]);
  });
});

describe('parseDescription', () => {
  it('keeps the commitment line and clips prose to the word budget', () => {
    expect(parseDescription('Product + engineering. Mornings for the hardest thing.'))
      .toBe('Product + engineering. Mornings for the hardest thing.');
    const long = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    expect(parseDescription(long).endsWith('...')).toBe(true);
  });

  it('shows nothing rather than the model outage copy', () => {
    expect(parseDescription('Unable to generate summary at this time. Please try again later.'))
      .toBe('');
    expect(parseDescription('')).toBe('');
  });
});

describe('buildBriefBlocks', () => {
  it('builds one block per tag with the kind, breadcrumb and recent stat', () => {
    const [block] = buildBriefBlocks([ENTRY]);
    expect(block.kind).toBe('AREA');
    expect(block.icon).toBe('dashboard');
    expect(block.color).toBe('#288bd5');
    expect(block.segments).toEqual(['Health', 'Fitness']);
    expect(block.stat).toBe('1/2 recent');
    expect(block.steps).toEqual([
      { text: 'Try the river loop', added: false },
      { text: 'Log shoe mileage', added: false },
    ]);
  });

  it('colours a project differently from an area', () => {
    const [block] = buildBriefBlocks([{ ...ENTRY, tag: 'project:dashboard' }]);
    expect(block.kind).toBe('PROJECT');
    expect(block.icon).toBe('folder');
    expect(block.color).toBe('#E68900');
  });

  it('marks the steps the checklist already holds', () => {
    const [block] = buildBriefBlocks([ENTRY], {
      isAdded: (text) => text === 'Log shoe mileage',
    });
    expect(block.steps[1].added).toBe(true);
    expect(unaddedSteps([block])).toEqual(['Try the river loop']);
  });

  // The daily context run has not reached every tag — an empty block is worse
  // than no block.
  it('drops a tag with nothing cached, and a tag that is not an area or project', () => {
    const empty = {
      tag: 'area:empty', description: '', nextSteps: '', activity: [],
    };
    const notAKind = {
      tag: 'context:home', description: 'x', nextSteps: 'Do a thing', activity: [],
    };
    expect(buildBriefBlocks([empty, notAKind, ENTRY])).toHaveLength(1);
  });

  // A tag whose context is being built on demand right now. Kind and
  // breadcrumb come off the tag string, so they can render before any model
  // call returns and cannot change when the body lands.
  it('keeps a pending tag as its kind and breadcrumb, with an empty body', () => {
    const [block] = buildBriefBlocks([{ tag: 'project:dashboard', pending: true }]);
    expect(block).toEqual({
      tag: 'project:dashboard',
      kind: 'PROJECT',
      icon: 'folder',
      color: '#E68900',
      segments: ['Dashboard'],
      breadcrumb: 'Dashboard',
      description: '',
      steps: [],
      activity: [],
      stat: '',
      pending: true,
    });
  });

  // The run has come back with nothing (or failed). The placeholder has to go,
  // not sit there as a breadcrumb that never fills in.
  it('drops the same tag again the moment it stops being pending', () => {
    expect(buildBriefBlocks([{ tag: 'project:dashboard', pending: false }])).toEqual([]);
    expect(buildBriefBlocks([{
      tag: 'project:dashboard', description: '', nextSteps: '', activity: [], pending: false,
    }])).toEqual([]);
  });

  it('marks a block built from real context as not pending', () => {
    expect(buildBriefBlocks([ENTRY])[0].pending).toBe(false);
  });

  // The pending path must not become a way round the length guards: whatever a
  // lazily-fetched entry holds goes through parseNextSteps/parseDescription
  // exactly as a swept one does, because `pending` is only consulted when
  // there is nothing left after them.
  it('still applies the length normalisers to a tag that was fetched lazily', () => {
    const [block] = buildBriefBlocks([{
      tag: 'area:work',
      pending: true,
      description: '## Summary: **Product + engineering. Mornings for the hardest thing.**',
      nextSteps: '1) "Clear inbox to zero".\n\n'
        + 'You should probably consider reviewing the dashboard pull request comments today',
    }]);
    expect(block.pending).toBe(false);
    expect(block.description).toBe('Product + engineering. Mornings for the hardest thing.');
    // The sentence is refused outright — it would have landed on a checklist.
    expect(block.steps).toEqual([{ text: 'Clear inbox to zero', added: false }]);
  });

  it('keeps a block that has only activity, with no stat when it has none', () => {
    const [withActs] = buildBriefBlocks([{ tag: 'area:work', activity: [{ date: 'Fri', text: 'Standup notes sent', done: true }] }]);
    expect(withActs.stat).toBe('1/1 recent');
    const [noActs] = buildBriefBlocks([{ tag: 'area:work', description: 'Mornings for the hardest thing.' }]);
    expect(noActs.stat).toBe('');
    expect(noActs.activity).toEqual([]);
  });

  it('caps past activity at three rows', () => {
    const activity = Array.from({ length: 6 }, (_, i) => ({ date: 'Fri', text: `row ${i}`, done: true }));
    expect(buildBriefBlocks([{ ...ENTRY, activity }])[0].activity).toHaveLength(3);
  });
});

describe('briefSubline', () => {
  it('joins the breadcrumbs and counts the steps', () => {
    const blocks = buildBriefBlocks([ENTRY, { ...ENTRY, tag: 'project:dashboard', nextSteps: 'Ship it' }]);
    expect(briefSubline(blocks)).toBe('Health › Fitness · Dashboard · 3 next steps');
  });

  it('singularises one step', () => {
    expect(briefSubline(buildBriefBlocks([{ ...ENTRY, nextSteps: 'Ship it' }])))
      .toBe('Health › Fitness · 1 next step');
  });

  // While every block is still waiting the count is unknown. "0 next steps"
  // would be a claim; the breadcrumbs alone are not.
  it('omits the count while every block is still pending', () => {
    const blocks = buildBriefBlocks([
      { tag: 'area:health:fitness', pending: true },
      { tag: 'project:dashboard', pending: true },
    ]);
    expect(briefSubline(blocks)).toBe('Health › Fitness · Dashboard');
  });

  it('counts the settled blocks once one of them has arrived', () => {
    const blocks = buildBriefBlocks([ENTRY, { tag: 'project:dashboard', pending: true }]);
    expect(briefSubline(blocks)).toBe('Health › Fitness · Dashboard · 2 next steps');
  });
});

describe('briefQuickReplyIntent', () => {
  it('recognises the two chips and leaves everything else to the model', () => {
    expect(briefQuickReplyIntent('What did I do last time?')).toBe('recap');
    expect(briefQuickReplyIntent('Plan from next steps')).toBe('plan');
    expect(briefQuickReplyIntent('Break it down')).toBeNull();
    expect(briefQuickReplyIntent('add review analytics events')).toBeNull();
    expect(briefQuickReplyIntent('How am I doing?')).toBeNull();
    expect(briefQuickReplyIntent('')).toBeNull();
  });
});

describe('buildRecapReply', () => {
  it('recaps the two most recent rows and names the first unmet step', () => {
    expect(buildRecapReply(buildBriefBlocks([ENTRY]))).toBe(
      'Last Fri: 3.1 km. Thu: Missed · meeting ran over.'
      + ' Next up on Health › Fitness: “Try the river loop”.',
    );
  });

  it('drops the next-up clause once every step is on the checklist', () => {
    const blocks = buildBriefBlocks([ENTRY], { isAdded: () => true });
    expect(buildRecapReply(blocks)).toBe('Last Fri: 3.1 km. Thu: Missed · meeting ran over.');
  });

  it('says so when the tag has no history yet', () => {
    const blocks = buildBriefBlocks([{ ...ENTRY, activity: [] }]);
    expect(buildRecapReply(blocks)).toBe(
      'Nothing logged on Health › Fitness yet. Next up on Health › Fitness: “Try the river loop”.',
    );
  });
});

describe('buildPlanReply', () => {
  it('offers the unadded steps as proposals, named by their breadcrumbs', () => {
    const blocks = buildBriefBlocks([ENTRY, { ...ENTRY, tag: 'project:dashboard', nextSteps: 'Ship it' }]);
    expect(buildPlanReply(blocks)).toEqual({
      text: 'From Health › Fitness and Dashboard:',
      proposals: ['Try the river loop', 'Log shoe mileage', 'Ship it'],
    });
  });

  it('has nothing to propose once every step is added', () => {
    const blocks = buildBriefBlocks([ENTRY], { isAdded: () => true });
    expect(buildPlanReply(blocks))
      .toEqual({ text: 'All next steps are already on the checklist.', proposals: [] });
  });
});
