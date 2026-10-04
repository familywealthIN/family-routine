<template>
  <app-shell-container
    active="profile"
    title="Profile"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <!-- The one read every card below derives from. Renderless. -->
    <user-profile-container
      ref="profile"
      @profile="onProfile"
      @failed="onProfileFailed"
    />

    <div class="rn-profile" :class="`rn-profile--${shell}`" data-testid="profile-page">
      <!--
        Identity is the FIRST card on the phone and the top of the right-hand
        column on tablet / desktop (`Profile and About.dc.html` § PP vs PT/PD).
        Two mutually exclusive placements of one component, because the two
        orderings are genuinely different — a CSS `order` trick would have to
        reorder the two columns as a unit, which is not what the design does.
      -->
      <profile-identity-card
        v-if="isPhone"
        class="rn-profile__card"
        v-bind="identity"
        @sign-out="onSignOut"
      />

      <div class="rn-profile__main">
        <profile-time-container
          class="rn-profile__card"
          :timezone="profile.timezone"
          :loaded="profile.loaded"
          :failed="profileFailed"
          @saved="onTimezoneSaved"
          @failed="onSaveFailed"
          @format-changed="onFormatChanged"
          @changed="refreshProfile"
        />

        <profile-rates-card class="rn-profile__card" />
      </div>

      <div class="rn-profile__side">
        <profile-identity-card
          v-if="!isPhone"
          class="rn-profile__card"
          v-bind="identity"
          @sign-out="onSignOut"
        />

        <connect-ai-container
          class="rn-profile__card"
          :connected="profile.oauthConnected"
          @copied="onCopied"
          @copy-failed="onCopyFailed"
        />

        <api-key-container
          class="rn-profile__card"
          :api-key="profile.apiKey"
          @generated="onKeyGenerated"
          @failed="onKeyFailed"
          @copied="onCopied"
          @copy-failed="onCopyFailed"
          @changed="refreshProfile"
        />

        <account-delete-container
          :open="deleteOpen"
          :shell="shell"
          @open="deleteOpen = true"
          @close="deleteOpen = false"
          @deleted="onAccountDeleted"
          @failed="onDeleteFailed"
        />
      </div>
    </div>

    <app-toast
      :shell="shell"
      :title="toast.title"
      :sub="toast.sub"
      :icon="toast.icon"
      :icon-color="toast.color"
      :seq="toast.seq"
    />
  </app-shell-container>
</template>

<script>
/**
 * /settings/profile, rebuilt to `packages/design/Profile and About.dc.html` § t1.
 *
 * ## What changed from the old page
 *
 * The yellow "most settings here are READ ONLY" banner is gone — it sat above six
 * cards, two of which *were* editable. A `lock` glyph now sits on each read-only
 * row and section header instead. The three "Rate" text fields became the D/K/G
 * tinted cards, the three auto-check thresholds became the roll-up chain, and the
 * four nested platform guides became chips over numbered steps.
 *
 * ## Where the mock is wrong, and what renders instead
 *
 * All six are settled in `docs/redesign/chassis.md` § "Conflicts between design
 * files — decided":
 *
 * | Mock | Here |
 * |---|---|
 * | "9 months tick the year" | **6** — read from `PROFILE_SETTINGS.autoCheckThreshold.month` |
 * | D "3 h", K "1 h" | bound to `profileSettings` (24 h / 2 h / 25%) |
 * | 5 hand-written time zones | the real `TIMEZONE_OPTIONS` |
 * | always "Connected", `rn_sec_…` | both states; `frt_secret_` prefix; disconnected drawn for the first time |
 * | API key generated locally | the `generateApiKey` mutation, and a toast instead of `alert()` |
 * | delete = "Prototype only" | the real `deleteAccount`, cache cleared, back to `/` |
 *
 * ## No GraphQL lives here
 *
 * The page owns layout, the shell breakpoint, the open overlay and the toast
 * (ARCHITECTURE.md § 1). Every read and write is a container:
 * `AppShellContainer` (chassis shell + the header's points read),
 * `UserProfileContainer` (the one `getUserTags` read), `ProfileTimeContainer`
 * (`updateUserTimezone`), `ApiKeyContainer` (`generateApiKey`),
 * `AccountDeleteContainer` (`deleteAccount`) and `ConnectAiContainer` (the
 * clipboard and the MCP endpoint — no query).
 *
 * What the page orchestrates across containers (§ 6) is the re-read: a saved
 * timezone and a new API key both change `getUserTags`, and neither mutation can
 * patch the cache by id because `UserItem` has no id — so the page asks the read
 * container to refresh.
 */
import AppToast from '@routine-notes/ui/molecules/AppToast/AppToast.vue';
import ProfileIdentityCard from '@routine-notes/ui/molecules/ProfileIdentityCard/ProfileIdentityCard.vue';
import ProfileRatesCard from '@routine-notes/ui/molecules/ProfileRatesCard/ProfileRatesCard.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import UserProfileContainer from '../containers/UserProfileContainer.vue';
import ProfileTimeContainer from '../containers/ProfileTimeContainer.vue';
import ConnectAiContainer from '../containers/ConnectAiContainer.vue';
import ApiKeyContainer from '../containers/ApiKeyContainer.vue';
import AccountDeleteContainer from '../containers/AccountDeleteContainer.vue';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';
/** How long the "Account deleted" toast is readable before the hard reload. */
export const DELETE_REDIRECT_MS = 2000;

const noToast = () => ({
  title: '', sub: '', icon: 'check_circle', color: '#81c784', seq: 0,
});

const emptyProfile = () => ({
  name: '', email: '', picture: '', apiKey: '', oauthConnected: false, timezone: '', loaded: false,
});

export default {
  name: 'ProfileTime',

  components: {
    AppShellContainer,
    AppToast,
    UserProfileContainer,
    ProfileIdentityCard,
    ProfileRatesCard,
    ProfileTimeContainer,
    ConnectAiContainer,
    ApiKeyContainer,
    AccountDeleteContainer,
  },

  data() {
    return {
      profile: emptyProfile(),
      profileFailed: false,
      deleteOpen: false,
      toast: noToast(),
    };
  },

  computed: {
    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    /**
     * The phone header is just "Profile" in the design; tablet and desktop carry
     * the strap line. A failed read says so rather than looking normal.
     */
    subLabel() {
      if (this.profileFailed && !this.profile.loaded) return "Couldn't load your account";
      if (this.isPhone) return '';
      return 'Settings, connections and your account';
    },
    /**
     * The profile read is the authority, but until it lands (or when it fails)
     * the signed-in session already knows who this is - the same name / email /
     * picture the shell header shows. Never an invented placeholder name.
     */
    identity() {
      const source = this.profile.loaded ? this.profile : this.sessionIdentity;
      const { name = '', email = '', picture = '' } = source || {};
      return { name: name || '', email: email || '', picture: picture || '' };
    },
    sessionIdentity() {
      const root = (this.$root && this.$root.$data) || {};
      return { name: root.name, email: root.email, picture: root.picture };
    },
  },

  beforeDestroy() {
    clearTimeout(this.redirectTimer);
  },

  methods: {
    onProfile(profile) {
      this.profile = profile;
      if (profile.loaded) this.profileFailed = false;
    },
    onProfileFailed() {
      this.profileFailed = true;
    },
    refreshProfile() {
      const container = this.$refs.profile;
      if (container && typeof container.refresh === 'function') container.refresh();
    },

    /** Toast copy is always title + sub, the sub carrying the consequence. */
    notify(title, sub, icon, color) {
      this.toast = {
        title, sub, icon, color, seq: this.toast.seq + 1,
      };
    },

    onFormatChanged(format, consequence) {
      this.notify('Time format updated', consequence, 'schedule', '#64b5f6');
    },
    onTimezoneSaved(label) {
      this.notify('Time zone updated', label, 'public', '#64b5f6');
    },
    onSaveFailed(consequence) {
      this.notify("Couldn't save that", consequence, 'error_outline', '#ef9a9a');
    },

    onCopied(label) {
      this.notify(`${label} copied`, 'Paste it into your MCP client', 'content_copy', '#64b5f6');
    },
    onCopyFailed(label) {
      this.notify(`Couldn't copy ${label}`, 'Select the text and copy it by hand', 'error_outline', '#ef9a9a');
    },

    /** Replaces the old page's `alert('API Key generated successfully!')`. */
    onKeyGenerated(key, replacing) {
      this.notify(
        replacing ? 'API key regenerated' : 'API key generated',
        replacing ? 'The old key stopped working' : 'Copy it now and store it safely',
        'vpn_key',
        '#81c784',
      );
    },
    onKeyFailed(consequence) {
      this.notify("Couldn't generate a key", consequence, 'error_outline', '#ef9a9a');
    },

    onAccountDeleted(message) {
      this.deleteOpen = false;
      this.notify('Account deleted', message, 'delete_forever', '#ef9a9a');
      // The container already cleared localStorage and the Apollo store; the
      // session teardown is the page's (ARCHITECTURE.md § 6). A full reload, not
      // a router push: every module-level cache in the app has to go too.
      clearTimeout(this.redirectTimer);
      this.redirectTimer = setTimeout(this.leaveApp, DELETE_REDIRECT_MS);
    },
    onDeleteFailed(message) {
      this.deleteOpen = false;
      this.notify("Couldn't delete your account", message, 'error_outline', '#ef9a9a');
    },
    leaveApp() {
      window.location.href = '/';
    },

    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      this.goTo(item && item.route);
    },
    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onSignOut() {
      // The same path the legacy drawer takes — see utils/signOut.js.
      signOut(this);
    },
  },
};
</script>

<!-- Unscoped but root-class prefixed: this page renders its own shell, and the
     card chrome has to reach the organisms it wraps (see MEMORY: web-app CSS
     lives inline in organisms, prefixed so nothing leaks). -->
<style>
.rn-profile {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-profile__main,
.rn-profile__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* The card chrome every block on this page shares, declared once here rather
   than copied into six organisms. */
.rn-profile__card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

/* --- tablet + desktop: the 3fr / 2fr split ------------------------------ */

.rn-profile--tablet,
.rn-profile--desktop {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
}

.rn-profile--tablet .rn-profile__card,
.rn-profile--desktop .rn-profile__card {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}
</style>
