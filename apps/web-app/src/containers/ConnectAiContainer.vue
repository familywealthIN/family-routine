<template>
  <connect-ai-panel
    :connected="connected"
    :server-url="serverUrl"
    :client-secret="clientSecret"
    :copied-key="copiedKey"
    @copy="onCopy"
  />
</template>

<script>
/**
 * `ConnectAiPanel`'s container home.
 *
 * It owns no GraphQL: `oauthConnected` arrives from `UserProfileContainer`'s one
 * read, and nothing on this card writes to the server. What it does own is the
 * two things an organism in `packages/ui` may not touch — the clipboard
 * (`navigator.clipboard`, guarded in utils/clipboard.js) and the build-dependent
 * MCP endpoint. The same arrangement `StepModalContainer` has: a container home
 * for an organism whose domain happens to involve no query.
 *
 * ## The client secret is NOT issued through the app (known gap)
 *
 * The server validates `process.env.OAUTH_CLIENT_SECRET`
 * (apps/server/src/mcp-http-server.js) and exposes it through no GraphQL field,
 * so the page cannot know the real one. The pre-existing behaviour — mint a
 * `frt_secret_…` string client-side — is preserved here rather than silently
 * changed, but it is a placeholder: it is generated once per mount and will not
 * match the server. `chassis.md` only settles the PREFIX (`frt_secret_`, not the
 * mock's `rn_sec_`). Issuing the real secret needs a server field; until then
 * the disconnected panel at least tells the user the chip flips on a successful
 * handshake instead of implying one already happened.
 */
import ConnectAiPanel from '@routine-notes/ui/organisms/ConnectAiPanel/ConnectAiPanel.vue';
import { SECRET_PREFIX } from '@routine-notes/ui/constants/profile';
import { copyText } from '../utils/clipboard';

/** How long the copy tick stays on a row. */
const COPIED_MS = 1500;

/**
 * Unchanged from the page this replaces: dev runs the MCP server on :4000 while
 * GraphQL is on :3000, so it cannot be derived from `graphQLUrl`. The production
 * host is a placeholder in the original too — reported, not invented here.
 */
function mcpUrl() {
  return process.env.NODE_ENV === 'production'
    ? 'https://your-api-domain.com/dev/mcp'
    : 'http://localhost:4000/mcp';
}

function placeholderSecret() {
  const rand = () => Math.random().toString(36).slice(2, 15);
  return `${SECRET_PREFIX}${rand()}${rand()}`;
}

export default {
  name: 'ConnectAiContainer',

  components: { ConnectAiPanel },

  props: {
    /** From the one `getUserTags` read. Defaults false, as the server does. */
    connected: { type: Boolean, default: false },
  },

  data() {
    return {
      serverUrl: mcpUrl(),
      clientSecret: placeholderSecret(),
      copiedKey: '',
    };
  },

  beforeDestroy() {
    clearTimeout(this.copiedTimer);
  },

  methods: {
    /**
     * The tick and the toast both wait for a real answer: a clipboard that
     * refused must not report "copied" (the old page alerted success from its
     * fallback path regardless).
     */
    onCopy({ key, value, label }) {
      copyText(value).then((ok) => {
        if (!ok) {
          this.$emit('copy-failed', label);
          return;
        }
        this.copiedKey = key;
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() => { this.copiedKey = ''; }, COPIED_MS);
        this.$emit('copied', label);
      });
    },
  },
};
</script>
