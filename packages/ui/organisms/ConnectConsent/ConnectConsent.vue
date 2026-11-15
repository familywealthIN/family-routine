<template>
  <!--
    Allow access (`Profile and About.dc.html` § t3): the page an AI app opens
    when you connect it to Routine Notes over MCP. Who is asking, what it can
    do, where Allow sends you, then Allow or Cancel.

    Presentational: the page checks the request and does the redirect. The
    return host is always shown, so a look-alike app can't hide where the
    one-time code goes.
  -->
  <div class="rn-consent" data-testid="connect-consent">
    <header class="rn-consent__brand">
      <img class="rn-consent__brand-logo" :src="logo" alt="Routine Notes" />
      <div class="rn-consent__brand-name">Routine Notes</div>
    </header>

    <main class="rn-consent__body">
      <div v-if="status === 'loading'" class="rn-consent__card rn-consent__card--loading" data-testid="connect-consent-loading">
        <div class="rn-consent__spinner" aria-label="Checking the request"></div>
      </div>

      <div v-else-if="status === 'invalid'" class="rn-consent__card rn-consent__card--invalid" data-testid="connect-consent-invalid">
        <div class="rn-consent__bad-icon"><i class="rn-mi">link_off</i></div>
        <div class="rn-consent__bad-title">This connection link isn't valid</div>
        <div class="rn-consent__bad-text">
          {{ message || 'It may have expired. Go back to the app you were connecting and start again.' }}
        </div>
        <button type="button" class="rn-consent__primary" data-testid="connect-consent-back" @click="$emit('back')">
          Back to Routine Notes
        </button>
      </div>

      <div v-else class="rn-consent__card" data-testid="connect-consent-ready">
        <div class="rn-consent__tiles">
          <img class="rn-consent__tile-logo" :src="logo" alt="" />
          <i class="rn-mi rn-consent__tiles-link">sync_alt</i>
          <div class="rn-consent__tile-app" data-testid="connect-consent-initial">{{ initial }}</div>
        </div>
        <h1 class="rn-consent__title" data-testid="connect-consent-title">Allow {{ appName }} to use Routine Notes?</h1>
        <div class="rn-consent__who">
          Signed in as {{ email }} ·
          <button type="button" class="rn-consent__link" data-testid="connect-consent-switch" @click="$emit('switch-account')">Not you?</button>
        </div>

        <div class="rn-consent__can">
          <div class="rn-consent__can-head">{{ appName.toUpperCase() }} WILL BE ABLE TO</div>
          <div class="rn-consent__can-row"><i class="rn-mi">visibility</i>See your routines, goals, notes and points</div>
          <div class="rn-consent__can-row"><i class="rn-mi">edit_note</i>Add and change goals, and tick them off</div>
        </div>

        <div class="rn-consent__note">
          <i class="rn-mi">info</i>
          <span>
            It keeps access until you disconnect it in {{ appName }}. Allowing sends you back to
            <b data-testid="connect-consent-host">{{ redirectHost }}</b>.
          </span>
        </div>

        <div class="rn-consent__actions">
          <button
            type="button"
            class="rn-consent__text-btn"
            :disabled="status === 'working'"
            data-testid="connect-consent-cancel"
            @click="$emit('cancel')"
          >Cancel</button>
          <button
            type="button"
            class="rn-consent__primary"
            :disabled="status === 'working'"
            data-testid="connect-consent-allow"
            @click="$emit('allow')"
          >{{ status === 'working' ? 'Allowing…' : 'Allow' }}</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'OrganismConnectConsent',
  props: {
    /** loading → ready ⇄ working; invalid when the request fails its checks. */
    status: {
      type: String,
      default: 'loading',
      validator: (v) => ['loading', 'ready', 'working', 'invalid'].includes(v),
    },
    /** The app's registered name; empty falls back to the return host. */
    clientName: { type: String, default: '' },
    redirectHost: { type: String, default: '' },
    email: { type: String, default: '' },
    /** Why the request is invalid, when the server said. */
    message: { type: String, default: '' },
    logo: { type: String, default: '/img/icons/android-chrome-192x192.png' },
  },
  computed: {
    appName() {
      return this.clientName || this.redirectHost || 'This app';
    },
    initial() {
      return this.appName.trim().charAt(0).toUpperCase() || '?';
    },
  },
};
</script>

<style>
.rn-consent {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f4f4f4;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-consent__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
}

.rn-consent__brand-logo {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.rn-consent__brand-name {
  font-size: 15px;
  font-weight: 700;
}

.rn-consent__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px 40px;
}

.rn-consent__card {
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
  padding: 28px 24px 22px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

.rn-consent__card--loading {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
}

.rn-consent__spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(40, 139, 213, .2);
  border-top-color: #288bd5;
  animation: rn-consent-spin .8s linear infinite;
}

@keyframes rn-consent-spin {
  to { transform: rotate(360deg); }
}

.rn-consent__tiles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.rn-consent__tile-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.rn-consent__tiles-link {
  font-size: 20px;
  color: rgba(0, 0, 0, .35);
}

.rn-consent__tile-app {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #f4ede4;
  color: #c96442;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
}

.rn-consent__title {
  margin: 16px 0 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}

.rn-consent__who {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, .55);
  text-align: center;
  overflow-wrap: anywhere;
}

.rn-consent__link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: #288bd5;
  cursor: pointer;
}

.rn-consent__can {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f7f7f7;
}

.rn-consent__can-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-consent__can-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.rn-consent__can-row:first-of-type {
  margin-top: 10px;
}

.rn-consent__can-row .rn-mi {
  font-size: 18px;
  color: #288bd5;
}

.rn-consent__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .55);
}

.rn-consent__note .rn-mi {
  font-size: 16px;
}

.rn-consent__note b {
  color: rgba(0, 0, 0, .75);
  overflow-wrap: anywhere;
}

.rn-consent__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.rn-consent__text-btn,
.rn-consent__primary {
  height: 40px;
  border: 0;
  border-radius: 20px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-consent__text-btn {
  padding: 0 18px;
  background: transparent;
  color: #288bd5;
}

.rn-consent__primary {
  padding: 0 22px;
  background: #288bd5;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .14);
}

.rn-consent__text-btn:disabled,
.rn-consent__primary:disabled {
  opacity: .6;
  cursor: default;
}

.rn-consent__card--invalid {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 24px;
}

.rn-consent__bad-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(229, 57, 53, .08);
  color: #E53935;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-consent__bad-icon .rn-mi {
  font-size: 28px;
}

.rn-consent__bad-title {
  margin-top: 12px;
  font-size: 17px;
  font-weight: 700;
}

.rn-consent__bad-text {
  max-width: 300px;
  margin: 6px 0 16px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .55);
}
</style>
