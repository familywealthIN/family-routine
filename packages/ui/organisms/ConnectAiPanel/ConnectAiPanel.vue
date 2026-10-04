<template>
  <!--
    Connect AI — the MCP credentials and the four setup guides
    (`Profile and About.dc.html` § PP/PT/PD).

    ## The design only draws the connected state

    It renders the green "Connected" chip unconditionally and a fixed
    `rn_sec_…` secret. Reality: `oauthConnected` defaults **false** (it is true
    only once a client has completed the OAuth handshake) and the server's prefix
    is `frt_secret_`. `docs/redesign/chassis.md` § Conflicts says to model the
    disconnected state too — so the chip has two forms, and when nothing has
    connected yet the panel says what will make it flip rather than leaving the
    user to guess at a chip that never turns green.

    ## Copying is the container's job

    `navigator.clipboard` is a browser API and `packages/ui` stays pure, so a
    copy button emits `copy` and the container writes. `copiedKey` comes back
    only when the write actually succeeded, so the tick is never a lie.
  -->
  <section class="rn-cai" data-testid="connect-ai">
    <header class="rn-cai__head">
      <div class="rn-cai__title">Connect AI</div>
      <div
        class="rn-cai__chip"
        :class="connected ? 'rn-cai__chip--on' : 'rn-cai__chip--off'"
        data-testid="connect-ai-status"
      >
        <i class="rn-mi rn-cai__chip-glyph">{{ connected ? 'check_circle' : 'link_off' }}</i>
        {{ connected ? 'Connected' : 'Not connected' }}
      </div>
    </header>

    <p class="rn-cai__lead" data-testid="connect-ai-lead">{{ lead }}</p>

    <div class="rn-cai__creds">
      <div
        v-for="row in credentials"
        :key="row.key"
        class="rn-cai__cred"
        :data-testid="`connect-ai-cred-${row.key}`"
      >
        <div class="rn-cai__cred-text">
          <div class="rn-cai__cred-label">{{ row.label }}</div>
          <div class="rn-cai__cred-value" :data-testid="`connect-ai-value-${row.key}`">
            {{ row.display }}
          </div>
        </div>

        <button
          v-if="row.secret"
          type="button"
          class="rn-cai__icon-btn"
          :title="revealed ? 'Hide' : 'Show'"
          :aria-label="revealed ? 'Hide client secret' : 'Show client secret'"
          data-testid="connect-ai-reveal"
          @click="revealed = !revealed"
        >
          <i class="rn-mi">{{ revealed ? 'visibility_off' : 'visibility' }}</i>
        </button>

        <button
          type="button"
          class="rn-cai__icon-btn rn-cai__icon-btn--copy"
          title="Copy"
          :aria-label="`Copy ${row.label}`"
          :disabled="!row.value"
          :data-testid="`connect-ai-copy-${row.key}`"
          @click="copy(row)"
        >
          <i class="rn-mi">{{ copiedKey === row.key ? 'check' : 'content_copy' }}</i>
        </button>
      </div>
    </div>

    <div class="rn-cai__sub-head">SET UP IN</div>

    <div class="rn-cai__chips">
      <button
        v-for="guide in guides"
        :key="guide.key"
        type="button"
        class="rn-cai__platform"
        :class="{ 'rn-cai__platform--on': guide.key === platform }"
        :aria-pressed="guide.key === platform ? 'true' : 'false'"
        :data-testid="`connect-ai-platform-${guide.key}`"
        @click="platform = guide.key"
      >
        {{ guide.label }}
      </button>
    </div>

    <!-- `:key` remounts the list so the entrance replays, instead of the mock's
         alternating rn-in0 / rn-in1 keyframes (chassis.md § Motion). -->
    <ol :key="platform" class="rn-cai__steps" data-testid="connect-ai-steps">
      <li v-for="(step, index) in activeSteps" :key="index" class="rn-cai__step">
        <span class="rn-cai__step-n">{{ index + 1 }}</span>
        <span class="rn-cai__step-text">{{ step }}</span>
      </li>
    </ol>
  </section>
</template>

<script>
import { MCP_CLIENT_ID, maskSecret, platformGuides } from '../../constants/profile';

export default {
  name: 'OrganismConnectAiPanel',
  props: {
    /** Server-truth, default false. The mock's always-green chip is wrong. */
    connected: { type: Boolean, default: false },
    serverUrl: { type: String, default: '' },
    clientId: { type: String, default: MCP_CLIENT_ID },
    clientSecret: { type: String, default: '' },
    /** The row whose copy just succeeded, so only that tick flips. */
    copiedKey: { type: String, default: '' },
  },
  data() {
    return {
      /** Transient view state — not server state, so it lives here. */
      revealed: false,
      platform: 'ChatGPT',
    };
  },
  computed: {
    lead() {
      if (this.connected) return 'Use these with any MCP client to read and add goals.';
      return 'Paste these into an MCP client and authorize — this turns Connected '
        + 'as soon as one completes the handshake.';
    },
    /** Hidden by default; an em dash where a value has not been issued at all. */
    secretDisplay() {
      if (!this.clientSecret) return '—';
      return this.revealed ? this.clientSecret : maskSecret(this.clientSecret);
    },
    credentials() {
      return [
        {
          key: 'url', label: 'SERVER URL', name: 'Server URL', value: this.serverUrl, display: this.serverUrl || '—', secret: false,
        },
        {
          key: 'cid', label: 'CLIENT ID', name: 'Client ID', value: this.clientId, display: this.clientId || '—', secret: false,
        },
        {
          key: 'sec',
          label: 'CLIENT SECRET',
          name: 'Client secret',
          value: this.clientSecret,
          display: this.secretDisplay,
          secret: true,
        },
      ];
    },
    guides() {
      return platformGuides(this.serverUrl);
    },
    activeSteps() {
      const guide = this.guides.find((candidate) => candidate.key === this.platform);
      return guide ? guide.steps : [];
    },
  },
  methods: {
    copy(row) {
      if (!row.value) return;
      // Sentence case with acronyms kept ("Server URL copied"). Lower-casing
      // the caps label turned them into "Server url" / "Client id".
      this.$emit('copy', { key: row.key, value: row.value, label: row.name });
    },
  },
};
</script>

<style>
.rn-cai {
  padding: 14px 16px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-cai__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-cai__title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
}

.rn-cai__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.rn-cai__chip--on {
  background: rgba(76, 175, 80, .12);
  color: #2e7d32;
}

/* Neutral, not red: "nobody has connected yet" is a state, not a failure. */
.rn-cai__chip--off {
  background: rgba(0, 0, 0, .06);
  color: rgba(0, 0, 0, .55);
}

.rn-cai__chip-glyph {
  font-size: 14px;
}

.rn-cai__lead {
  font-size: 13px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .6);
  margin: 4px 0 0;
}

.rn-cai__creds {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.rn-cai__cred {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 4px 6px 4px 12px;
  border-radius: 12px;
  background: #f7f7f7;
}

.rn-cai__cred-text {
  flex: 1;
  min-width: 0;
}

.rn-cai__cred-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-cai__cred-value {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.rn-cai__icon-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-cai__icon-btn--copy {
  color: #288bd5;
}

.rn-cai__icon-btn:disabled {
  opacity: .4;
  cursor: default;
}

.rn-cai__icon-btn .rn-mi {
  font-size: 18px;
}

.rn-cai__sub-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  margin-top: 16px;
}

.rn-cai__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rn-cai__platform {
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, .12);
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, .65);
  cursor: pointer;
}

.rn-cai__platform--on {
  background: rgba(40, 139, 213, .12);
  border-color: rgba(40, 139, 213, .45);
  color: #1f6fab;
}

.rn-cai__steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  animation: rn-fade .25s ease;
}

.rn-cai__step {
  display: flex;
  gap: 10px;
  font-size: 13px;
  line-height: 1.45;
}

.rn-cai__step-n {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f4f4f4;
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, .6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-cai__step-text {
  flex: 1;
  min-width: 0;
  color: rgba(0, 0, 0, .78);
}
</style>
