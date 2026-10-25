/* eslint-env jest */
/**
 * The plan-horizon confirmation's heading went missing: `AtomCardTitle` was
 * imported and used in the template but never added to `components:`, so Vue
 * warned "Unknown custom element: <AtomCardTitle>" and rendered nothing where
 * the "Only N days left this month" line belongs.
 */
const fs = require('fs');
const Vue = require('vue');
const Vuetify = require('vuetify');

jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModal = require('./AiSearchModal.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const HORIZON = {
  remaining: 4,
  unitSingular: 'day',
  unitPlural: 'days',
  period: 'month',
  nextLabel: 'next month',
  nextWord: 'November',
};

// The dialog renders into a detached overlay, so assertions read the document
// rather than the mount point.
const openHorizonDialog = async () => {
  // Vuetify 1.x detaches v-dialog content into `[data-app]`.
  document.body.setAttribute('data-app', 'true');

  const warnings = [];
  const warnHandler = Vue.config.warnHandler;
  Vue.config.warnHandler = (msg) => warnings.push(msg);

  const vm = new Vue({
    render: (h) => h(AiSearchModal, { props: { value: true } }),
  }).$mount();
  const modal = vm.$children[0];
  modal.horizonInfo = HORIZON;
  modal.showHorizonDialog = true;
  await Vue.nextTick();
  await Vue.nextTick();

  Vue.config.warnHandler = warnHandler;
  return { modal, warnings };
};

describe('AiSearchModal plan-horizon dialog heading', () => {
  it('renders the AtomCardTitle heading with the remaining-periods copy', async () => {
    const { warnings } = await openHorizonDialog();

    const title = document.querySelector('.horizon-dialog .horizon-title');
    expect(title).not.toBeNull();
    expect(title.textContent.replace(/\s+/g, ' ')).toContain('Only 4 days left this month');
    expect(warnings).toEqual([]);
  });

  it('registers every component its template uses', () => {
    const template = fs
      .readFileSync(`${__dirname}/AiSearchModal.vue`, 'utf8')
      .split('</template>')
      .slice(0, -1)
      .join('</template>');
    const used = new Set((template.match(/<[A-Z][A-Za-z0-9]*/g) || []).map((t) => t.slice(1)));
    const registered = Object.keys(AiSearchModal.components);

    expect([...used].filter((tag) => !registered.includes(tag))).toEqual([]);
  });
});
