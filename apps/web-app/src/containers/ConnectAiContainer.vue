<template>
  <connect-ai-panel
    :connected="connected"
    :server-url="serverUrl"
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
 * ## No client secret
 *
 * MCP clients register themselves and sign in with PKCE at the server's
 * origin (apps/server src/utils/mcpOAuth.js), so the card shows the Server URL
 * and the pre-registered Client ID and nothing secret. It used to mint a
 * `frt_secret_…` here that the server never accepted.
 */
import ConnectAiPanel from '@routine-notes/ui/organisms/ConnectAiPanel/ConnectAiPanel.vue';
import { copyText } from '../utils/clipboard';

/** How long the copy tick stays on a row. */
const COPIED_MS = 1500;

/**
 * The MCP server's own domain: MCP clients sign in at the ORIGIN ROOT
 * (/.well-known/…, /authorize, /token), which the raw execute-api URL can't
 * serve because its root sits outside the /dev stage. Dev runs the MCP server
 * on :4000 beside GraphQL on :3000. VUE_APP_MCP_URL overrides both.
 */
export const PRODUCTION_MCP_URL = 'https://mcp.routinenotes.app/mcp';

export function mcpUrl(env = process.env) {
  if (env.VUE_APP_MCP_URL) return env.VUE_APP_MCP_URL;
  return env.NODE_ENV === 'production' ? PRODUCTION_MCP_URL : 'http://localhost:4000/mcp';
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
