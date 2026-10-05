/* eslint-env jest */
/**
 * QuickGoalCreation as the design's **Start Work** sheet.
 *
 * The form itself was right; its presentation was the legacy one. It came up as
 * a 480px Vuetify dialog with a close button, a 17px title, dotted-underline
 * selects and two uppercase pills at fixed widths — none of which
 * `packages/design/Routine Notes Final.dc.html` draws, and the Build Agent
 * control was missing outright, so that flow was unreachable.
 *
 * Locked here:
 *   1. it is the chassis `ResponsiveSheet` — phone bottom sheet, tablet 860,
 *      desktop 720 — and it has NO close button (backdrop dismisses),
 *   2. the footer is two `flex:1` buttons, 44px tall, radius 16,
 *   3. the routine is a locked chip, not a disabled select,
 *   4. PARENT GOAL is a bordered expandable list that checks its selection,
 *   5. the agent button's label flips Build Agent <-> Start Agent on whether an
 *      agent is bound, and Build Agent emits the handoff to the agent form,
 *   6. nothing-typed-and-nothing-open is the blocked case, and it reads as the
 *      orange hint plus a muted Start Task — never as a disabled button,
 *   7. the inline hosts (the classic dashboard's own v-dialog) get no overlay.
 */
const fs = require('fs');
const path = require('path');
const Vue = require('vue');
const Vuetify = require('vuetify');
const { parseComponent } = require('vue-template-compiler');

const QuickGoalCreation = require('./QuickGoalCreation.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROUTINES = [
  { id: 'r1', name: 'Start Work', time: '09:00' },
  { id: 'r2', name: 'Lunch Walk', time: '12:30' },
];

const GOAL_ITEMS = [
  { id: 'wg1', body: 'Ship the dashboard', taskRef: 'r1' },
  { id: 'wg2', body: 'Walk 5k steps', taskRef: 'r2' },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(QuickGoalCreation, {
      props: {
        sheet: true,
        open: true,
        shell: 'phone',
        routineName: 'Start Work',
        routineTime: '09:00',
        routineEndTime: '12:30',
        earnPoints: 12,
        selectedTaskRef: 'r1',
        tasklist: ROUTINES,
        ...props,
      },
    }),
  }).$mount();
  const form = vm.$children[0];
  const events = {};
  ['close', 'add-goal-item', 'start-quick-goal-task', 'start-agent', 'build-agent', 'goal-ref-changed']
    .forEach((name) => {
      events[name] = [];
      form.$on(name, (payload) => events[name].push(payload));
    });
  return { vm, el: vm.$el, form, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : null);
/** Text without the Material-Icons ligatures, which are glyphs, not words. */
const label = (node) => {
  if (!node) return null;
  const clone = node.cloneNode(true);
  [...clone.querySelectorAll('.rn-mi')].forEach((glyph) => glyph.remove());
  return text(clone);
};
const tick = () => Vue.nextTick();

/** The organism's own stylesheet, comments stripped. */
const css = parseComponent(
  fs.readFileSync(path.join(__dirname, 'QuickGoalCreation.vue'), 'utf8'),
).styles.map((block) => block.content).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** The chassis' own stylesheet, so the defaults being overridden are read too. */
const chassisCss = parseComponent(
  fs.readFileSync(
    path.join(__dirname, '..', '..', 'molecules', 'ResponsiveSheet', 'ResponsiveSheet.vue'),
    'utf8',
  ),
).styles.map((block) => block.content).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of one rule, by exact selector. */
const ruleIn = (sheet) => (selector) => {
  const at = sheet.indexOf(`${selector} {`);
  if (at === -1) return '';
  return sheet.slice(sheet.indexOf('{', at) + 1, sheet.indexOf('}', at));
};
const ruleFor = ruleIn(css);
const chassisRule = ruleIn(chassisCss);

// ---------------------------------------------------------------------------
// 1 + 2 — the chassis sheet
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — presentation', () => {
  it('is a bottom sheet on phone, with no width of its own', () => {
    const { el } = render({ shell: 'phone' });
    const panel = el.querySelector('.rn-rsheet__panel');
    expect(panel.className).toContain('rn-rsheet__panel--sheet');
    expect(panel.style.width).toBe('');
    expect(el.className).toContain('rn-qg-sheet');
  });

  it('is an 860px dialog on tablet', () => {
    const { el } = render({ shell: 'tablet' });
    const panel = el.querySelector('.rn-rsheet__panel');
    expect(panel.className).toContain('rn-rsheet__panel--dialog');
    expect(panel.style.width).toBe('860px');
  });

  it('is a 720px dialog on desktop', () => {
    const { el } = render({ shell: 'desktop' });
    expect(el.querySelector('.rn-rsheet__panel').style.width).toBe('720px');
  });

  // The design dismisses this sheet by backdrop. A × next to Start Task is one
  // mis-tap away from the control that starts a routine.
  it('has no close button', () => {
    const { el } = render();
    expect(q(el, 'responsive-sheet-close')).toBeNull();
    expect(el.querySelector('.rn-rsheet__close')).toBeNull();
  });

  it('closes on the backdrop', () => {
    const { el, events } = render();
    q(el, 'responsive-sheet-backdrop').click();
    expect(events.close).toHaveLength(1);
  });

  it('heads with the routine, its window and what it earns', () => {
    const { el } = render();
    expect(text(q(el, 'quick-goal-title'))).toBe('Start Work');
    expect(text(q(el, 'quick-goal-meta'))).toBe('09:00 – 12:30 · earns +12 pts');
  });

  it('keeps the routine description the host sheet used to render', () => {
    const { el } = render({ description: 'Deep work block.' });
    expect(text(q(el, 'quick-goal-description'))).toBe('Deep work block.');
  });

  it('overrides the chassis padding and height with the design values', () => {
    expect(ruleFor('.rn-qg-sheet .rn-rsheet__body')).toContain('padding: 18px 20px 32px');
    expect(ruleFor('.rn-qg-sheet .rn-rsheet__panel--sheet')).toContain('max-height: 90%');
  });

  /*
   * 90% on the centred dialog too. The phone sheet has always had it; the
   * tablet/desktop dialog was silently inheriting the chassis' 86% default,
   * which is right for Inbox, Skip-day and the goal-item editor but is not what
   * Start Work's own frames draw. Overridden per instance, so the default the
   * other three sheets rely on is untouched.
   */
  it('is 90% tall on tablet and desktop too, not the chassis 86%', () => {
    expect(ruleFor('.rn-qg-sheet .rn-rsheet__panel--dialog')).toContain('max-height: 90%');
    expect(chassisRule('.rn-rsheet__panel')).toContain('max-height: 86%');
  });

  // The classic dashboard wraps this container in its own v-dialog; a second
  // overlay inside it would stack two scrims and two radii.
  it('renders inline, with no overlay, for a host that owns its own dialog', () => {
    const { el } = render({ sheet: false });
    expect(el.className).toContain('rn-qg-host');
    expect(el.querySelector('.rn-rsheet__panel')).toBeNull();
    expect(q(el, 'quick-goal-title')).toBeNull();
    // the form itself is all still there
    expect(q(el, 'quick-goal-body')).toBeTruthy();
    expect(q(el, 'quick-goal-start-task')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3 — the footer
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — footer buttons', () => {
  it('is exactly two buttons', () => {
    const { el } = render();
    expect(q(el, 'quick-goal-actions').querySelectorAll('button')).toHaveLength(2);
  });

  // The old pair were 36px Vuetify pills at 185px / 199px, which is what pushed
  // them out of a phone sheet.
  it('shares the row equally at 44px, radius 16', () => {
    const rule = ruleFor('.rn-qg__btn');
    expect(rule).toContain('flex: 1');
    expect(rule).toContain('height: 44px');
    expect(rule).toContain('border-radius: 16px');
    expect(ruleFor('.rn-qg__foot')).toContain('display: flex');
  });

  it('prices both spending buttons when the task has already passed', () => {
    const { el } = render({ redeemCost: 7, agentState: 'assigned' });
    expect(el.querySelectorAll('.rn-qg__cost')).toHaveLength(2);
    expect(text(q(el, 'quick-goal-redeem-note')))
      .toBe('This task has already passed — starting it costs 7 points.');
  });

  // The pending-entity guard owns in-flight protection; a disable-during-load on
  // this screen has already had to be undone once.
  it('spins the pressed button without disabling either', () => {
    const { el } = render({ buttonLoading: true, loadingAction: 'task' });
    expect(q(el, 'quick-goal-task-spin')).toBeTruthy();
    expect(q(el, 'quick-goal-agent-spin')).toBeNull();
    expect(q(el, 'quick-goal-start-task').disabled).toBe(false);
    expect(q(el, 'quick-goal-agent').disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4 — the locked routine row
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — locked routine', () => {
  it('states the binding and carries the lock, instead of a disabled select', () => {
    const { el } = render();
    const row = q(el, 'quick-goal-locked-routine');
    expect(label(row)).toBe('Start Work · 09:00');
    expect(row.querySelector('.rn-qg__locked-lock')).toBeTruthy();
    expect(q(el, 'quick-goal-routine-lock').getAttribute('title'))
      .toBe('Routine is fixed for this sheet');
    // the Vuetify selects it replaced are gone
    expect(el.querySelector('.v-select')).toBeNull();
  });

  it('reads the time off the tasklist, not off the header props', () => {
    const { el } = render({ selectedTaskRef: 'r2', routineName: '', routineTime: '' });
    expect(label(q(el, 'quick-goal-locked-routine'))).toBe('Lunch Walk · 12:30');
  });

  it('is 40px, radius 12, on the muted field token', () => {
    const rule = ruleFor('.rn-qg__locked');
    expect(rule).toContain('height: 40px');
    expect(rule).toContain('border-radius: 12px');
    expect(rule).toContain('background: #f7f7f7');
  });
});

// ---------------------------------------------------------------------------
// 5 — the PARENT GOAL picker
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — parent goal picker', () => {
  it('is collapsed, and says so, until it is tapped', async () => {
    const { el } = render({ goalItemsRef: GOAL_ITEMS });
    expect(q(el, 'quick-goal-goal-options')).toBeNull();
    expect(text(q(el, 'quick-goal-goal-picker'))).toContain('flag');
    expect(text(q(el, 'quick-goal-goal-value'))).toBe('No parent goal');

    q(el, 'quick-goal-goal-picker').click();
    await tick();
    expect(q(el, 'quick-goal-goal-options')).toBeTruthy();
  });

  it('groups the options by routine, keeping a "no parent" row', async () => {
    const { el } = render({ goalItemsRef: GOAL_ITEMS });
    q(el, 'quick-goal-goal-picker').click();
    await tick();

    const heads = [...el.querySelectorAll('.rn-qg__opt-head')].map(text);
    expect(heads).toEqual(['Start Work', 'Lunch Walk']);
    expect(q(el, 'quick-goal-option-none')).toBeTruthy();
    expect(text(q(el, 'quick-goal-option-wg1'))).toBe('Ship the dashboard');
  });

  it('checks the picked option, closes, and reports the new goalRef', async () => {
    const { el, form, events } = render({ goalItemsRef: GOAL_ITEMS });
    q(el, 'quick-goal-goal-picker').click();
    await tick();
    q(el, 'quick-goal-option-wg1').click();
    await tick();

    expect(form.newGoalItem.goalRef).toBe('wg1');
    expect(events['goal-ref-changed']).toEqual(['wg1']);
    expect(q(el, 'quick-goal-goal-options')).toBeNull();
    expect(text(q(el, 'quick-goal-goal-value'))).toBe('Ship the dashboard');

    q(el, 'quick-goal-goal-picker').click();
    await tick();
    expect(q(el, 'quick-goal-option-wg1').className).toContain('rn-qg__opt--on');
    expect(q(el, 'quick-goal-option-wg1').querySelector('.rn-qg__opt-check')).toBeTruthy();
    expect(q(el, 'quick-goal-option-wg2').querySelector('.rn-qg__opt-check')).toBeNull();
  });

  it('clears back to no parent', async () => {
    const { el, form } = render({ goalItemsRef: GOAL_ITEMS });
    q(el, 'quick-goal-goal-picker').click();
    await tick();
    q(el, 'quick-goal-option-wg1').click();
    await tick();
    q(el, 'quick-goal-goal-picker').click();
    await tick();
    q(el, 'quick-goal-option-none').click();
    await tick();
    expect(form.newGoalItem.goalRef).toBe('');
  });

  it('shows the Related Goals timeline once a parent is picked', async () => {
    const { el, form } = render({
      goalItemsRef: GOAL_ITEMS,
      relatedTasks: [{ id: 'g9', body: 'Draft the spec', date: '10-09-2026' }],
    });
    expect(el.textContent).not.toContain('Related Goals');
    form.newGoalItem.goalRef = 'wg1';
    await tick();
    expect(el.textContent).toContain('Related Goals (1)');
  });
});

// ---------------------------------------------------------------------------
// 6 — Build Agent / Start Agent
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — the agent button', () => {
  it('builds an agent when the routine has none', () => {
    const { el, events } = render({ agentState: 'none' });
    expect(label(q(el, 'quick-goal-agent'))).toBe('Build Agent');
    q(el, 'quick-goal-agent').click();
    // No payload: the host pre-binds the routine itself (the container passes
    // selectedTaskRef, the page opens AgentFormContainer on it).
    expect(events['build-agent']).toEqual([undefined]);
    expect(events['start-agent']).toEqual([]);
  });

  it('starts the agent when one is bound', () => {
    const { el, events } = render({ agentState: 'assigned' });
    expect(label(q(el, 'quick-goal-agent'))).toBe('Start Agent');
    q(el, 'quick-goal-agent').click();
    expect(events['build-agent']).toEqual([]);
    expect(events['start-agent']).toHaveLength(1);
    expect(events['start-agent'][0]).toMatchObject({ taskRef: 'r1' });
  });

  it('flips the label live when an agent appears', async () => {
    const { el, form } = render({ agentState: 'none' });
    form.$parent.$forceUpdate();
    expect(QuickGoalCreation.computed.agentButtonLabel.call({ agentAssigned: true }))
      .toBe('Start Agent');
    expect(QuickGoalCreation.computed.agentButtonLabel.call({ agentAssigned: false }))
      .toBe('Build Agent');
    await tick();
    expect(label(q(el, 'quick-goal-agent'))).toBe('Build Agent');
  });
});

// ---------------------------------------------------------------------------
// 7 — the empty-checklist block
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — nothing to start with', () => {
  it('warns in orange and mutes Start Task, but never disables it', () => {
    const { el } = render({ openItemCount: 0 });
    expect(text(q(el, 'quick-goal-hint')))
      .toBe('Type a goal item to start — a routine can’t start without one.');
    expect(q(el, 'quick-goal-hint').className).toContain('rn-qg__hint--warn');
    expect(q(el, 'quick-goal-start-task').className).toContain('rn-qg__btn--off');
    expect(q(el, 'quick-goal-start-task').disabled).toBe(false);
  });

  it('un-mutes the moment something is typed', async () => {
    const { el, form } = render({ openItemCount: 0 });
    form.newGoalItem.body = 'Write release notes';
    await tick();
    expect(q(el, 'quick-goal-start-task').className).not.toContain('rn-qg__btn--off');
    expect(q(el, 'quick-goal-hint').className).not.toContain('rn-qg__hint--warn');
  });

  it('creates the typed item on Start Task, tags and parent and all', async () => {
    const { el, form, events } = render({ goalItemsRef: GOAL_ITEMS, openItemCount: 0 });
    form.newGoalItem.body = 'Write release notes';
    form.newGoalItem.goalRef = 'wg1';
    await tick();
    q(el, 'quick-goal-start-task').click();
    expect(events['add-goal-item']).toHaveLength(1);
    expect(events['add-goal-item'][0]).toMatchObject({
      body: 'Write release notes', goalRef: 'wg1', taskRef: 'r1',
    });
  });

  it('clears the typed task from the line', async () => {
    const { el, form } = render();
    form.newGoalItem.body = 'oops';
    await tick();
    q(el, 'quick-goal-clear').click();
    await tick();
    expect(form.newGoalItem.body).toBe('');
    expect(q(el, 'quick-goal-clear')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Housekeeping — a reopened sheet is a fresh one
// ---------------------------------------------------------------------------
describe('QuickGoalCreation — reopening', () => {
  it('collapses the picker and the tag editor when it closes', async () => {
    const { form } = render({ goalItemsRef: GOAL_ITEMS });
    form.pickerOpen = true;
    form.tagsOpen = true;
    QuickGoalCreation.watch.open.call(form, false);
    await tick();
    expect(form.pickerOpen).toBe(false);
    expect(form.tagsOpen).toBe(false);
  });

  it('keeps the tag editor one tap away rather than dropping it', async () => {
    const { el } = render();
    const toggle = q(el, 'quick-goal-tags-toggle');
    expect(label(toggle)).toBe('Add tags');
    toggle.click();
    await tick();
    expect(q(el, 'quick-goal-tags-toggle')).toBeNull();
    expect(el.querySelector('.goal-tags-input')).toBeTruthy();
  });
});
