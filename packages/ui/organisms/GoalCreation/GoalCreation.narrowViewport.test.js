/* eslint-env jest */

// D-02: at a ~500px viewport the goal item dialog put the markdown editor off
// the left edge and the last toolbar chip off the right, and neither the
// dialog nor anything inside it could be scrolled to them. jsdom lays nothing
// out, so what is checked here is the markup and the stylesheet the organism
// ships; the viewport itself still has to be looked at by hand.

// The atoms barrel reaches vue-radar, whose .vue entry point is shipped
// untransformed and cannot be parsed here. The markdown editor ships one too,
// so it stands in as the wrapper div the mobile rules are written against.
jest.mock('vue-radar', () => ({}));
jest.mock('@routine-notes/markdown-editor', () => ({
  MarkdownEditor: { render: (h) => h('div', { staticClass: 'markdown-editor' }) },
}));

const fs = require('fs');
const path = require('path');
const Vue = require('vue');
const Vuetify = require('vuetify');
const { parseComponent } = require('vue-template-compiler');

const GoalCreation = require('./GoalCreation.vue').default;

Vue.use(Vuetify);

// Comments come out with the rules, and they name the declarations they
// replaced, so they are dropped before anything is matched against.
const styleSheetOf = (file) => parseComponent(fs.readFileSync(file, 'utf8'))
  .styles.map((block) => block.content)
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations the mobile breakpoint adds, media query and all. */
const narrowBreakpointOf = (css) => {
  const start = css.indexOf('@media (max-width: 600px)');
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return '';
};

const goalCreationCss = styleSheetOf(path.join(__dirname, 'GoalCreation.vue'));
const toolbarCss = styleSheetOf(
  path.join(__dirname, '..', 'GoalTaskToolbar', 'GoalTaskToolbar.vue'),
);

const mountDialog = () => {
  // The date selector's menu detaches into the app root, which jsdom has to
  // be given.
  document.body.setAttribute('data-app', 'true');
  const Ctor = Vue.extend(GoalCreation);
  return new Ctor({
    propsData: {
      newGoalItem: {
        id: 'g1',
        body: 'Conduct End-to-End Testing',
        period: 'day',
        date: '18-08-2026',
        subTasks: [],
      },
    },
  }).$mount();
};

describe('OrganismGoalCreation narrow viewport', () => {
  it('never sizes the editor from the viewport', () => {
    expect(goalCreationCss).not.toMatch(/100vw/);
    expect(goalCreationCss).not.toMatch(/50vw/);
  });

  it('keeps the editor inside its own column on mobile', () => {
    const narrow = narrowBreakpointOf(goalCreationCss);

    expect(narrow).toMatch(/\.goal-creation \.markdown-editor \{[^}]*width: 100%;/);
    expect(narrow).toMatch(/\.goal-creation \.markdown-editor \{[^}]*margin-left: 0;/);
  });

  it('drops the title to a size a narrow dialog can show', () => {
    expect(narrowBreakpointOf(goalCreationCss))
      .toMatch(/#newGoalItemBody \{[^}]*font-size: 24px;/);
  });

  it('stacks the editor and subtask columns below the sm breakpoint', () => {
    const vm = mountDialog();

    expect(vm.$el.querySelector('.flex.sm8').classList.contains('xs12')).toBe(true);
    expect(vm.$el.querySelector('.flex.sm4').classList.contains('xs12')).toBe(true);
  });
});

describe('OrganismGoalTaskToolbar narrow viewport', () => {
  it('wraps the selector chips onto further rows on mobile', () => {
    const narrow = narrowBreakpointOf(toolbarCss);

    expect(narrow).toMatch(/\.v-toolbar__content \{[^}]*flex-wrap: wrap;/);
    // VToolbar sets the row height inline, so it has to be released.
    expect(narrow).toMatch(/\.v-toolbar__content \{[^}]*height: auto !important;/);
  });

  it('still offers a scroll port for anything too wide to wrap', () => {
    expect(toolbarCss).toMatch(/\.toolbar \{[^}]*overflow-x: auto;/);
    expect(mountDialog().$el.querySelector('.goal-task-toolbar .toolbar')).not.toBeNull();
  });
});
