<template>
  <app-shell-container
    active=""
    title="Notifications"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <div class="rn-notifications" data-testid="notifications-page">
      <h2 class="rn-notifications__title">Coming soon</h2>
      <p class="rn-notifications__body">Notification settings aren't available yet.</p>
    </div>
  </app-shell-container>
</template>

<script>
/**
 * /settings/notifications — still a placeholder, but inside the chassis shell
 * like every other redesigned route (meta.appShell in router.js), so it keeps
 * the nav instead of dropping into the legacy layout.
 */
import AppShellContainer from '../containers/AppShellContainer.vue';
import { signOut } from '../utils/signOut';

const LOGOUT_KEY = 'logout';

export default {
  name: 'notifications',

  components: { AppShellContainer },

  methods: {
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      const route = item && item.route;
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onSignOut() {
      signOut(this);
    },
  },
};
</script>

<style>
.rn-notifications {
  padding: 24px 16px;
  text-align: center;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-notifications .rn-notifications__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}

.rn-notifications .rn-notifications__body {
  margin: 0;
  font-size: 14px;
  color: #5f6368;
}
</style>
