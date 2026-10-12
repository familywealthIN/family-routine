<template>
  <!--
    The legacy API key (`Profile and About.dc.html` § PP/PT/PD).

    The mock mints `'rn_' + random` in the browser. A real key comes from the
    `generateApiKey` mutation — chassis.md § Conflicts — so this card only ever
    ASKS, and the container mutates.

    Regenerating is irreversible: it invalidates whatever is still calling the
    API with the old key. The design states that in a caption; a caption does not
    stop a mis-tap, so when a key already exists the button takes two presses.
    Generating the FIRST key destroys nothing and stays one press.
  -->
  <section class="rn-pkey" data-testid="api-key-card">
    <header class="rn-pkey__head">
      <div class="rn-pkey__title">Legacy API key</div>
      <div class="rn-pkey__optional">Optional</div>
    </header>

    <div class="rn-pkey__row">
      <div
        class="rn-pkey__value"
        :class="{ 'rn-pkey__value--empty': !hasKey }"
        data-testid="api-key-value"
      >
        {{ hasKey ? apiKey : 'No API key yet' }}
      </div>

      <button
        v-if="hasKey"
        type="button"
        class="rn-pkey__copy"
        title="Copy"
        aria-label="Copy API key"
        data-testid="api-key-copy"
        @click="$emit('copy', { key: 'apiKey', value: apiKey, label: 'API key' })"
      >
        <i class="rn-mi">{{ copied ? 'check' : 'content_copy' }}</i>
      </button>

      <button
        v-if="confirming"
        type="button"
        class="rn-pkey__cancel"
        data-testid="api-key-cancel"
        @click="confirming = false"
      >
        Keep it
      </button>

      <button
        type="button"
        class="rn-pkey__btn"
        :class="{ 'rn-pkey__btn--danger': confirming }"
        data-testid="api-key-generate"
        @click="press"
      >
        {{ buttonLabel }}
      </button>
    </div>

    <p v-if="confirming" class="rn-pkey__note rn-pkey__note--danger" data-testid="api-key-confirm-note">
      Press again to replace the key. Anything still using the old one stops working immediately.
    </p>
    <p v-else-if="hasKey" class="rn-pkey__note" data-testid="api-key-note">
      Regenerating breaks anything still using the old key.
    </p>
  </section>
</template>

<script>
export default {
  name: 'OrganismApiKeyCard',
  props: {
    apiKey: { type: String, default: '' },
    /** True only after the clipboard write actually succeeded. */
    copied: { type: Boolean, default: false },
  },
  data() {
    return { confirming: false };
  },
  computed: {
    hasKey() {
      return !!this.apiKey;
    },
    buttonLabel() {
      if (this.confirming) return 'Confirm regenerate';
      return this.hasKey ? 'Regenerate' : 'Generate';
    },
  },
  watch: {
    /** A new key landed (or the card was reused) — drop the armed state. */
    apiKey() {
      this.confirming = false;
    },
  },
  methods: {
    press() {
      if (this.hasKey && !this.confirming) {
        this.confirming = true;
        return;
      }
      this.confirming = false;
      this.$emit('generate');
    },
  },
};
</script>

<style>
.rn-pkey {
  padding: 14px 16px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-pkey__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-pkey__title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
}

.rn-pkey__optional {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-pkey__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

/* Block, not flex. `text-overflow: ellipsis` has no effect on a flex
   container, so the key was hard-clipped mid-string ("frt_36fe7349-c54c-4458-b7")
   with nothing to show it continued and no way to scroll to the rest. The 40px
   line-height centres the single line exactly as `align-items: center` did.
   Matches `.rn-cai__cred-value` in ConnectAiPanel, which is on this same page
   and already ellipsises correctly. The full value stays reachable through the
   copy button beside it. */
.rn-pkey__value {
  flex: 1;
  min-width: 0;
  height: 40px;
  line-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f7f7f7;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-pkey__value--empty {
  color: rgba(0, 0, 0, .4);
}

.rn-pkey__copy {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #288bd5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-pkey__copy .rn-mi {
  font-size: 18px;
}

.rn-pkey__btn,
.rn-pkey__cancel {
  height: 40px;
  flex-shrink: 0;
  padding: 0 14px;
  border-radius: 20px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.rn-pkey__btn {
  border: 1px solid #288bd5;
  background: transparent;
  color: #288bd5;
}

.rn-pkey__btn--danger {
  border-color: #d32f2f;
  background: #d32f2f;
  color: #fff;
}

.rn-pkey__cancel {
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, .6);
}

.rn-pkey__note {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
  margin: 6px 0 0;
  line-height: 1.45;
}

.rn-pkey__note--danger {
  color: #d32f2f;
  font-weight: 600;
}
</style>
