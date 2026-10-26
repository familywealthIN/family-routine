<template>
  <app-shell-container
    active=""
    title="Notifications"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <div class="rn-notifications" data-testid="notifications-page">
      <p class="rn-notifications__intro">
        Each routine's own reminder (notify, alarm or off) is set in Routine Settings.
        These are the day-level notifications.
      </p>

      <div v-if="loadError" class="rn-notifications__error" data-testid="notifications-error">
        {{ loadError }}
      </div>

      <ul class="rn-notifications__list">
        <li v-for="row in rows" :key="row.key" class="rn-notifications__row">
          <div class="rn-notifications__text">
            <div class="rn-notifications__name">{{ row.title }}</div>
            <div class="rn-notifications__desc">{{ row.desc }}</div>
            <label v-if="row.timeKey && prefs[row.key]" class="rn-notifications__time">
              <span>at</span>
              <input
                type="time"
                :value="prefs[row.timeKey]"
                :data-testid="`notif-${row.timeKey}`"
                @change="setPref(row.timeKey, $event.target.value)"
              >
            </label>
          </div>
          <button
            type="button"
            role="switch"
            class="rn-notifications__switch"
            :class="{ 'rn-notifications__switch--on': prefs[row.key] }"
            :aria-checked="prefs[row.key] ? 'true' : 'false'"
            :aria-label="row.title"
            :data-testid="`notif-${row.key}`"
            @click="setPref(row.key, !prefs[row.key])"
          >
            <span class="rn-notifications__knob" />
          </button>
        </li>
      </ul>
    </div>
  </app-shell-container>
</template>

<script>
/**
 * /settings/notifications — the day-level notifications sent by
 * apps/cron/src/lifecycle-notifications.js, each on/off, plus the person's own
 * morning and evening times. Every change saves at once.
 */
import gql from 'graphql-tag';
import AppShellContainer from '../containers/AppShellContainer.vue';
import { signOut } from '../utils/signOut';

const LOGOUT_KEY = 'logout';

const PREF_FIELDS = 'morning plan evening streak reengage insights morningTime eveningTime';

export const NOTIFICATION_PREFS_QUERY = gql`
  query notificationPrefs {
    notificationPrefs { ${PREF_FIELDS} }
  }
`;

export const UPDATE_NOTIFICATION_PREFS = gql`
  mutation updateNotificationPrefs($prefs: NotificationPrefsInput!) {
    updateNotificationPrefs(prefs: $prefs) { ${PREF_FIELDS} }
  }
`;

export const PREF_ROWS = [
  {
    key: 'morning', timeKey: 'morningTime', title: 'Good morning', desc: 'Your day at a glance: routines, what is first, the run at stake.',
  },
  { key: 'plan', title: 'Day planning', desc: 'Suggested tasks from your week when nothing is planned yet.' },
  {
    key: 'evening', timeKey: 'eveningTime', title: 'End of day progress', desc: 'How the day went, and what is still possible.',
  },
  { key: 'streak', title: 'Streak celebrations', desc: 'When a routine reaches 3, 7, 14, 21, 30… days in a row.' },
  { key: 'insights', title: 'Insights for you', desc: 'When your routines have insights you have not opened yet.' },
  { key: 'reengage', title: 'Welcome back', desc: 'A gentle nudge after a couple of days away — three at most.' },
];

const DEFAULTS = {
  morning: true,
  plan: true,
  evening: true,
  streak: true,
  reengage: true,
  insights: true,
  morningTime: '07:00',
  eveningTime: '21:00',
};

export default {
  name: 'notifications',

  components: { AppShellContainer },

  data() {
    return {
      prefs: { ...DEFAULTS },
      loadError: '',
    };
  },

  computed: {
    rows: () => PREF_ROWS,
  },

  async created() {
    try {
      const { data } = await this.$apollo.query({ query: NOTIFICATION_PREFS_QUERY, fetchPolicy: 'network-only' });
      if (data && data.notificationPrefs) this.prefs = { ...DEFAULTS, ...data.notificationPrefs };
    } catch (error) {
      this.loadError = 'Could not load your notification settings.';
    }
  },

  methods: {
    async setPref(key, value) {
      const before = this.prefs[key];
      this.prefs = { ...this.prefs, [key]: value };
      try {
        const { data } = await this.$apollo.mutate({
          mutation: UPDATE_NOTIFICATION_PREFS,
          variables: { prefs: { [key]: value } },
        });
        if (data && data.updateNotificationPrefs) {
          this.prefs = { ...DEFAULTS, ...data.updateNotificationPrefs };
        }
      } catch (error) {
        this.prefs = { ...this.prefs, [key]: before };
        this.$notify({
          title: 'Not saved',
          text: 'Could not save that setting. Try again.',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },
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

<style src="@routine-notes/ui/styles/app/views/Notifications.css"></style>
