<template>
  <app-shell-container
    active="about"
    title="About"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <div class="rn-about" :class="`rn-about--${shell}`" data-testid="about-page">
      <div class="rn-about__main">
        <about-hero-card class="rn-about__card" :version="version" />
        <about-feature-tabs class="rn-about__card" />
      </div>

      <div class="rn-about__side">
        <getting-started-card class="rn-about__card" @navigate="goTo" />
      </div>
    </div>
  </app-shell-container>
</template>

<script>
/**
 * /about, rebuilt to `packages/design/Profile and About.dc.html` § t2.
 *
 * ## The copy is the design's, trimmed — deliberately
 *
 * The design README claims "the copy is kept as written" from the old
 * `AboutTime.vue`. It is not: the file trims the soldier metaphor out of
 * Discipline / Kinetics / Geniuses, drops the "Picture a soldier ordered to take
 * an enemy-held mountain" opener, and drops Priority's fifth point.
 * `docs/redesign/chassis.md` § Conflicts decides for the DESIGN — it is the newer
 * authored text and reads better — and the full analogy is one tap away on the
 * Evolution tab's link to the blog post. The README's "as written" claim is
 * noted, not obeyed.
 *
 * One number is not the design's: its Goals tab says "nine months a year", the
 * same wrong figure as Profile's roll-up chain. `constants/about.js` builds that
 * sentence from `PROFILE_SETTINGS.autoCheckThreshold`, so About and Profile
 * cannot disagree about the same cascade. And "Home", not "Dashboard" — the nav's
 * own word (chassis.md § Conflicts, last row).
 *
 * ## Why there is no container
 *
 * About has no server state at all: no query, no mutation, no browser API to
 * adapt. A container here would be an empty passthrough. So the page renders the
 * three presentational blocks directly — the way `ProgressTime` renders
 * `SlidingSwitch` directly — and owns the only impure thing on the screen, the
 * router behind "Getting started". `AppShellContainer` still owns the chassis
 * shell and the header's points read, so the page holds no GraphQL.
 */
import AboutHeroCard from '@routine-notes/ui/molecules/AboutHeroCard/AboutHeroCard.vue';
import GettingStartedCard from '@routine-notes/ui/molecules/GettingStartedCard/GettingStartedCard.vue';
import AboutFeatureTabs from '@routine-notes/ui/organisms/AboutFeatureTabs/AboutFeatureTabs.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import { APP_VERSION } from '../utils/appVersion';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';

export default {
  name: 'AboutTime',

  components: {
    AppShellContainer,
    AboutHeroCard,
    AboutFeatureTabs,
    GettingStartedCard,
  },

  data() {
    // The web app's package version — the only real one in the repo. The mock's
    // "Version 2.0 · beta 3" is a placeholder and no channel is invented here
    // (utils/appVersion.js).
    return { version: APP_VERSION };
  },

  computed: {
    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    /** The phone header is just "About"; the strap line is tablet/desktop only. */
    subLabel() {
      return this.shell === 'phone' ? '' : 'Why Routine Notes works the way it does';
    },
  },

  methods: {
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      this.goTo(item && item.route);
    },
    onSignOut() {
      // The same path the legacy drawer takes — see utils/signOut.js.
      signOut(this);
    },
  },
};
</script>

<!-- Unscoped but root-class prefixed: this page renders its own shell, and the
     card chrome has to reach the components it wraps. -->
<style>
.rn-about {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-about__main,
.rn-about__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rn-about__card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  overflow: hidden;
}

/* --- tablet + desktop: the same 3fr / 2fr split Profile uses -------------- */

.rn-about--tablet,
.rn-about--desktop {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
}

.rn-about--tablet .rn-about__card,
.rn-about--desktop .rn-about__card {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}
</style>
