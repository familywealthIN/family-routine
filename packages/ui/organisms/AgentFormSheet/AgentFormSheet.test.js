/* eslint-env jest */
/**
 * AgentFormSheet — New agent / Edit agent.
 *
 * Locked here:
 *   1. Save is disabled until the name AND the start value are both non-empty
 *      once trimmed (whitespace is not a webhook),
 *   2. an empty end value saves as `null`, not as an event with an empty string —
 *      the server would store that and the dispatcher would try to fire it,
 *   3. the routine binding is read-only on an edit, because `updateAgent` takes
 *      no taskRef,
 *   4. the sheet is the chassis `ResponsiveSheet`, so it is a bottom sheet on
 *      phone and a centred dialog above it.
 */
const Vue = require('vue');

const AgentFormSheet = require('./AgentFormSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROUTINES = [
  {
    value: 'r1', time: '09:00', name: 'Start Work', label: '09:00 — Start Work',
  },
  {
    value: 'r2', time: '12:30', name: 'Lunch Walk', label: '12:30 — Lunch Walk',
  },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(AgentFormSheet, { props: { open: true, routineOptions: ROUTINES, ...props } }),
  }).$mount();
  return { vm, el: vm.$el, form: vm.$children[0] };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const type = (node, value) => {
  // eslint-disable-next-line no-param-reassign
  node.value = value;
  node.dispatchEvent(new Event('input'));
};
const tick = () => Vue.nextTick();

const agent = (over = {}) => ({
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  startEvent: { kind: 'url', value: 'https://hooks.n8n.io/start?goal={{ goal_id }}' },
  endEvent: { kind: 'curl', value: "curl -X POST https://x -d '{}'" },
  ...over,
});

describe('AgentFormSheet — save validation', () => {
  it('starts disabled on a new agent', () => {
    const { el } = render();
    expect(q(el, 'agent-form-save').disabled).toBe(true);
    expect(q(el, 'agent-form-save').className).toContain('rn-agf__save--off');
  });

  it('stays disabled with a name but no start value', async () => {
    const { el } = render();
    type(q(el, 'agent-form-name'), 'PR Summarizer');
    await tick();
    expect(q(el, 'agent-form-save').disabled).toBe(true);
  });

  it('stays disabled with a start value but no name', async () => {
    const { el } = render();
    type(q(el, 'agent-form-value-startEvent'), 'https://hooks/start');
    await tick();
    expect(q(el, 'agent-form-save').disabled).toBe(true);
  });

  it('treats whitespace as empty', async () => {
    const { el } = render();
    type(q(el, 'agent-form-name'), '   ');
    type(q(el, 'agent-form-value-startEvent'), '  \n ');
    await tick();
    expect(q(el, 'agent-form-save').disabled).toBe(true);
  });

  it('enables once both are filled', async () => {
    const { el } = render();
    type(q(el, 'agent-form-name'), 'PR Summarizer');
    type(q(el, 'agent-form-value-startEvent'), 'https://hooks/start');
    await tick();
    expect(q(el, 'agent-form-save').disabled).toBe(false);
  });

  it('emits nothing when a disabled save is clicked', () => {
    const { el, form } = render();
    const seen = [];
    form.$on('save', (payload) => seen.push(payload));
    q(el, 'agent-form-save').click();
    expect(seen).toEqual([]);
  });
});

describe('AgentFormSheet — the payload', () => {
  it('trims the name and sends a null end event when the end value is empty', async () => {
    const { el, form } = render();
    const seen = [];
    form.$on('save', (payload) => seen.push(payload));
    type(q(el, 'agent-form-name'), '  PR Summarizer  ');
    type(q(el, 'agent-form-value-startEvent'), 'https://hooks/start');
    await tick();
    q(el, 'agent-form-save').click();
    expect(seen).toEqual([{
      id: null,
      name: 'PR Summarizer',
      taskRef: 'r1',
      startEvent: { kind: 'url', value: 'https://hooks/start' },
      endEvent: null,
    }]);
  });

  it('keeps the end event when it has a value', async () => {
    const { el, form } = render({ agent: agent() });
    const seen = [];
    form.$on('save', (payload) => seen.push(payload));
    await tick();
    q(el, 'agent-form-save').click();
    expect(seen[0].id).toBe('a1');
    expect(seen[0].endEvent).toEqual({ kind: 'curl', value: "curl -X POST https://x -d '{}'" });
  });

  it('defaults a new agent to the first free routine, and takes a prefill', () => {
    expect(render().form.form.taskRef).toBe('r1');
    expect(render({ prefillTaskRef: 'r2' }).form.form.taskRef).toBe('r2');
  });

  it('picks a routine from the chips', async () => {
    const { el, form } = render();
    q(el, 'agent-form-routine-r2').click();
    await tick();
    expect(form.form.taskRef).toBe('r2');
  });
});

describe('AgentFormSheet — event kinds', () => {
  it('offers URL and cURL through the chassis sliding switch', () => {
    const { el } = render();
    const segs = q(el, 'agent-form-kind-startEvent').querySelectorAll('[data-testid="sliding-switch-segment"]');
    expect(Array.from(segs).map((n) => n.textContent.trim())).toEqual(['URL', 'cURL']);
  });

  it('swaps the placeholder and grows the box when the kind becomes cURL', async () => {
    const { el, form } = render();
    expect(q(el, 'agent-form-value-startEvent').getAttribute('rows')).toBe('2');
    expect(q(el, 'agent-form-value-startEvent').placeholder).toContain('{{ goal_id }}');
    form.form.startEvent.kind = 'curl';
    await tick();
    expect(q(el, 'agent-form-value-startEvent').getAttribute('rows')).toBe('4');
    expect(q(el, 'agent-form-value-startEvent').placeholder).toContain('curl -X POST');
  });

  it('hydrates each event with its saved kind', () => {
    const { form } = render({ agent: agent() });
    expect(form.form.startEvent.kind).toBe('url');
    expect(form.form.endEvent.kind).toBe('curl');
  });
});

describe('AgentFormSheet — new vs edit', () => {
  it('titles and labels itself for a new agent', () => {
    const { el } = render();
    expect(text(el)).toContain('New agent');
    expect(text(q(el, 'agent-form-save'))).toBe('Create agent');
    expect(q(el, 'agent-form-delete')).toBeNull();
  });

  it('titles and labels itself for an edit, and offers delete', () => {
    const { el } = render({ agent: agent() });
    expect(text(el)).toContain('Edit agent');
    expect(text(q(el, 'agent-form-save'))).toBe('Save');
    expect(q(el, 'agent-form-delete')).not.toBeNull();
  });

  it('locks the routine on an edit — updateAgent cannot move it', () => {
    const { el } = render({ agent: agent() });
    expect(q(el, 'agent-form-routine-locked')).not.toBeNull();
    expect(q(el, 'agent-form-routine-r2')).toBeNull();
    expect(text(q(el, 'agent-form-routine-locked'))).toContain('cannot be changed');
  });

  it('still names the bound routine when it is filtered out of the free list', () => {
    const { el } = render({ agent: agent({ taskRef: 'r9' }), routineOptions: ROUTINES });
    expect(text(q(el, 'agent-form-routine-locked'))).toContain('r9');
  });

  it('says so when every routine already has an agent', () => {
    const { el } = render({ routineOptions: [] });
    expect(q(el, 'agent-form-no-routines')).not.toBeNull();
  });
});

describe('AgentFormSheet — delete', () => {
  it('asks before deleting', async () => {
    const { el, form } = render({ agent: agent() });
    const seen = [];
    form.$on('delete', (id) => seen.push(id));
    q(el, 'agent-form-delete').click();
    await tick();
    expect(seen).toEqual([]);
    expect(q(el, 'agent-form-delete-confirm')).not.toBeNull();
    q(el, 'agent-form-delete-yes').click();
    expect(seen).toEqual(['a1']);
  });

  it('forgets a pending confirm when the sheet is reopened', async () => {
    const { el, form } = render({ agent: agent() });
    q(el, 'agent-form-delete').click();
    await tick();
    form.confirmingDelete = true;
    form.$emit('close');
    // Reopening re-hydrates, which resets the confirm.
    form.hydrate();
    await tick();
    expect(q(el, 'agent-form-delete-confirm')).toBeNull();
  });
});

describe('AgentFormSheet — the sheet itself', () => {
  // The sheet IS the root element, so these read the root rather than query into it.
  it('is a bottom sheet on phone and a centred dialog on tablet and desktop', () => {
    expect(render({ shell: 'phone' }).el.className).toContain('rn-rsheet--sheet');
    expect(render({ shell: 'tablet' }).el.className).toContain('rn-rsheet--dialog');
    expect(render({ shell: 'desktop' }).el.className).toContain('rn-rsheet--dialog');
  });

  it('renders nothing while closed', () => {
    // v-if on the sheet root leaves an empty placeholder comment, not markup.
    expect(render({ open: false }).el.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('shows a save failure without closing', () => {
    const { el } = render({ agent: agent(), errorMessage: 'An agent already exists for this routine' });
    expect(text(q(el, 'agent-form-error'))).toContain('already exists');
    expect(el.getAttribute('data-testid')).toBe('responsive-sheet');
  });

  it('emits close from Cancel', () => {
    const { el, form } = render();
    const seen = [];
    form.$on('close', () => seen.push(true));
    q(el, 'agent-form-cancel').click();
    expect(seen).toEqual([true]);
  });
});

describe('AgentFormSheet — phone footer with the delete confirm open', () => {
  // jsdom does no layout, so the overlap itself cannot be measured here; pin
  // the rules that stop it. The footer must wrap rather than shrink its
  // buttons, or the confirm "Delete" paints over "Cancel" at 390px.
  // eslint-disable-next-line global-require
  const src = require('fs').readFileSync(require('path').join(__dirname, 'AgentFormSheet.vue'), 'utf8');
  const rule = (selector) => {
    const escaped = selector.replace(/[.]/g, '\\.');
    const m = src.match(new RegExp(`\\n${escaped} \\{([^}]*)\\}`));
    return m ? m[1] : '';
  };

  it('wraps the footer instead of squeezing it', () => {
    expect(rule('.rn-agf__foot')).toMatch(/flex-wrap:\s*wrap/);
  });

  it('never shrinks a footer button below its label', () => {
    ['.rn-agf__text-btn', '.rn-agf__save', '.rn-agf__confirm'].forEach((sel) => {
      expect(rule(sel)).toMatch(/flex-shrink:\s*0/);
    });
  });
});

/**
 * The chassis chrome, measured against `packages/design/Agents.dc.html`'s agent
 * modal — the frame this form targets, and the one Routine Focus's "Build agent"
 * inherits by mounting this same organism (apps/web-app/src/pages/RoutineFocus.vue
 * `onBuildAgent`). A live diff found seven values still sitting on the chassis
 * DEFAULTS instead: 86% tall, a 50px head, a 17px title, a 32px close, body
 * `0 16px 16px`, foot `12px 16px 16px` and the shared r12 pill. Those defaults
 * are correct for Inbox, Skip-day and the goal-item editor, so every rule below
 * is scoped by `rn-agf-sheet` rather than changing the chassis.
 */
describe('AgentFormSheet — the design chrome', () => {
  // eslint-disable-next-line global-require
  const fs = require('fs');
  // eslint-disable-next-line global-require
  const path = require('path');
  const read = (file) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const own = read(path.join(__dirname, 'AgentFormSheet.vue'));
  const chassis = read(path.join(
    __dirname, '..', '..', 'molecules', 'ResponsiveSheet', 'ResponsiveSheet.vue',
  ));
  const decl = (sheet, selector, prop) => {
    const at = sheet.indexOf(`${selector} {`);
    if (at === -1) return null;
    const body = sheet.slice(sheet.indexOf('{', at) + 1, sheet.indexOf('}', at));
    const hit = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
    return hit ? hit[1].trim() : null;
  };
  const ours = (selector, prop) => decl(own, `.rn-agf-sheet ${selector}`, prop);

  it('scopes the overrides to this form, leaving the chassis defaults alone', () => {
    expect(render().el.className).toContain('rn-agf-sheet');
    expect(decl(chassis, '.rn-rsheet__panel', 'max-height')).toBe('86%');
    expect(decl(chassis, '.rn-rsheet__title', 'font-size')).toBe('17px');
    expect(decl(chassis, '.rn-rsheet__close', 'width')).toBe('32px');
    expect(decl(chassis, '.rn-rsheet__body', 'padding')).toBe('0 16px 16px');
    expect(decl(chassis, '.rn-rsheet__foot', 'padding')).toBe('12px 16px 16px');
  });

  it('is 88% tall, not the chassis 86%', () => {
    expect(ours('.rn-rsheet__panel', 'max-height')).toBe('88%');
  });

  // 59px = 10 + a 38px close + 10 + the 1px rule the design draws under the head.
  it('heads at 59px: 10/20 padding, a 38px close and a 1px rule', () => {
    expect(ours('.rn-rsheet__head', 'padding')).toBe('10px 10px 10px 20px');
    expect(ours('.rn-rsheet__head', 'border-bottom')).toBe('1px solid rgba(0, 0, 0, .06)');
    expect(ours('.rn-rsheet__close', 'width')).toBe('38px');
    expect(ours('.rn-rsheet__close', 'height')).toBe('38px');
    const pad = ours('.rn-rsheet__head', 'padding').split(/\s+/).map(parseFloat);
    expect(pad[0] + parseFloat(ours('.rn-rsheet__close', 'height')) + pad[2] + 1).toBe(59);
  });

  it('titles at 18px, not 17px', () => {
    expect(ours('.rn-rsheet__title', 'font-size')).toBe('18px');
  });

  it('pads the body 16px 20px 8px and the footer 12px 20px 18px', () => {
    expect(ours('.rn-rsheet__body', 'padding')).toBe('16px 20px 8px');
    expect(ours('.rn-rsheet__foot', 'padding')).toBe('12px 20px 18px');
  });

  // The shared pill is r12 everywhere else (Progress, Profile, About); only this
  // modal draws r10, so the override lives here and the molecule keeps its 12.
  it('rounds the URL / cURL pill to 10px without touching the shared switch', () => {
    expect(decl(own, '.rn-agf .rn-agf__switch', 'border-radius')).toBe('10px');
    const sw = read(path.join(
      __dirname, '..', '..', 'molecules', 'SlidingSwitch', 'SlidingSwitch.vue',
    ));
    expect(decl(sw, '.rn-switch--thumb', 'border-radius')).toBe('12px');
  });

  /*
   * These already matched the design and must not regress with the chrome: the
   * underline NAME input, the boxed mono textareas, the 32px r16 routine chips
   * and the 40px r20 footer buttons.
   */
  it('keeps the parts that already matched', () => {
    expect(decl(own, '.rn-agf__name', 'font-size')).toBe('18px');
    expect(decl(own, '.rn-agf__name', 'font-weight')).toBe('600');
    expect(decl(own, '.rn-agf__name', 'border-bottom')).toBe('2px solid #288bd5');
    expect(decl(own, '.rn-agf__code', 'border')).toBe('1px solid rgba(0, 0, 0, .14)');
    expect(decl(own, '.rn-agf__code', 'border-radius')).toBe('10px');
    expect(decl(own, '.rn-agf__chip', 'height')).toBe('32px');
    expect(decl(own, '.rn-agf__chip', 'border-radius')).toBe('16px');
    ['.rn-agf__text-btn', '.rn-agf__save'].forEach((sel) => {
      expect(decl(own, sel, 'height')).toBe('40px');
      expect(decl(own, sel, 'border-radius')).toBe('20px');
    });
  });
});
