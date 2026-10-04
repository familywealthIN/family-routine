<template>
  <!-- One organism + one mutation (`deleteAccount`). -->
  <delete-account-panel
    :open="open"
    :shell="shell"
    @open="$emit('open')"
    @close="$emit('close')"
    @confirm="confirm"
  />
</template>

<script>
/**
 * Deleting the account, as a container.
 *
 * The design's handler toasts "Prototype only — nothing was removed".
 * `chassis.md` § Conflicts keeps the REAL behaviour: the `deleteAccount`
 * mutation, then local data and the Apollo cache cleared and the app sent back
 * to `/`. The type-DELETE gate (in the organism) is correct as drawn and is the
 * only confirmation — it is not weakened here.
 *
 * The container owns the mutation and the cache teardown it causes; the PAGE
 * owns what happens to the session afterwards (ARCHITECTURE.md § 6 —
 * cross-domain consequences are page-orchestrated), so the redirect is emitted,
 * not performed.
 *
 * `success` is a String on the server (`DeleteAccountResponse`), so `'true'` is
 * compared as a string. A falsy answer is reported as a failure rather than
 * cheerfully redirecting away from an account that still exists.
 */
import DeleteAccountPanel from '@routine-notes/ui/organisms/DeleteAccountPanel/DeleteAccountPanel.vue';
import { DELETE_ACCOUNT_MUTATION } from '../composables/graphql/profileQueries';

export default {
  name: 'AccountDeleteContainer',

  components: { DeleteAccountPanel },

  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
  },

  methods: {
    confirm() {
      this.$apollo.mutate({ mutation: DELETE_ACCOUNT_MUTATION })
        .then(({ data }) => {
          const result = (data && data.deleteAccount) || {};
          if (String(result.success) !== 'true') {
            this.$emit('failed', result.message || 'The account was not deleted');
            return;
          }
          this.clearClientState();
          this.$emit('deleted', result.message || 'Everything has been removed');
        })
        .catch((error) => {
          console.error('[AccountDeleteContainer] deleteAccount failed:', error);
          this.$emit('failed', 'Nothing was deleted — try again or contact support');
        });
    },

    /**
     * Everything the signed-out client must not keep. `clearStore()` is used
     * rather than `resetStore()` on purpose: reset re-runs every active query,
     * and every one of them would 401 against an account that no longer exists.
     */
    clearClientState() {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn('[AccountDeleteContainer] localStorage.clear failed:', error);
      }
      const client = this.$apollo
        && this.$apollo.provider
        && this.$apollo.provider.defaultClient;
      if (client && typeof client.clearStore === 'function') {
        client.clearStore().catch(() => {});
      }
    },
  },
};
</script>
