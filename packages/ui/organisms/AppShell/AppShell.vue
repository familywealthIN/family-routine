<template>
  <!--
    The one app chassis every redesigned screen renders inside.

    Redesigned pages render OUTSIDE MobileLayout/DesktopLayout — the way
    RoutineFocus.vue already does via `meta.focusHome`. This generalises that:
    three shells (phone header + bottom bar, tablet icon rail, desktop sidebar),
    one nav model, one drawer. See docs/redesign/chassis.md.

    Pure presentational: props in, events out. Navigation is an emit — the shell
    knows nothing about the router.
  -->
  <div class="rn-shell" :class="shellClasses" data-testid="app-shell">
    <!-- ================= PHONE ================= -->
    <template v-if="shellName === 'phone'">
      <header class="rn-shell__topbar" data-testid="shell-topbar">
        <div class="rn-shell__topbar-text">
          <div class="rn-shell__title" :style="titleStyle">{{ title }}</div>
          <div v-if="subtitle" class="rn-shell__subtitle" :style="subtitleStyle">{{ subtitle }}</div>
        </div>
        <slot name="header-actions"></slot>
        <focus-points-chip
          :available="points"
          :entitled="pointsEntitled"
          :loading="pointsLoading"
          :error="pointsError"
          :size="chrome.pointsSize"
          @click="$emit('open-points')"
        />
        <div class="rn-shell__avatar-btn" data-testid="shell-avatar" @click="openDrawer">
          <img class="rn-shell__avatar" :style="avatarStyle" :src="avatarSrc" :alt="avatarAlt" @error="onAvatarError" />
        </div>
      </header>

      <main class="rn-shell__body rn-hidescroll" data-testid="shell-body"><slot></slot></main>

      <nav class="rn-shell__tabbar" data-testid="shell-tabbar">
        <div
          v-for="item in primaryItems"
          :key="item.key"
          class="rn-shell__tab"
          :style="{ color: item.active ? NAV_STYLE.activeTab : NAV_STYLE.idleTab }"
          :data-testid="`shell-tab-${item.key}`"
          @click="go(item)"
        >
          <shell-nav-glyph :icon="item.icon" :ring="item.ring && yearAverage != null" :pct="yearAverage || 0" :size="chrome.glyph" />
          <span class="rn-shell__tab-label">{{ item.label }}</span>
        </div>
      </nav>
    </template>

    <!-- ================= TABLET ================= -->
    <template v-else-if="shellName === 'tablet'">
      <aside class="rn-shell__rail rn-hidescroll" data-testid="shell-rail">
        <img class="rn-shell__rail-logo" :src="logo" alt="Routine Notes" />

        <div
          v-for="item in primaryItems"
          :key="item.key"
          class="rn-shell__rail-item"
          :data-testid="`shell-rail-${item.key}`"
          @click="go(item)"
        >
          <div class="rn-shell__rail-pill" :style="pillStyle(item)">
            <shell-nav-glyph :icon="item.icon" :ring="item.ring && yearAverage != null" :pct="yearAverage || 0" :size="chrome.glyph" />
          </div>
          <div class="rn-shell__rail-label" :style="{ color: item.active ? NAV_STYLE.activeFg : NAV_STYLE.idleFg }">
            {{ item.label }}
          </div>
        </div>

        <div class="rn-shell__more" data-testid="shell-more-toggle" title="More pages" @click="toggleMore">
          <div class="rn-shell__more-btn" :style="{ background: moreOpen ? NAV_STYLE.moreOpenBg : 'transparent' }">
            <i class="rn-mi rn-shell__more-glyph">{{ moreGlyph }}</i>
          </div>
          <div class="rn-shell__more-label">More</div>
        </div>

        <div v-if="moreOpen" class="rn-shell__rail-flyout" data-testid="shell-more-list">
          <div
            v-for="item in moreItems"
            :key="item.key"
            class="rn-shell__rail-item"
            :style="{ marginTop: item.gap || '0px' }"
            :data-testid="`shell-more-${item.key}`"
            @click="go(item)"
          >
            <div class="rn-shell__rail-pill rn-shell__rail-pill--sm" :style="pillStyle(item)">
              <i class="rn-mi rn-shell__more-glyph">{{ item.icon }}</i>
            </div>
            <div class="rn-shell__rail-label rn-shell__rail-label--sm" :style="{ color: moreFg(item) }">
              {{ item.label }}
            </div>
          </div>
        </div>

        <div class="rn-shell__spacer"></div>
        <img
          class="rn-shell__avatar rn-shell__rail-avatar"
          data-testid="shell-avatar"
          :style="avatarStyle"
          :src="avatarSrc"
          :alt="avatarAlt"
          @click="openDrawer"
          @error="onAvatarError"
        />
      </aside>

      <!--
        `main` replaces the whole column — header and body — for a page whose
        layout the generic head/body cannot express (Home's date header and its
        checklist/chat split). The nav, drawer and profile stay the shell's, so
        every page shares one rail/sidebar. Unsupplied, the fallback renders.
      -->
      <slot name="main">
        <div class="rn-shell__main">
          <!--
            The designs draw a 24px status strip inside the tablet bezel. In a real
            browser/WebView the OS already paints one above us, so this is frame
            chrome — `statusBar` turns it off.
          -->
          <div v-if="statusBar" class="rn-shell__status" data-testid="shell-status">
            <span>{{ clockLabel }}</span>
            <span class="rn-shell__status-icons">
              <i class="rn-mi rn-shell__status-icon">wifi</i>
              <i class="rn-mi rn-shell__status-icon">battery_full</i>
            </span>
          </div>
          <header class="rn-shell__head" data-testid="shell-head">
            <div class="rn-shell__head-text">
              <div class="rn-shell__title" :style="titleStyle">{{ title }}</div>
              <div v-if="subtitle" class="rn-shell__subtitle" :style="subtitleStyle">{{ subtitle }}</div>
            </div>
            <slot name="header-actions"></slot>
            <focus-points-chip
              :available="points"
              :entitled="pointsEntitled"
              :loading="pointsLoading"
              :error="pointsError"
              :size="chrome.pointsSize"
              @click="$emit('open-points')"
            />
          </header>
          <main class="rn-shell__body rn-hidescroll" data-testid="shell-body"><slot></slot></main>
        </div>
      </slot>
    </template>

    <!-- ================= DESKTOP ================= -->
    <template v-else>
      <aside class="rn-shell__sidebar" data-testid="shell-sidebar">
        <div class="rn-shell__brand">
          <img class="rn-shell__brand-logo" :src="logo" alt="Routine Notes" />
          <div class="rn-shell__brand-name">Routine Notes</div>
        </div>

        <div class="rn-shell__sidebar-nav">
          <div
            v-for="item in primaryItems"
            :key="item.key"
            class="rn-shell__row"
            :style="rowStyle(item)"
            :data-testid="`shell-row-${item.key}`"
            @click="go(item)"
          >
            <shell-nav-glyph :icon="item.icon" :ring="item.ring && yearAverage != null" :pct="yearAverage || 0" :size="chrome.glyph" />
            <span class="rn-shell__row-label">{{ item.label }}</span>
          </div>

          <div class="rn-shell__row rn-shell__row--more" data-testid="shell-more-toggle" @click="toggleMore">
            <i class="rn-mi rn-shell__row-glyph">more_horiz</i>
            <span class="rn-shell__row-label">More</span>
            <i class="rn-mi rn-shell__row-chevron" :style="{ transform: `rotate(${moreRotation})` }">expand_more</i>
          </div>

          <div v-if="moreOpen" class="rn-shell__sidebar-more" data-testid="shell-more-list">
            <div
              v-for="item in moreItems"
              :key="item.key"
              class="rn-shell__row rn-shell__row--sub"
              :style="rowStyle(item)"
              :data-testid="`shell-more-${item.key}`"
              @click="go(item)"
            >
              <i class="rn-mi rn-shell__row-glyph">{{ item.icon }}</i>
              <span class="rn-shell__row-label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!--
          Page-owned sidebar content, under the nav. Desktop only, because only
          the 264px sidebar has room for a list: Year Goals puts every year goal
          here instead of a dropdown. Additive — a page that supplies nothing
          renders nothing and the spacer still pushes the profile down.
        -->
        <div v-if="$slots.sidebar" class="rn-shell__sidebar-extra" data-testid="shell-sidebar-extra">
          <slot name="sidebar"></slot>
        </div>

        <!-- The slot takes the leftover height when it is filled, so the two
             must not both claim `flex: 1` or they would halve it. -->
        <div v-else class="rn-shell__spacer"></div>

        <div class="rn-shell__profile" data-testid="shell-profile" @click="openDrawer">
          <img
            class="rn-shell__avatar"
            data-testid="shell-avatar"
            :style="avatarStyle"
            :src="avatarSrc"
            :alt="avatarAlt"
            @error="onAvatarError"
          />
          <div class="rn-shell__profile-text">
            <div class="rn-shell__profile-name">{{ userName }}</div>
            <div class="rn-shell__profile-sub">{{ pointsLabel }}</div>
          </div>
        </div>
      </aside>

      <!-- Same `main` override as the tablet shell. -->
      <slot name="main">
        <div class="rn-shell__main">
          <header class="rn-shell__head" data-testid="shell-head">
            <div class="rn-shell__head-text">
              <div class="rn-shell__title" :style="titleStyle">{{ title }}</div>
              <div v-if="subtitle" class="rn-shell__subtitle" :style="subtitleStyle">{{ subtitle }}</div>
            </div>
            <slot name="header-actions"></slot>
            <focus-points-chip
              :available="points"
              :entitled="pointsEntitled"
              :loading="pointsLoading"
              :error="pointsError"
              :size="chrome.pointsSize"
              @click="$emit('open-points')"
            />
          </header>
          <main class="rn-shell__body rn-hidescroll" data-testid="shell-body"><slot></slot></main>
        </div>
      </slot>
    </template>

    <!-- The avatar drawer. Open state is the shell's — the designs keep it local
         too (`state.__dr`) — so no page has to carry a boolean for it. -->
    <user-drawer
      :value="drawerOpen"
      :name="userName"
      :email="user.email || ''"
      :picture="user.picture || ''"
      :points="points"
      :stimulus-totals="scores || undefined"
      :streak-days="streakDays == null ? undefined : streakDays"
      :streak-hint="streakHint"
      :nav-items="moreItems"
      @input="drawerOpen = $event"
      @navigate="go"
    />
  </div>
</template>

<script>
import FocusPointsChip from '../../molecules/FocusPointsChip/FocusPointsChip.vue';
import UserDrawer from '../UserDrawer/UserDrawer.vue';
import {
  PRIMARY_NAV,
  MORE_NAV,
  NAV_STYLE,
  NAV_RING,
  SHELLS,
  navKey,
  navRingOffset,
  resolveShell,
  shellChrome,
} from '../../constants/navigation';

const FALLBACK_AVATAR = '/img/default-user.png';

/**
 * The nav glyph, optionally inside the Goals year-average ring. Declared here
 * rather than as a fourth file because all three shells draw the same 26px box
 * and only the enclosing pill differs.
 *
 * NOT a `functional` component: @vue/vue2-jest marks the WHOLE SFC functional
 * when the script matches `/functional:\s*true/` (lib/process.js), which makes
 * Vue call AppShell's own compiled render with `this === null`.
 */
const ShellNavGlyph = {
  name: 'ShellNavGlyph',
  props: {
    icon: { type: String, default: '' },
    ring: { type: Boolean, default: false },
    pct: { type: Number, default: 0 },
    size: { type: Number, default: 24 },
  },
  render(h) {
    const {
      icon, ring, pct, size,
    } = this;
    const children = [];
    if (ring) {
      const mid = NAV_RING.box / 2;
      const base = {
        cx: mid, cy: mid, r: NAV_RING.r, fill: 'none', 'stroke-width': NAV_RING.stroke,
      };
      children.push(h('svg', {
        class: 'rn-shell__ring',
        attrs: { viewBox: `0 0 ${NAV_RING.box} ${NAV_RING.box}` },
      }, [
        h('circle', { attrs: { ...base, stroke: NAV_RING.track } }),
        h('circle', {
          attrs: {
            ...base,
            stroke: NAV_RING.color,
            'stroke-dasharray': NAV_RING.dasharray,
            'stroke-dashoffset': navRingOffset(pct),
            'stroke-linecap': 'round',
          },
        }),
      ]));
    }
    children.push(h('i', {
      class: 'rn-mi rn-shell__glyph',
      style: { fontSize: `${ring ? NAV_RING.iconSize : size}px` },
    }, icon));
    return h('span', {
      class: 'rn-shell__glyph-wrap',
      attrs: { 'data-testid': ring ? 'shell-nav-ring' : null },
    }, children);
  },
};

export default {
  name: 'OrganismAppShell',
  components: { FocusPointsChip, UserDrawer, ShellNavGlyph },
  props: {
    /**
     * 'phone' | 'tablet' | 'desktop'. Left empty the shell resolves itself from
     * the one breakpoint rule (`resolveShell`) — pages should not re-derive it.
     */
    shell: { type: String, default: '' },
    /** Nav key of the current page — `navKey()` of a PRIMARY_NAV / MORE_NAV item. */
    active: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    points: { type: Number, default: 0 },
    /** Same unknown-vs-zero semantics as the header chip (D-10). */
    pointsEntitled: { type: Boolean, default: false },
    pointsLoading: { type: Boolean, default: false },
    pointsError: { type: Boolean, default: false },
    /** { name, email, picture } */
    user: { type: Object, default: () => ({}) },
    /**
     * The drawer's D/K/G trio, streak and the Goals ring are UNKNOWN unless a
     * page supplies them - null, never 0. Most pages have no reason to fetch
     * them, and a confident "0% / 0-day streak" at a user with a live streak is
     * the same unknown-vs-zero mistake D-10 fixed on the points chip.
     */
    streakDays: { type: Number, default: null },
    streakHint: { type: String, default: '' },
    /** { D, K, G } percentages for the drawer's ring trio. Null hides it. */
    scores: { type: Object, default: null },
    /** Year average %, drawn as the ring around the Goals nav glyph. Null: no ring. */
    yearAverage: { type: Number, default: null },
    logo: { type: String, default: '/img/icons/android-chrome-192x192.png' },
    /** The designs' 24px tablet status strip. Off hides it. */
    statusBar: { type: Boolean, default: true },
    /**
     * Whether the More list starts expanded. Home starts it collapsed: its
     * desktop sidebar also holds the routine list, which an open More pushes
     * below the fold.
     */
    moreInitiallyOpen: { type: Boolean, default: true },
    /** Status-strip clock. Empty reads the local time once, at mount. */
    clock: { type: String, default: '' },
  },
  data() {
    return {
      drawerOpen: false,
      // `navMore ?? true` in the designs — the More list starts expanded unless
      // the page says otherwise.
      moreOpen: this.moreInitiallyOpen,
      localClock: '',
      NAV_STYLE,
    };
  },
  computed: {
    shellName() {
      if (SHELLS.indexOf(this.shell) !== -1) return this.shell;
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    chrome() {
      return shellChrome(this.shellName);
    },
    /**
     * The `--no-*` modifiers hide the drawer figures nobody supplied (see the
     * CSS). UserDrawer has no unknown state of its own: it coerces a missing
     * value to 0, so the shell hides what it cannot vouch for.
     */
    shellClasses() {
      return [`rn-shell--${this.shellName}`, {
        'rn-shell--no-balance': !this.scores,
        'rn-shell--no-streak': this.streakDays == null,
        'rn-shell--no-status': !this.statusBar,
      }];
    },
    primaryItems() {
      return PRIMARY_NAV.map((item) => {
        const key = navKey(item);
        return {
          ...item, key, active: key === this.active, ring: key === NAV_RING.key,
        };
      });
    },
    moreItems() {
      return MORE_NAV.map((item) => {
        const key = navKey(item);
        return { ...item, key, active: key === this.active };
      });
    },
    titleStyle() {
      return { fontSize: `${this.chrome.title}px` };
    },
    subtitleStyle() {
      return { fontSize: `${this.chrome.subtitle}px` };
    },
    avatarStyle() {
      return { width: `${this.chrome.avatar}px`, height: `${this.chrome.avatar}px` };
    },
    avatarSrc() {
      return this.user.picture || FALLBACK_AVATAR;
    },
    userName() {
      return this.user.name || 'Routine Notes';
    },
    avatarAlt() {
      return `Profile picture of ${this.user.name || 'User'}`;
    },
    /** Same unknown-vs-zero rule as the points chip: no balance read, no "0". */
    pointsLabel() {
      if (this.pointsLoading || this.pointsError || this.points == null) return '— points';
      return `${Math.round(this.points).toLocaleString()} points`;
    },
    moreGlyph() {
      return this.moreOpen ? 'expand_less' : 'more_horiz';
    },
    moreRotation() {
      return this.moreOpen ? '180deg' : '0deg';
    },
    clockLabel() {
      return this.clock || this.localClock;
    },
  },
  created() {
    // Read once rather than ticking: the strip is frame chrome, not a clock
    // feature, and an interval in a presentational organism would leak.
    const now = new Date();
    this.localClock = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  },
  methods: {
    openDrawer() {
      this.drawerOpen = true;
      this.$emit('open-drawer');
    },
    closeDrawer() {
      this.drawerOpen = false;
    },
    toggleMore() {
      this.moreOpen = !this.moreOpen;
    },
    go(item) {
      this.closeDrawer();
      if (!item) return;
      this.$emit('navigate', item.key, item);
    },
    pillStyle(item) {
      return {
        background: item.active ? NAV_STYLE.activeBg : 'transparent',
        color: item.color || (item.active ? NAV_STYLE.activeFg : NAV_STYLE.idleFg),
      };
    },
    moreFg(item) {
      return item.color || (item.active ? NAV_STYLE.activeFg : NAV_STYLE.idleFg);
    },
    // Background is omitted rather than set to `transparent` so the row's
    // :hover tint is not out-specified by an inline style.
    rowStyle(item) {
      const style = { color: item.color || (item.active ? NAV_STYLE.activeFg : NAV_STYLE.idleFg) };
      if (item.active) style.background = NAV_STYLE.activeBg;
      return style;
    },
    onAvatarError(event) {
      event.target.src = FALLBACK_AVATAR;
    },
  },
};
</script>

<style>
/* 100vh, not 100%: the shell renders straight under <v-app>'s content area,
   which has no resolved height of its own — same as `.rn-home`. 100dvh where
   supported: iOS Safari's 100vh includes the area behind its toolbar, which
   pushed the tab bar off-screen. In a standalone PWA / native WebView the two
   are equal.

   `--rn-shell-safe-bottom` is the home-indicator inset the tab bar pads by.
   The native WebView already pads <body> by it (android-safe-area.css), so
   there it is 0 — the native layout is unchanged. */
.rn-shell {
  --rn-shell-safe-bottom: env(safe-area-inset-bottom, 0px);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: #f4f4f4;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

/* No `.capacitor-native` override zeroing this. It used to be zeroed because
   android-safe-area.css pads <body> by the inset — but `.rn-shell--phone` is
   `position: fixed; inset: 0`, so it is laid out against the viewport and never
   sees that padding. Zeroing it drew the tab bar's middle labels underneath the
   gesture pill / home indicator (measured on an API 36 emulator: inset 24px,
   tabbar 850-914 in a 914px viewport, padding-bottom 4px). Same fix as
   `--rn-safe-bottom` on the Home page. */

/* Unknown is not 0: a page that did not supply D/K/G or the streak gets no
   "0%" rings and no "0-day streak" in the drawer. The points pill on the
   streak row stays - it has its own known/unknown handling. */
.rn-shell--no-balance .rn-drawer__section-label,
.rn-shell--no-balance .rn-drawer__donuts,
.rn-shell--no-streak .rn-drawer__streak-icon,
.rn-shell--no-streak .rn-drawer__streak-text {
  display: none;
}

.rn-shell--no-balance .rn-drawer__streak {
  margin-top: 12px;
}

.rn-shell--phone {
  /* Fixed to the window rather than sized by vh: in an iPhone standalone PWA
     100vh / 100dvh can exceed the window by the status bar, pushing the tab
     bar off-screen. The pre-redesign MobileLayout pinned its nav with
     position: fixed for the same reason; inset: 0 pins the whole column. */
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: auto;
  /* Native WebView: the header would otherwise run under the status bar. */
  padding-top: env(safe-area-inset-top);
}

.rn-shell--tablet,
.rn-shell--desktop {
  flex-direction: row;
}

/* ---------------- shared ---------------- */

.rn-shell__title {
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-shell__subtitle {
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-shell__avatar {
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.rn-shell__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.rn-shell__spacer {
  flex: 1;
}

/* Scrolls on its own so a long list never pushes the profile off the bottom. */
.rn-shell__sidebar-extra {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
}

.rn-shell__glyph-wrap {
  position: relative;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-shell__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 26px;
  height: 26px;
  transform: rotate(-90deg);
}

/* ---------------- phone ---------------- */

.rn-shell__topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 64px;
  padding: 0 8px 0 16px;
  flex-shrink: 0;
}

.rn-shell__topbar-text {
  flex: 1;
  min-width: 0;
}

/*
 * The header action — ONE definition for every page's `header-actions` slot.
 *
 * Six pages had each rolled their own (`goals-page__act`, `rn-agents__new`,
 * `rn-groups__invite-btn`, `rn-routines__new`, `rn-miles__act`, `rn-plan__act`)
 * and they had drifted: the icon-only ones were 40x40 on Goals, Milestones and
 * Routines but 36x36 on the Month Planner, while every labelled one was 36.
 * Every design file's phone frame draws this control at 36px — a circle when it
 * is a glyph alone, an r18 pill when it carries a word — so that is what this
 * is, and the pages consume it instead of restating it.
 *
 * This block is deliberately NOT scoped: slot content belongs to the page, so a
 * scoped rule here would never reach it.
 */
.rn-shell__act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 18px;
  background: #fff;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, .7);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}

/* 36 square + r18 is the circle; no second radius to keep in step. */
.rn-shell__act--icon {
  width: 36px;
  padding: 0;
  justify-content: center;
  border-color: transparent;
  background: transparent;
  color: rgba(0, 0, 0, .6);
}

.rn-shell__act--icon:hover {
  background: rgba(0, 0, 0, .05);
}

.rn-shell__act--label {
  padding: 0 14px;
}

.rn-shell__act--primary.rn-shell__act--label {
  border-color: transparent;
  background: #288bd5;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .14);
}

/* Icon-only has no room for a filled pill, so "primary" is the blue glyph. */
.rn-shell__act--primary.rn-shell__act--icon {
  color: #288bd5;
}

/* Groups' invite button when the group is full or failed to load. */
.rn-shell__act--muted.rn-shell__act--label {
  border-color: transparent;
  background: rgba(0, 0, 0, .25);
  color: #fff;
}

.rn-shell__act-glyph {
  font-size: 18px;
}

.rn-shell__act--icon .rn-shell__act-glyph {
  font-size: 22px;
}

.rn-shell__avatar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-shell--phone .rn-shell__body {
  padding: 0 16px 16px;
}

.rn-shell__tabbar {
  /* 64px of tabs, plus the iPhone home-indicator strip underneath them (the
     bar's white runs down behind the indicator, the tabs sit above it). */
  height: calc(64px + var(--rn-shell-safe-bottom));
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, .08);
  display: flex;
  padding-bottom: calc(4px + var(--rn-shell-safe-bottom));
  flex-shrink: 0;
  z-index: 5;
}

.rn-shell__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

/* ---------------- tablet rail ---------------- */

/* 77px, not 76. The iPad frame draws a 76px content-box rail PLUS a 1px rule,
   so the main column starts at 1133 - 77 = 1056px. Under Vuetify's border-box,
   76px here would swallow the rule and hand the page an extra pixel. */
.rn-shell__rail {
  width: 77px;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 0 14px;
  overflow-y: auto;
  border-right: 1px solid rgba(0, 0, 0, .06);
}

.rn-shell__rail-logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
  margin-bottom: 6px;
}

.rn-shell__rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.rn-shell__rail-pill {
  width: 56px;
  height: 32px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
}

.rn-shell__rail-pill--sm {
  width: 52px;
  height: 30px;
  border-radius: 15px;
}

.rn-shell__rail-label {
  font-size: 11px;
  font-weight: 600;
}

.rn-shell__rail-label--sm {
  font-size: 10px;
}

.rn-shell__more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}

.rn-shell__more-btn {
  width: 52px;
  height: 30px;
  border-radius: 15px;
  color: rgba(0, 0, 0, .6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
}

.rn-shell__more-glyph {
  font-size: 21px;
}

.rn-shell__more-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .6);
}

.rn-shell__rail-flyout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-radius: 16px;
  background: #f7f7f7;
  animation: rn-fade .18s ease;
}

.rn-shell__rail-avatar {
  cursor: pointer;
}

/* ---------------- tablet / desktop main ---------------- */

.rn-shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rn-shell__status {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.rn-shell__status-icons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-shell__status-icon {
  font-size: 16px;
}

.rn-shell__head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.rn-shell__head-text {
  flex: 1;
  min-width: 0;
}

.rn-shell--tablet .rn-shell__head {
  padding: 4px 20px 0;
}

/* The design's 4px head padding sits under its 24px status strip, which is
   what puts the title level with the rail's logo (22px down, 38 tall, centred
   at 41). With the strip off — every real app — the head keeps those 24px (plus 1 to centre the 24px title line exactly), or
   the title rides up to the top edge, 25px above the logo it should line up with. */
.rn-shell--tablet.rn-shell--no-status .rn-shell__head {
  padding-top: 29px;
}

.rn-shell--tablet .rn-shell__body {
  padding: 14px 20px 20px;
}

.rn-shell--desktop .rn-shell__main {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 22px 28px 28px;
  gap: 14px;
}

/* ---------------- desktop sidebar ---------------- */

.rn-shell__sidebar {
  width: 264px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid rgba(0, 0, 0, .06);
  display: flex;
  flex-direction: column;
}

.rn-shell__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;
}

.rn-shell__brand-logo {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.rn-shell__brand-name {
  font-size: 16px;
  font-weight: 700;
}

.rn-shell__sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
}

.rn-shell__row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-shell__row:hover {
  background: rgba(0, 0, 0, .04);
}

.rn-shell__row--more {
  margin-top: 6px;
  color: rgba(0, 0, 0, .6);
}

.rn-shell__row--sub {
  padding: 0 12px 0 20px;
}

.rn-shell__row-glyph {
  font-size: 20px;
}

.rn-shell__row-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-shell__row-chevron {
  font-size: 20px;
  transition: transform .2s;
}

.rn-shell__sidebar-more {
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: rn-fade .18s ease;
}

.rn-shell__profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  cursor: pointer;
}

.rn-shell__profile-text {
  flex: 1;
  min-width: 0;
}

.rn-shell__profile-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-shell__profile-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}
</style>
