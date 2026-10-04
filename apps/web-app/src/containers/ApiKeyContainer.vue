<template>
  <!-- One organism + one mutation (`generateApiKey`). -->
  <api-key-card
    :api-key="shownKey"
    :copied="copied"
    @generate="generate"
    @copy="onCopy"
  />
</template>

<script>
/**
 * The legacy API key, as a container.
 *
 * The design mints `'rn_' + Math.random()` in the browser. The real key is
 * `frt_<uuid>` and only `generateApiKey` can issue it — `chassis.md` § Conflicts
 * says call the mutation, and replace the old page's `alert('API Key generated
 * successfully!')` with the chassis toast, which the page raises off `generated`.
 *
 * `issued` holds the key the mutation just returned so it appears at once, while
 * `changed` asks `UserProfileContainer` to re-read the authoritative value.
 * It cannot be written into the cache by id: `UserItem` has no id on the server
 * type, so there is no fragment to write (see profileQueries.js).
 */
import ApiKeyCard from '@routine-notes/ui/organisms/ApiKeyCard/ApiKeyCard.vue';
import { GENERATE_API_KEY_MUTATION } from '../composables/graphql/profileQueries';
import { copyText } from '../utils/clipboard';

const COPIED_MS = 1500;

export default {
  name: 'ApiKeyContainer',

  components: { ApiKeyCard },

  props: {
    /** The saved key, from `UserProfileContainer`'s read. */
    apiKey: { type: String, default: '' },
  },

  data() {
    return { issued: '', copied: false };
  },

  computed: {
    /** The server's value wins as soon as the re-read brings it back. */
    shownKey() {
      return this.apiKey || this.issued;
    },
  },

  beforeDestroy() {
    clearTimeout(this.copiedTimer);
  },

  methods: {
    generate() {
      const replacing = !!this.shownKey;
      this.$apollo.mutate({ mutation: GENERATE_API_KEY_MUTATION })
        .then(({ data }) => {
          const key = (data && data.generateApiKey && data.generateApiKey.apiKey) || '';
          if (!key) {
            this.$emit('failed', 'The server returned no key');
            return;
          }
          this.issued = key;
          this.$emit('generated', key, replacing);
          this.$emit('changed');
        })
        .catch((error) => {
          console.error('[ApiKeyContainer] generateApiKey failed:', error);
          this.$emit('failed', 'Your existing key still works');
        });
    },

    onCopy({ value, label }) {
      copyText(value).then((ok) => {
        if (!ok) {
          this.$emit('copy-failed', label);
          return;
        }
        this.copied = true;
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => { this.copied = false; }, COPIED_MS);
        this.$emit('copied', label);
      });
    },
  },
};
</script>
