/* eslint-env jest */
/**
 * RoutineEditorSheet — the one editor for New and Edit.
 *
 * Locked here:
 *   1. the start time steps by 10 minutes and WRAPS through midnight, and its
 *      caption names the next routine's start (excluding itself, or a routine
 *      would bound its own window at 0m),
 *   2. points clamp at 1 and 50 — the stepper must not walk past either — AND
 *      at `maxPoints`, the day's remaining share of its 100-point budget, which
 *      the caption names and which an exhausted day explains rather than clamps,
 *   3. steps reorder by swap and do NOT move at either bound,
 *   4. Delete exists only for a routine that already exists,
 *   5. Save stays clickable and prints what is missing (D-11); it emits the
 *      complete routine, never a partial one,
 *   6. the tag editor is the shared HierarchicalTagInput, not a fourth
 *      re-implementation,
 *   7. 560px on tablet AND desktop — the chassis' per-page width exception.
 */
const Vue = require('vue');

const RoutineEditorSheet = require('./RoutineEditorSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROUTINE = {
  id: 'sw',
  name: 'Start Work',
  description: 'Most important work first.',
  time: '09:00',
  points: 12,
  tags: ['area:work'],
  steps: [{ id: 's1', name: 'Check calendar' }, { id: 's2', name: 'Pick top 3' }],
};

const SIBLINGS = [
  { id: 'mp', time: '06:30' },
  { id: 'sw', time: '09:00' },
  { id: 'lw', time: '12:30' },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineEditorSheet, {
      props: {
        open: true, shell: 'phone', siblings: SIBLINGS, ...props,
      },
    }),
  }).$mount();
  return { vm, el: vm.$el, sheet: vm.$children[0] };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));
const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : null);
const click = (node) => node.dispatchEvent(new Event('click'));
const tick = () => Vue.nextTick();
const type = (node, value) => {
  // eslint-disable-next-line no-param-reassign
  node.value = value;
  node.dispatchEvent(new Event('input'));
};
const hasComponent = (root, name) => root.$options.name === name
  || root.$children.some((child) => hasComponent(child, name));
const key = (node, k) => {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  node.dispatchEvent(event);
  return event;
};

describe('opening', () => {
  it('is nothing at all until open', () => {
    const { vm } = render({ open: false });
    // The sheet is behind a v-if, so a closed editor is a comment placeholder —
    // no fields mounted, and so no draft of a routine nobody asked to edit.
    expect(vm.$el.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('titles itself for a new routine and seeds sensible defaults', () => {
    const { el, sheet } = render();
    expect(text(q(el, 'editor-title'))).toBe('New routine');
    expect(text(q(el, 'editor-time'))).toBe('19:30');
    expect(text(q(el, 'editor-points'))).toBe('diamond10');
    expect(sheet.draft.tags).toEqual([]);
    expect(all(el, 'editor-step')).toHaveLength(0);
  });

  it('opens a new routine at the time the gap row suggested', () => {
    const { el } = render({ defaultTime: '10:50' });
    expect(text(q(el, 'editor-time'))).toBe('10:50');
  });

  it('titles itself for an edit and fills every field', () => {
    const { el, sheet } = render({ routine: ROUTINE });
    expect(text(q(el, 'editor-title'))).toBe('Edit routine');
    expect(q(el, 'editor-name').value).toBe('Start Work');
    expect(q(el, 'editor-description').value).toBe('Most important work first.');
    expect(text(q(el, 'editor-time'))).toBe('09:00');
    expect(text(q(el, 'editor-points'))).toBe('diamond12');
    expect(sheet.draft.tags).toEqual(['area:work']);
    expect(all(el, 'editor-step').map((s) => text(s))).toEqual([
      '1 Check calendar arrow_upward arrow_downward close',
      '2 Pick top 3 arrow_upward arrow_downward close',
    ]);
  });

  it('re-seeds when the page swaps which routine is open', async () => {
    const vm = new Vue({
      data: { routine: ROUTINE },
      render(h) {
        return h(RoutineEditorSheet, { props: { open: true, routine: this.routine, siblings: SIBLINGS } });
      },
    }).$mount();
    expect(q(vm.$el, 'editor-name').value).toBe('Start Work');
    vm.routine = {
      ...ROUTINE, id: 'lw', name: 'Lunch Walk', time: '12:30',
    };
    await tick();
    expect(q(vm.$el, 'editor-name').value).toBe('Lunch Walk');
    expect(text(q(vm.$el, 'editor-time'))).toBe('12:30');
  });

  it('does not keep a cancelled edit — the draft is local', async () => {
    const { el, sheet } = render({ routine: ROUTINE });
    type(q(el, 'editor-name'), 'Renamed');
    await tick();
    expect(sheet.draft.name).toBe('Renamed');
    // Re-opening re-seeds from the prop, so nothing leaked out.
    sheet.reset();
    expect(sheet.draft.name).toBe('Start Work');
  });
});

describe('the 10-minute start stepper', () => {
  it('steps down and up by 10', async () => {
    const { el } = render({ routine: ROUTINE });
    click(q(el, 'editor-time-down'));
    await tick();
    expect(text(q(el, 'editor-time'))).toBe('08:50');
    click(q(el, 'editor-time-up'));
    click(q(el, 'editor-time-up'));
    await tick();
    expect(text(q(el, 'editor-time'))).toBe('09:10');
  });

  it('wraps through midnight in both directions', async () => {
    const { el } = render({ routine: { ...ROUTINE, time: '23:50' } });
    click(q(el, 'editor-time-up'));
    await tick();
    expect(text(q(el, 'editor-time'))).toBe('00:00');
    click(q(el, 'editor-time-down'));
    await tick();
    expect(text(q(el, 'editor-time'))).toBe('23:50');
  });

  it('captions the window the new time carves out', async () => {
    const { el } = render({ routine: ROUTINE });
    expect(text(q(el, 'editor-until'))).toBe('Until 12:30 · 3h 30m');
    // Move past 12:30 and the next start becomes 23:00.
    const { sheet } = { sheet: null };
    expect(sheet).toBe(null);
    for (let i = 0; i < 22; i += 1) click(q(el, 'editor-time-up'));
    await tick();
    expect(text(q(el, 'editor-time'))).toBe('12:40');
    expect(text(q(el, 'editor-until'))).toBe('Until 23:00 · 10h 20m');
  });

  it('never bounds a routine by its own start', () => {
    const { el } = render({ routine: { ...ROUTINE, id: 'lw', time: '12:30' } });
    expect(text(q(el, 'editor-until'))).toBe('Until 23:00 · 10h 30m');
  });
});

describe('the points stepper', () => {
  it('clamps at 1 and will not go below it', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 2 } });
    click(q(el, 'editor-points-down'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond1');
    click(q(el, 'editor-points-down'));
    click(q(el, 'editor-points-down'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond1');
  });

  it('clamps at 50 and will not go above it', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 49 } });
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond50');
    click(q(el, 'editor-points-up'));
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond50');
  });

  it('pulls an out-of-range stored value back in range on open', () => {
    expect(text(q(render({ routine: { ...ROUTINE, points: 0 } }).el, 'editor-points'))).toBe('diamond1');
    expect(text(q(render({ routine: { ...ROUTINE, points: 999 } }).el, 'editor-points'))).toBe('diamond50');
  });
});

/**
 * The day's 100-point budget, which the redesign dropped and the XP ledger
 * settles against. This organism cannot read the routine list, so the ceiling
 * arrives as `maxPoints` — already `min(50, remaining)` — and the editor's job
 * is to stop at it, print it, and never quietly rewrite the user's number.
 */
describe('the day\'s points budget', () => {
  it('stops the + at the budget ceiling, well below the per-routine 50', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 11 }, maxPoints: 12 });
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond12');
    click(q(el, 'editor-points-up'));
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond12');
  });

  it('says why the + stopped, rather than ignoring the tap', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 12 }, maxPoints: 12 });
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-problem'))).toBe('Points must be 12 or fewer');
  });

  it('works the remaining figure into the POINTS caption', () => {
    const { el } = render({ routine: ROUTINE, maxPoints: 8 });
    expect(text(q(el, 'editor-points-caption'))).toBe('Earned when ticked · 8 left today');
  });

  it('leaves the caption alone while the day has more than one routine can take', () => {
    // At or above 50 the budget is not what bounds this routine, so a figure
    // there would be noise.
    expect(text(q(render({ routine: ROUTINE }).el, 'editor-points-caption'))).toBe('Earned when ticked');
    expect(text(q(render({ routine: ROUTINE, maxPoints: 50 }).el, 'editor-points-caption'))).toBe('Earned when ticked');
    expect(text(q(render({ routine: ROUTINE, maxPoints: 80 }).el, 'editor-points-caption'))).toBe('Earned when ticked');
  });

  it('never lets a bad maxPoints lift the per-routine 50', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 50 }, maxPoints: 80 });
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-points'))).toBe('diamond50');
    expect(q(el, 'editor-problem')).toBe(null);
  });

  describe('when the budget is already exhausted', () => {
    const exhausted = (over = {}) => render({ maxPoints: 0, ...over });

    it('still opens, at the 1-point floor, and says why up front (E2E BUG-6)', () => {
      const { el } = exhausted();
      expect(text(q(el, 'editor-title'))).toBe('New routine');
      // NOT 0: that is not a saveable value. And not the default 10 either —
      // nothing about this day can take 10.
      expect(text(q(el, 'editor-points'))).toBe('diamond1');
      expect(text(q(el, 'editor-points-caption'))).toBe('Earned when ticked · 0 left today');
      expect(text(q(el, 'editor-problem')))
        .toBe('All 100 points of the day are already given out — lower another routine to make room');
    });

    it('explains itself instead of naming a value that does not exist', async () => {
      const { el } = exhausted();
      click(q(el, 'editor-points-up'));
      await tick();
      // "Points must be 0 or fewer" would be true and useless — the room has to
      // come off another routine.
      expect(text(q(el, 'editor-problem')))
        .toBe('All 100 points of the day are already given out — lower another routine to make room');
    });

    it('keeps Save clickable and names what is missing (D-11)', async () => {
      const { el, sheet } = exhausted();
      const saved = [];
      sheet.$on('save', (payload) => saved.push(payload));
      type(q(el, 'editor-name'), 'Evening Stretch');
      await tick();
      const save = q(el, 'editor-save');
      // Muted, never disabled — and still the thing that prints the reason.
      expect(save.disabled).toBe(false);
      expect(save.className).toContain('rn-red__save--off');
      click(save);
      await tick();
      expect(saved).toEqual([]);
      expect(text(q(el, 'editor-problem')))
        .toBe('All 100 points of the day are already given out — lower another routine to make room');
    });

    it('a negative remaining reads the same as none at all', () => {
      const { el } = exhausted({ maxPoints: -30 });
      expect(text(q(el, 'editor-points-caption'))).toBe('Earned when ticked · 0 left today');
    });
  });

  // E2E BUG-6: with 1 point left a new routine opened at 10, so the first Save
  // was always refused and the user had to press − nine times.
  describe('a new routine\'s starting points', () => {
    it('opens at the default when the day has room for it', () => {
      expect(text(q(render({ maxPoints: 40 }).el, 'editor-points'))).toBe('diamond10');
    });

    it('opens at what is left when that is less than the default', () => {
      expect(text(q(render({ maxPoints: 1 }).el, 'editor-points'))).toBe('diamond1');
      expect(text(q(render({ maxPoints: 7 }).el, 'editor-points'))).toBe('diamond7');
      expect(q(render({ maxPoints: 7 }).el, 'editor-problem')).toBe(null);
    });

    it('leaves an existing routine at its own stored value', () => {
      expect(text(q(render({ routine: ROUTINE, maxPoints: 1 }).el, 'editor-points'))).toBe('diamond12');
    });
  });

  // E2E BUG-7: the refusal stayed on screen after the value became valid.
  it('drops the points refusal once the points are valid again', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 12 }, maxPoints: 12 });
    click(q(el, 'editor-points-up'));
    await tick();
    expect(text(q(el, 'editor-problem'))).toBe('Points must be 12 or fewer');
    click(q(el, 'editor-points-down'));
    await tick();
    expect(q(el, 'editor-problem')).toBe(null);
  });

  it('keeps the refusal while the points are still over the ceiling', async () => {
    const { el } = render({ routine: { ...ROUTINE, points: 30 }, maxPoints: 10 });
    click(q(el, 'editor-save'));
    await tick();
    click(q(el, 'editor-points-down'));
    await tick();
    expect(text(q(el, 'editor-problem'))).toBe('Points must be 10 or fewer');
  });

  it('does not clear a problem that is not about the points', async () => {
    const { el } = render({ maxPoints: 40 });
    click(q(el, 'editor-save'));
    await tick();
    expect(text(q(el, 'editor-problem'))).toBe('Name is required');
    click(q(el, 'editor-points-down'));
    await tick();
    expect(text(q(el, 'editor-problem'))).toBe('Name is required');
  });

  describe('an existing routine worth more than the day has left', () => {
    // A legacy day that already adds up past 100: the stored 30 stands, but
    // only 10 of it is free.
    const over = { routine: { ...ROUTINE, points: 30 }, maxPoints: 10 };

    it('opens at its own stored value, unclamped', () => {
      expect(text(q(render(over).el, 'editor-points'))).toBe('diamond30');
    });

    it('still steps DOWN — the way out of the problem stays open', async () => {
      const { el } = render(over);
      click(q(el, 'editor-points-down'));
      await tick();
      expect(text(q(el, 'editor-points'))).toBe('diamond29');
    });

    it('refuses the save while it is over, and names the ceiling', async () => {
      const { el, sheet } = render(over);
      const saved = [];
      sheet.$on('save', (payload) => saved.push(payload));
      click(q(el, 'editor-save'));
      await tick();
      expect(text(q(el, 'editor-problem'))).toBe('Points must be 10 or fewer');
      expect(saved).toEqual([]);
    });

    it('saves once the points are back inside the ceiling', async () => {
      const { el, sheet } = render({ routine: { ...ROUTINE, points: 11 }, maxPoints: 10 });
      const saved = [];
      sheet.$on('save', (payload) => saved.push(payload));
      click(q(el, 'editor-points-down'));
      await tick();
      click(q(el, 'editor-save'));
      await tick();
      expect(saved.map((p) => p.points)).toEqual([10]);
      expect(q(el, 'editor-problem')).toBe(null);
    });
  });
});

describe('the steps list', () => {
  it('adds on Enter and clears the field', async () => {
    const { el, sheet } = render({ routine: ROUTINE });
    const input = q(el, 'editor-step-input');
    type(input, 'Open the PR queue');
    key(input, 'Enter');
    await tick();
    expect(all(el, 'editor-step')).toHaveLength(3);
    expect(sheet.stepText).toBe('');
    expect(sheet.draft.steps[2]).toEqual({ key: expect.any(String), id: '', name: 'Open the PR queue' });
  });

  // D-04: the old dialog keyed its step rows on the step's id, which is optional
  // on the server — so an item whose steps had none listed no steps at all. The
  // rows are keyed on a render key of their own now, and a null id is just a
  // step the container will mint an id for before saving.
  it('lists steps that have no id of their own', () => {
    const { el } = render({
      routine: { ...ROUTINE, steps: [{ id: null, name: 'journal' }, { id: null, name: 'lights out' }] },
    });
    expect(all(el, 'editor-step').map(text)).toEqual([
      '1 journal arrow_upward arrow_downward close',
      '2 lights out arrow_upward arrow_downward close',
    ]);
  });

  it('removes only the id-less step that was clicked', async () => {
    const { el, sheet } = render({
      routine: { ...ROUTINE, steps: [{ id: null, name: 'journal' }, { id: null, name: 'lights out' }] },
    });
    click(all(el, 'editor-step-remove')[1]);
    await tick();
    expect(sheet.draft.steps.map((s) => s.name)).toEqual(['journal']);
  });

  it('ignores Enter on an empty or whitespace field', async () => {
    const { el } = render({ routine: ROUTINE });
    const input = q(el, 'editor-step-input');
    key(input, 'Enter');
    type(input, '   ');
    key(input, 'Enter');
    await tick();
    expect(all(el, 'editor-step')).toHaveLength(2);
  });

  it('removes the last step on Backspace in an empty field', async () => {
    const { el } = render({ routine: ROUTINE });
    key(q(el, 'editor-step-input'), 'Backspace');
    await tick();
    expect(all(el, 'editor-step').map(text)).toEqual([
      '1 Check calendar arrow_upward arrow_downward close',
    ]);
  });

  it('leaves the steps alone when Backspace has text to eat', async () => {
    const { el } = render({ routine: ROUTINE });
    const input = q(el, 'editor-step-input');
    type(input, 'half typed');
    key(input, 'Backspace');
    await tick();
    expect(all(el, 'editor-step')).toHaveLength(2);
  });

  it('removes a step by its own ×', async () => {
    const { el } = render({ routine: ROUTINE });
    click(all(el, 'editor-step-remove')[0]);
    await tick();
    expect(all(el, 'editor-step').map(text)).toEqual([
      '1 Pick top 3 arrow_upward arrow_downward close',
    ]);
  });

  it('swaps a step with the one above it', async () => {
    const { el, sheet } = render({ routine: ROUTINE });
    click(all(el, 'editor-step-down')[0]);
    await tick();
    expect(sheet.draft.steps.map((s) => s.name)).toEqual(['Pick top 3', 'Check calendar']);
    expect(all(el, 'editor-step')[0].textContent).toContain('Pick top 3');
  });

  it('does not move the first step up — and dims its ↑', async () => {
    const { el, sheet } = render({ routine: ROUTINE });
    expect(all(el, 'editor-step-up')[0].className).toContain('rn-red__step-btn--off');
    click(all(el, 'editor-step-up')[0]);
    await tick();
    expect(sheet.draft.steps.map((s) => s.name)).toEqual(['Check calendar', 'Pick top 3']);
    // Nothing moved, so nothing flashes.
    expect(sheet.movedKey).toBe('');
  });

  it('does not move the last step down — and dims its ↓', async () => {
    const { el, sheet } = render({ routine: ROUTINE });
    const downs = all(el, 'editor-step-down');
    expect(downs[downs.length - 1].className).toContain('rn-red__step-btn--off');
    click(downs[downs.length - 1]);
    await tick();
    expect(sheet.draft.steps.map((s) => s.name)).toEqual(['Check calendar', 'Pick top 3']);
    expect(sheet.movedKey).toBe('');
  });

  it('leaves the interior arrows live', () => {
    const three = { ...ROUTINE, steps: [...ROUTINE.steps, { id: 's3', name: 'Third' }] };
    const { el } = render({ routine: three });
    expect(all(el, 'editor-step-up')[1].className).not.toContain('rn-red__step-btn--off');
    expect(all(el, 'editor-step-down')[1].className).not.toContain('rn-red__step-btn--off');
  });
});

describe('delete', () => {
  it('is absent on a new routine — there is nothing to delete', () => {
    expect(q(render().el, 'editor-delete')).toBe(null);
  });

  it('is present on an existing routine, and emits its id', () => {
    const { el, sheet } = render({ routine: ROUTINE });
    const removed = [];
    sheet.$on('delete', (id) => removed.push(id));
    expect(q(el, 'editor-delete')).not.toBe(null);
    click(q(el, 'editor-delete'));
    expect(removed).toEqual(['sw']);
  });
});

describe('save', () => {
  it('stays clickable with an empty name, and says what is missing (D-11)', async () => {
    const { el, sheet } = render();
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    expect(q(el, 'editor-save').disabled).toBe(false);
    expect(q(el, 'editor-save').className).toContain('rn-red__save--off');
    click(q(el, 'editor-save'));
    await tick();
    expect(saved).toEqual([]);
    expect(text(q(el, 'editor-problem'))).toBe('Name is required');
  });

  it('still caps the length of a description that is given', async () => {
    const { el, sheet } = render({ routine: { ...ROUTINE, description: 'd'.repeat(256) } });
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    click(q(el, 'editor-save'));
    await tick();
    expect(saved).toEqual([]);
    expect(text(q(el, 'editor-problem'))).toBe('Description must be less than 255 characters');
  });

  it('refuses a name past 100 characters', async () => {
    const { el, sheet } = render({ routine: { ...ROUTINE, name: 'n'.repeat(101) } });
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    click(q(el, 'editor-save'));
    await tick();
    expect(saved).toEqual([]);
    expect(text(q(el, 'editor-problem'))).toBe('Name must be less than 100 characters');
  });

  it('emits the COMPLETE routine, trimmed, so the mutation can return the whole entity', () => {
    const { el, sheet } = render({ routine: ROUTINE });
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    type(q(el, 'editor-name'), '  Deep Work  ');
    click(q(el, 'editor-save'));
    expect(saved).toEqual([{
      id: 'sw',
      name: 'Deep Work',
      description: 'Most important work first.',
      time: '09:00',
      points: 12,
      tags: ['area:work'],
      steps: [{ id: 's1', name: 'Check calendar' }, { id: 's2', name: 'Pick top 3' }],
    }]);
  });

  it('emits no id for a new routine, and marks new steps id-less', async () => {
    const { el, sheet } = render({ defaultTime: '10:50' });
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    type(q(el, 'editor-name'), 'Evening Stretch');
    type(q(el, 'editor-step-input'), 'Hamstrings');
    key(q(el, 'editor-step-input'), 'Enter');
    await tick();
    click(q(el, 'editor-save'));
    expect(saved[0]).toEqual({
      id: '',
      name: 'Evening Stretch',
      description: '',
      time: '10:50',
      points: 10,
      tags: [],
      steps: [{ id: '', name: 'Hamstrings' }],
    });
  });

  it('shows the container\'s failure reason without closing', () => {
    const { el } = render({ routine: ROUTINE, errorMessage: 'Network request failed' });
    expect(text(q(el, 'editor-problem'))).toBe('Network request failed');
    expect(q(el, 'editor-title')).not.toBe(null);
  });

  it('closes on the × and on the backdrop', () => {
    const { el, sheet } = render({ routine: ROUTINE });
    const closed = [];
    sheet.$on('close', () => closed.push(true));
    click(q(el, 'editor-close'));
    click(q(el, 'responsive-sheet-backdrop'));
    expect(closed).toEqual([true, true]);
  });
});

describe('the linked rows', () => {
  it('names no agent and offers to add one', () => {
    const { el } = render({ routine: ROUTINE });
    expect(text(q(el, 'editor-agent'))).toContain('No agent');
    expect(text(q(el, 'editor-agent-manage'))).toBe('Add');
  });

  it('names the bound agent and its status, and offers Manage', () => {
    const { el, sheet } = render({ routine: ROUTINE, agent: { name: 'PR Summarizer', status: 'idle' } });
    expect(text(q(el, 'editor-agent'))).toContain('PR Summarizer');
    expect(text(q(el, 'editor-agent-manage'))).toBe('Manage');
    const fired = [];
    sheet.$on('manage-agent', () => fired.push(true));
    click(q(el, 'editor-agent-manage'));
    expect(fired).toEqual([true]);
  });

  it('names the linked year goal and its percentage', () => {
    const { el } = render({
      routine: ROUTINE,
      yearGoal: { id: 'g1', body: 'Ship v2 of Routine Notes', pct: 83 },
    });
    expect(text(q(el, 'editor-goal'))).toContain('Ship v2 of Routine Notes');
    expect(text(q(el, 'editor-goal'))).toContain('83% this year');
  });

  it('sends the viewer to Year Goals to link one when there is none', () => {
    const { el, sheet } = render({ routine: ROUTINE });
    expect(text(q(el, 'editor-goal'))).toContain('No year goal linked');
    expect(text(q(el, 'editor-goal'))).toContain('Link one from Year Goals');
    const opened = [];
    sheet.$on('open-goal', (id) => opened.push(id));
    click(q(el, 'editor-goal'));
    expect(opened).toEqual(['']);
  });

  it('opens the linked goal by id', () => {
    const { el, sheet } = render({ routine: ROUTINE, yearGoal: { id: 'g1', body: 'Ship v2', pct: 50 } });
    const opened = [];
    sheet.$on('open-goal', (id) => opened.push(id));
    click(q(el, 'editor-goal'));
    expect(opened).toEqual(['g1']);
  });
});

describe('the tag editor', () => {
  it('is the shared HierarchicalTagInput, not a fourth re-implementation', () => {
    const { el, sheet } = render({ routine: ROUTINE, tagUniverse: ['area:work', 'area:work:writing'] });
    expect(hasComponent(sheet, 'MoleculeHierarchicalTagInput')).toBe(true);
    expect(q(el, 'tag-field')).not.toBe(null);
    expect(text(q(el, 'tag-hint'))).toBe('Enter, Tab, comma or space adds · Backspace removes the last tag');
  });

  it('writes its tags straight into the draft, and into the saved payload', async () => {
    const { el, sheet } = render({ routine: ROUTINE, tagUniverse: ['area:work:writing'] });
    const input = q(el, 'tag-text-input');
    input.focus();
    type(input, 'deep-focus');
    key(input, 'Enter');
    await tick();
    expect(sheet.draft.tags).toEqual(['area:work', 'deep-focus']);
    const saved = [];
    sheet.$on('save', (payload) => saved.push(payload));
    click(q(el, 'editor-save'));
    expect(saved[0].tags).toEqual(['area:work', 'deep-focus']);
  });
});

describe('the sheet presentation', () => {
  it('is a bottom sheet on phone', () => {
    const { el } = render({ routine: ROUTINE, shell: 'phone' });
    expect(el.className).toContain('rn-rsheet--sheet');
    expect(el.className).toContain('rn-red');
  });

  it('is a 560px dialog on tablet AND desktop — the per-page exception', () => {
    const tablet = render({ routine: ROUTINE, shell: 'tablet' });
    expect(tablet.el.className).toContain('rn-rsheet--dialog');
    expect(tablet.el.querySelector('.rn-rsheet__panel').style.width).toBe('560px');

    const desktop = render({ routine: ROUTINE, shell: 'desktop' });
    expect(desktop.el.querySelector('.rn-rsheet__panel').style.width).toBe('560px');
  });
});
