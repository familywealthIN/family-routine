<template>
  <!-- One organism + one mutation (`updateUserTimezone`). -->
  <profile-time-settings
    :time-format="format"
    :timezone="shownTimezone"
    :timezone-options="timezoneOptions"
    @change-time-format="setFormat"
    @change-timezone="setTimezone"
  />
</template>

<script>
import ProfileTimeSettings from '@routine-notes/ui/organisms/ProfileTimeSettings/ProfileTimeSettings.vue';
import { PROFILE_SETTINGS, TIMEZONE_OPTIONS } from '@routine-notes/ui/constants/settings';
import { normaliseTimeFormat, timeFormatConsequence } from '@routine-notes/ui/constants/profile';
import { getUserTimeFormat } from '../utils/timeFormat';
import { UPDATE_USER_TIMEZONE_MUTATION } from '../composables/graphql/profileQueries';

/** The label the toast's consequence line quotes back. */
function zoneLabel(value) {
  const match = TIMEZONE_OPTIONS.find((zone) => zone.value === value);
  return match ? match.label : value;
}

export default {
  name: 'ProfileTimeContainer',

  components: { ProfileTimeSettings },

  props: {
    /** The saved zone, from `UserProfileContainer`'s read. */
    timezone: { type: String, default: '' },
    /**
     * Whether that read has landed. Until it has, the zone is UNKNOWN: showing
     * the shipped default (Asia/Kolkata) would put Bombay in front of a New York
     * user, and a pick from that list would save over their real zone.
     */
    loaded: { type: Boolean, default: true },
    /** The read failed, so the placeholder says so rather than "Loading". */
    failed: { type: Boolean, default: false },
  },

  data() {
    return {
      /**
       * The zone the user just picked, held until the read catches up.
       *
       * NOT a disabled control (ARCHITECTURE.md § 3.7 — the `busy` prop is gone):
       * the select stays live, the chosen value shows immediately, and only a
       * REFUSAL puts the old one back. The old page disabled the select for the
       * whole round trip, which on a slow connection ate the next change.
       */
      pending: null,
      /**
       * Time format is a client preference — localStorage, no mutation. It is
       * read once here and written on change, the way `getUserTimeFormat()`
       * (utils/timeFormat) reads it everywhere else.
       */
      format: normaliseTimeFormat(getUserTimeFormat()),
    };
  },

  computed: {
    shownTimezone() {
      if (!this.loaded) return '';
      return this.pending || this.timezone || PROFILE_SETTINGS.defaultTimezone;
    },
    /**
     * Not loaded: one placeholder entry and nothing else to pick, so the select
     * neither shows a fake zone nor lets one be saved. (Not a disabled control:
     * the select stays focusable and says why it is empty.)
     */
    timezoneOptions() {
      if (this.loaded) return TIMEZONE_OPTIONS;
      return [{
        value: '',
        label: this.failed ? "Couldn't load your time zone" : 'Loading your time zone…',
      }];
    },
  },

  watch: {
    /** The server agreed (or a refetch landed) — stop echoing. */
    timezone(next) {
      if (next && next === this.pending) this.pending = null;
    },
  },

  methods: {
    setFormat(value) {
      const next = normaliseTimeFormat(value);
      if (next === this.format) return;
      this.format = next;
      try {
        localStorage.setItem('timeFormat', next);
      } catch (error) {
        // Private-mode Safari throws on setItem; the switch still moved.
        console.warn('[ProfileTimeContainer] could not persist timeFormat:', error);
      }
      // What `TimeFormatMixin` listens for, so every rendered time re-renders.
      this.$root.$emit('timeFormatChanged', next);
      this.$emit('format-changed', next, timeFormatConsequence(next));
    },

    setTimezone(value) {
      if (!this.loaded) return;
      if (!value || value === this.shownTimezone) return;
      this.pending = value;

      // `updateUserTimezone` returns an UNKEYED UserItem (no `id` on the type),
      // so it cannot overwrite a sibling field in the cache — see
      // profileQueries.js. `changed` asks the read container to re-read instead.
      this.$apollo.mutate({
        mutation: UPDATE_USER_TIMEZONE_MUTATION,
        variables: { timezone: value },
      })
        .then(() => {
          this.$emit('saved', zoneLabel(value));
          this.$emit('changed');
        })
        .catch((error) => {
          console.error('[ProfileTimeContainer] updateUserTimezone failed:', error);
          // Drop the echo — the select falls back to whatever the server has.
          this.pending = null;
          this.$emit('failed', 'Your time zone is unchanged');
        });
    },
  },
};
</script>
