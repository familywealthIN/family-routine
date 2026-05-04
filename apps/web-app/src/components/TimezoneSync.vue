<template>
  <atom-dialog v-model="showPrompt" max-width="480" persistent>
    <atom-card>
      <atom-card-title class="headline">Update your timezone?</atom-card-title>
      <atom-card-text class="pt-3">
        <p class="mb-2">
          Your current location appears to be in
          <strong>{{ browserLabel }}</strong>, but your profile is set to
          <strong>{{ savedLabel }}</strong>.
        </p>
        <p class="mb-0">
          Updating will realign routine reminders and reports to your current
          local time. You can change this anytime from Profile settings.
        </p>
      </atom-card-text>
      <atom-card-actions>
        <atom-spacer></atom-spacer>
        <atom-button text @click="keepCurrent">Keep {{ savedLabel }}</atom-button>
        <atom-button color="primary" :loading="saving" @click="useBrowserTimezone">
          Use {{ browserLabel }}
        </atom-button>
      </atom-card-actions>
    </atom-card>
  </atom-dialog>
</template>

<script>
import gql from 'graphql-tag';
import {
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomDialog,
  AtomSpacer,
} from '@family-routine/ui/atoms';
import { TIMEZONE_OPTIONS } from '../constants/settings';
import { getSessionItem } from '../token';
import { GC_AUTH_TOKEN } from '../constants/settings';

const TRAVEL_DISMISS_KEY = 'TZ_TRAVEL_DISMISS';

function labelFor(value) {
  const match = TIMEZONE_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
}

export default {
  name: 'TimezoneSync',
  components: {
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomDialog,
    AtomSpacer,
  },
  data() {
    return {
      showPrompt: false,
      savedTimezone: '',
      browserTimezone: '',
      saving: false,
    };
  },
  computed: {
    savedLabel() {
      return labelFor(this.savedTimezone);
    },
    browserLabel() {
      return labelFor(this.browserTimezone);
    },
  },
  mounted() {
    this.browserTimezone = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
    if (!this.browserTimezone) return;

    // Only run once the user is signed in
    if (!getSessionItem(GC_AUTH_TOKEN)) return;

    this.checkTimezone();
  },
  methods: {
    async checkTimezone() {
      try {
        const { data } = await this.$apollo.query({
          query: gql`
            query getUserTimezone {
              getUserTags {
                email
                timezone
              }
            }
          `,
          fetchPolicy: 'network-only',
        });

        const saved = data && data.getUserTags && data.getUserTags.timezone;

        if (!saved) {
          // Silent backfill for existing users who have no timezone yet
          await this.persistTimezone(this.browserTimezone);
          this.savedTimezone = this.browserTimezone;
          return;
        }

        this.savedTimezone = saved;

        if (saved === this.browserTimezone) return;

        const dismissedFor = sessionStorage.getItem(TRAVEL_DISMISS_KEY);
        if (dismissedFor === this.browserTimezone) return;

        this.showPrompt = true;
      } catch (error) {
        console.error('Timezone sync failed:', error);
      }
    },

    async persistTimezone(timezone) {
      await this.$apollo.mutate({
        mutation: gql`
          mutation updateUserTimezone($timezone: String!) {
            updateUserTimezone(timezone: $timezone) {
              email
              timezone
            }
          }
        `,
        variables: { timezone },
      });
    },

    async useBrowserTimezone() {
      this.saving = true;
      try {
        await this.persistTimezone(this.browserTimezone);
        this.savedTimezone = this.browserTimezone;
        sessionStorage.removeItem(TRAVEL_DISMISS_KEY);
        this.showPrompt = false;
        this.$notify({
          title: 'Timezone updated',
          text: `Now using ${this.browserLabel}.`,
          group: 'notify',
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to update timezone:', error);
        this.$notify({
          title: 'Timezone update failed',
          text: 'Please try again from Profile settings.',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.saving = false;
      }
    },

    keepCurrent() {
      sessionStorage.setItem(TRAVEL_DISMISS_KEY, this.browserTimezone);
      this.showPrompt = false;
    },
  },
};
</script>
