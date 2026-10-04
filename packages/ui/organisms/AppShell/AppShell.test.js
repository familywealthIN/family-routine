/* eslint-env jest */
/**
 * Unit tests for the redesign chassis (docs/redesign/chassis.md).
 *
 * Mounted assertions follow RoutineFocusCard.test.js; the breakpoint rule is
 * exercised against a vm-like context because `$vuetify` is the one thing the
 * shell reads that no prop supplies.
 */
const fs = require('fs');
const path = require('path');
const Vue = require('vue');

const AppShell = require('./AppShell.vue').default;
const {
  MORE_NAV, PRIMARY_NAV, navKey,
} = require('../../constants/navigation');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const USER = { name: 'Alex Morgan', email: 'alex@routine.app', picture: 'https://cdn/a.png' };

const render = (props = {}, slots = null) => {
  const vm = new Vue({
    render: (h) => h(AppShell, {
      props: {
        shell: 'phone',
        active: 'progress',
        title: 'Progress',
        subtitle: 'Week of 6 – 12 Sep',
        points: 128,
        user: USER,
        streakDays: 6,
        scores: { D: 80, K: 60, G: 40 },
        yearAverage: 50,
        ...props,
      },
    }, slots ? slots(h) : undefined),
  }).$mount();
  return { vm, shell: vm.$children[0], el: vm.$el };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('OrganismAppShell — the breakpoint rule', () => {
  // Copied from RoutineFocus.vue's `shell` computed. There is one scheme.
  const shellFor = (breakpoint) => AppShell.computed.shellName.call({
    shell: '', $vuetify: breakpoint ? { breakpoint } : undefined,
  });

  it('reads xsOnly as the phone', () => {
    expect(shellFor({ xsOnly: true, width: 400 })).toBe('phone');
  });

  it('turns desktop at exactly 1264px, not before', () => {
    expect(shellFor({ xsOnly: false, width: 1263 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no breakpoint at all', () => {
    expect(shellFor(null)).toBe('phone');
  });

  it('lets an explicit shell prop win over the breakpoint', () => {
    expect(AppShell.computed.shellName.call({
      shell: 'desktop', $vuetify: { breakpoint: { xsOnly: true, width: 400 } },
    })).toBe('desktop');
  });
});

describe('OrganismAppShell — phone', () => {
  it('renders the 64px header, the page slot and the four-item bottom bar', () => {
    const { el } = render();
    expect(testid(el, 'shell-topbar')).not.toBeNull();
    expect(testid(el, 'shell-tabbar')).not.toBeNull();
    expect(el.querySelectorAll('.rn-shell__tab')).toHaveLength(4);
    expect(Array.from(el.querySelectorAll('.rn-shell__tab-label')).map((n) => n.textContent.trim()))
      .toEqual(['Home', 'Priority', 'Agents', 'Goals']);
    // The rail and sidebar belong to the other shells.
    expect(testid(el, 'shell-rail')).toBeNull();
    expect(testid(el, 'shell-sidebar')).toBeNull();
  });

  it('sets the 24px/700 title and the 12px subtitle', () => {
    const { el } = render();
    const title = el.querySelector('.rn-shell__title');
    expect(title.textContent.trim()).toBe('Progress');
    expect(title.style.fontSize).toBe('24px');
    expect(el.querySelector('.rn-shell__subtitle').style.fontSize).toBe('12px');
  });

  it('shows the points pill and a 32px avatar inside a 40px tap target', () => {
    const { el } = render();
    expect(testid(el, 'focus-points-chip').textContent).toContain('128');
    expect(el.querySelector('.rn-shell__avatar').style.width).toBe('32px');
    expect(testid(el, 'shell-avatar').className).toContain('rn-shell__avatar-btn');
  });

  it('puts the page in the body slot and header actions in the header', () => {
    const { el } = render({}, (h) => [
      h('div', { class: 'page-probe' }, 'page'),
      h('div', { class: 'hdr-probe', slot: 'header-actions' }, 'action'),
    ]);
    expect(testid(el, 'shell-body').querySelector('.page-probe').textContent).toBe('page');
    expect(testid(el, 'shell-topbar').querySelector('.hdr-probe')).not.toBeNull();
    expect(testid(el, 'shell-body').querySelector('.hdr-probe')).toBeNull();
  });
});

describe('OrganismAppShell — the Goals ring', () => {
  it('rings only Goals, and draws the year average on it', () => {
    const { el } = render({ yearAverage: 50 });
    const rings = el.querySelectorAll('[data-testid="shell-nav-ring"]');
    expect(rings).toHaveLength(1);
    expect(rings[0].closest('.rn-shell__tab').textContent).toContain('Goals');
    const arc = rings[0].querySelectorAll('circle')[1];
    // c = 2*PI*11 = 69.1; offset = c * (1 - 50/100).
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(34.55, 2);
  });

  it('shrinks the glyph to 14px so it fits inside the ring', () => {
    const { el } = render();
    const ringed = testid(el, 'shell-nav-ring');
    expect(ringed.querySelector('.rn-shell__glyph').style.fontSize).toBe('14px');
    const plain = el.querySelectorAll('.rn-shell__glyph-wrap')[0];
    expect(plain.querySelector('.rn-shell__glyph').style.fontSize).toBe('24px');
  });

  it('empties the ring at 0 and fills it at 100', () => {
    const offsetFor = (pct) => Number(
      testid(render({ yearAverage: pct }).el, 'shell-nav-ring')
        .querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'),
    );
    expect(offsetFor(0)).toBeCloseTo(69.1, 2);
    expect(offsetFor(100)).toBeCloseTo(0, 2);
  });
});

describe('OrganismAppShell — navigation is an emit', () => {
  it('emits navigate with the nav key', () => {
    const { shell, el } = render();
    const keys = [];
    shell.$on('navigate', (key) => keys.push(key));
    testid(el, 'shell-tab-goals').click();
    testid(el, 'shell-tab-home').click();
    expect(keys).toEqual(['goals', 'home']);
  });

  it('hands the whole item over as well, so the page can read the route', () => {
    const { shell, el } = render();
    const items = [];
    shell.$on('navigate', (key, item) => items.push(item));
    testid(el, 'shell-tab-priority').click();
    expect(items[0].route).toBe('/priority');
  });

  it('marks the active row from the `active` key, matching no route by accident', () => {
    // Routines and Profile are both under /settings — only the key can separate them.
    const { el } = render({ shell: 'desktop', active: 'profile' });
    expect(testid(el, 'shell-more-profile').style.background).toContain('40, 139, 213');
    expect(testid(el, 'shell-more-routines').style.background).toBe('');
  });

  it('has no Log out — signing out lives on the Profile page', () => {
    const { el } = render({ shell: 'desktop' });
    expect(testid(el, 'shell-more-logout')).toBeNull();
    expect(MORE_NAV.map(navKey)).not.toContain('logout');
    expect(testid(el, 'shell-more-profile')).not.toBeNull();
  });
});

describe('OrganismAppShell — tablet rail', () => {
  const tablet = (props) => render({ shell: 'tablet', ...props });

  it('renders the 76px rail with icon pills, a More toggle and a pinned avatar', () => {
    const { el } = tablet();
    expect(testid(el, 'shell-rail')).not.toBeNull();
    expect(el.querySelectorAll('.rn-shell__rail-pill:not(.rn-shell__rail-pill--sm)')).toHaveLength(4);
    expect(testid(el, 'shell-more-toggle')).not.toBeNull();
    expect(el.querySelector('.rn-shell__rail-avatar').style.width).toBe('40px');
    expect(testid(el, 'shell-tabbar')).toBeNull();
  });

  it('draws the status strip the designs show', () => {
    const { el } = tablet({ clock: '9:30' });
    const strip = testid(el, 'shell-status');
    expect(strip.textContent).toContain('9:30');
    expect(strip.textContent).toContain('wifi');
    expect(strip.textContent).toContain('battery_full');
  });

  it('can drop the status strip, since a real browser already paints one', () => {
    expect(testid(tablet({ statusBar: false }).el, 'shell-status')).toBeNull();
  });

  it('starts the More list expanded and collapses it on the toggle', () => {
    const { el } = tablet();
    expect(testid(el, 'shell-more-list')).not.toBeNull();
    expect(el.querySelectorAll('.rn-shell__rail-pill--sm')).toHaveLength(MORE_NAV.length);
    testid(el, 'shell-more-toggle').click();
    return Vue.nextTick().then(() => {
      expect(testid(el, 'shell-more-list')).toBeNull();
    });
  });

  it('swaps the toggle glyph more_horiz <-> expand_less', () => {
    const { el, shell } = tablet();
    expect(el.querySelector('.rn-shell__more-glyph').textContent.trim()).toBe('expand_less');
    shell.toggleMore();
    return Vue.nextTick().then(() => {
      expect(el.querySelector('.rn-shell__more-glyph').textContent.trim()).toBe('more_horiz');
    });
  });

  it('runs tablet titles a size below desktop', () => {
    expect(tablet().el.querySelector('.rn-shell__title').style.fontSize).toBe('22px');
    expect(render({ shell: 'desktop' }).el.querySelector('.rn-shell__title').style.fontSize).toBe('26px');
  });
});

describe('OrganismAppShell — desktop sidebar', () => {
  it('shows the balance in the profile line, and a dash when it is unknown', () => {
    const label = (over) => AppShell.computed.pointsLabel.call({
      points: 1815, pointsLoading: false, pointsError: false, ...over,
    });
    expect(label()).toBe('1,815 points');
    expect(label({ pointsLoading: true })).toBe('— points');
    expect(label({ pointsError: true })).toBe('— points');
    expect(label({ points: null })).toBe('— points');
  });

  const desktop = (props) => render({ shell: 'desktop', ...props });

  it('renders the logo, wordmark, labelled rows and the profile footer', () => {
    const { el } = desktop();
    expect(el.querySelector('.rn-shell__brand-name').textContent.trim()).toBe('Routine Notes');
    expect(el.querySelectorAll('.rn-shell__row'))
      .toHaveLength(PRIMARY_NAV.length + 1 + MORE_NAV.length);
    const profile = testid(el, 'shell-profile');
    expect(profile.textContent).toContain('Alex Morgan');
    expect(profile.textContent).toContain('128 points');
  });

  it('tints the active row and recolours its text', () => {
    const { el } = desktop({ active: 'home' });
    const row = testid(el, 'shell-row-home');
    expect(row.style.background).toContain('40, 139, 213');
    expect(row.style.color).toBe('rgb(31, 111, 171)');
  });

  it('leaves an idle row without an inline background so :hover still shows', () => {
    expect(testid(desktop({ active: 'home' }).el, 'shell-row-agents').style.background).toBe('');
  });

  it('rotates the More chevron 180deg while the list is open', () => {
    const { el, shell } = desktop();
    expect(el.querySelector('.rn-shell__row-chevron').style.transform).toBe('rotate(180deg)');
    shell.toggleMore();
    return Vue.nextTick().then(() => {
      expect(el.querySelector('.rn-shell__row-chevron').style.transform).toBe('rotate(0deg)');
      expect(testid(el, 'shell-more-list')).toBeNull();
    });
  });
});

describe('OrganismAppShell — the avatar drawer', () => {
  it('opens on the avatar and emits open-drawer for the page', () => {
    const { el, shell } = render();
    let opened = 0;
    shell.$on('open-drawer', () => { opened += 1; });
    expect(testid(el, 'user-drawer')).toBeNull();
    testid(el, 'shell-avatar').click();
    expect(opened).toBe(1);
    return Vue.nextTick().then(() => {
      expect(testid(el, 'user-drawer')).not.toBeNull();
    });
  });

  it('fills the drawer with the whole More list', () => {
    const { el, shell } = render();
    shell.openDrawer();
    return Vue.nextTick().then(() => {
      MORE_NAV.forEach((item) => {
        expect(testid(el, `drawer-nav-${navKey(item)}`)).not.toBeNull();
      });
    });
  });

  it('carries the fixed copy — name, email, points, streak', () => {
    const { el, shell } = render();
    shell.openDrawer();
    return Vue.nextTick().then(() => {
      const drawer = testid(el, 'user-drawer');
      expect(drawer.textContent).toContain('Alex Morgan');
      expect(drawer.textContent).toContain('alex@routine.app');
      expect(drawer.textContent).toContain('128 points');
      expect(drawer.textContent).toContain('6-day streak');
    });
  });

  it('closes itself when a drawer row navigates', () => {
    const { el, shell } = render();
    const keys = [];
    shell.$on('navigate', (key) => keys.push(key));
    shell.openDrawer();
    return Vue.nextTick().then(() => {
      testid(el, 'drawer-nav-groups').click();
      expect(keys).toEqual(['groups']);
      expect(shell.drawerOpen).toBe(false);
    });
  });
});

describe('OrganismAppShell — purity', () => {
  // packages/ui/** is props in, events out: no Apollo, no router, no stores.
  it('never reaches for the router, a store or Apollo', () => {
    const src = fs.readFileSync(path.join(__dirname, 'AppShell.vue'), 'utf8');
    expect(src).not.toMatch(/\$router|\$route\b|\$apollo|vue-apollo|graphql/);
  });
});

/**
 * The desktop sidebar's page-owned region. Year Goals lists every year goal
 * there instead of behind a dropdown, so the shell needs a slot for it — and a
 * page that supplies nothing must be indistinguishable from before.
 */
describe('OrganismAppShell — the desktop sidebar slot', () => {
  const sidebar = (h) => [h('div', { slot: 'sidebar', attrs: { 'data-testid': 'page-sidebar' } }, 'Year goals')];

  it('renders what the page puts there, under the nav', () => {
    const { el } = render({ shell: 'desktop' }, sidebar);
    const extra = testid(el, 'shell-sidebar-extra');
    expect(extra).not.toBeNull();
    expect(testid(el, 'page-sidebar').textContent).toBe('Year goals');
    const aside = testid(el, 'shell-sidebar');
    const children = Array.prototype.slice.call(aside.children);
    expect(children.indexOf(extra)).toBeGreaterThan(
      children.indexOf(aside.querySelector('.rn-shell__sidebar-nav')),
    );
    expect(children.indexOf(extra)).toBeLessThan(
      children.indexOf(testid(el, 'shell-profile')),
    );
  });

  it('changes nothing for a page that supplies no sidebar', () => {
    const { el } = render({ shell: 'desktop' });
    expect(testid(el, 'shell-sidebar-extra')).toBeNull();
    // The spacer still pushes the profile to the bottom.
    expect(testid(el, 'shell-sidebar').querySelector('.rn-shell__spacer')).not.toBeNull();
  });

  it('does not claim the leftover height twice', () => {
    const { el } = render({ shell: 'desktop' }, sidebar);
    expect(testid(el, 'shell-sidebar').querySelector('.rn-shell__spacer')).toBeNull();
  });

  it('is desktop-only — the phone and the rail have no room for a list', () => {
    expect(testid(render({ shell: 'phone' }, sidebar).el, 'page-sidebar')).toBeNull();
    expect(testid(render({ shell: 'tablet' }, sidebar).el, 'page-sidebar')).toBeNull();
  });
});

/**
 * The page-owned main column. Home's date header and checklist/chat split do not
 * fit the generic head/body, and Home used to draw a whole second sidebar to get
 * around that — which drifted (no hover, no More, no profile row). With `main`
 * it keeps its column and shares this nav.
 */
describe('OrganismAppShell — the main-column slot', () => {
  const main = (h) => [h('div', { slot: 'main', attrs: { 'data-testid': 'page-main' } }, 'Home')];

  ['tablet', 'desktop'].forEach((shell) => {
    it(`replaces the ${shell} head and body but keeps the shell's nav`, () => {
      const { el } = render({ shell }, main);
      expect(testid(el, 'page-main')).not.toBeNull();
      expect(testid(el, 'shell-head')).toBeNull();
      expect(testid(el, 'shell-body')).toBeNull();
      expect(testid(el, shell === 'tablet' ? 'shell-rail' : 'shell-sidebar')).not.toBeNull();
    });

    it(`renders the ${shell} head and body when no page supplies it`, () => {
      const { el } = render({ shell });
      expect(testid(el, 'shell-head')).not.toBeNull();
      expect(testid(el, 'shell-body')).not.toBeNull();
    });
  });

  it('starts More collapsed when the page asks (Home), expanded by default', () => {
    expect(testid(render({ shell: 'desktop' }).el, 'shell-more-list')).not.toBeNull();
    const { el } = render({ shell: 'desktop', moreInitiallyOpen: false });
    expect(testid(el, 'shell-more-list')).toBeNull();
    expect(testid(el, 'shell-more-toggle')).not.toBeNull();
  });

  it('keeps the tablet title level with the rail logo when the status strip is off', () => {
    expect(render({ shell: 'tablet', statusBar: false }).el.classList.contains('rn-shell--no-status')).toBe(true);
    expect(render({ shell: 'tablet', statusBar: true }).el.classList.contains('rn-shell--no-status')).toBe(false);
    const css = fs.readFileSync(path.join(__dirname, 'AppShell.vue'), 'utf8');
    const rule = css.slice(css.indexOf('.rn-shell--tablet.rn-shell--no-status .rn-shell__head {'));
    // The design's 4px head padding + the 24px strip it sits under, +1 to centre.
    expect(rule.match(/padding-top:\s*(\d+)px/)[1]).toBe('29');
  });

  it('runs the tablet rail at 77px so the main column is the design 1056', () => {
    const css = fs.readFileSync(path.join(__dirname, 'AppShell.vue'), 'utf8');
    const rule = css.slice(css.indexOf('.rn-shell__rail {'));
    expect(rule.match(/width:\s*([\d.]+)px/)[1]).toBe('77');
  });
});

describe('OrganismAppShell — unknown is not zero (drawer figures, Goals ring)', () => {
  const bare = () => render({ scores: undefined, streakDays: undefined, yearAverage: undefined });

  it('draws no Goals ring when the page supplied no year average', () => {
    const { el } = bare();
    expect(el.querySelectorAll('[data-testid="shell-nav-ring"]')).toHaveLength(0);
  });

  it('still draws a real 0% ring when the page says 0', () => {
    const { el } = render({ yearAverage: 0 });
    expect(el.querySelectorAll('[data-testid="shell-nav-ring"]')).toHaveLength(1);
  });

  it('flags the D/K/G trio and the streak as unknown so the drawer hides them', () => {
    const root = bare().el;
    expect(root.classList.contains('rn-shell--no-balance')).toBe(true);
    expect(root.classList.contains('rn-shell--no-streak')).toBe(true);
  });

  it('shows them when supplied, including a real 0-day streak', () => {
    const root = render({ streakDays: 0 }).el;
    expect(root.classList.contains('rn-shell--no-balance')).toBe(false);
    expect(root.classList.contains('rn-shell--no-streak')).toBe(false);
  });

  it('hides exactly the figures, not the points pill', () => {
    const css = fs.readFileSync(path.join(__dirname, 'AppShell.vue'), 'utf8');
    expect(css).toMatch(/\.rn-shell--no-balance \.rn-drawer__donuts/);
    expect(css).toMatch(/\.rn-shell--no-streak \.rn-drawer__streak-text/);
    expect(css).not.toMatch(/\.rn-shell--no-\w+ \.rn-drawer__points/);
  });

  it('opens the drawer without throwing when nothing was supplied', () => {
    const { el, shell } = bare();
    shell.openDrawer();
    return Vue.nextTick().then(() => {
      expect(testid(el, 'user-drawer')).not.toBeNull();
    });
  });
});
