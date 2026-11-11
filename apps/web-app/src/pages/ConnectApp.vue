<template>
  <connect-consent
    :status="status"
    :client-name="clientName"
    :redirect-host="redirectHost"
    :email="email"
    :message="message"
    @allow="allow"
    @cancel="cancel"
    @switch-account="switchAccount"
    @back="goHome"
  />
</template>

<script>
/**
 * /connect — the consent step of the MCP connector's sign-in.
 *
 * The server's /authorize (apps/server src/mcpAuthRoutes.js) sends the user
 * here with the app's request in the query. The page asks the server to check
 * it (mcpAuthRequest) before showing anything to press, and Allow asks again
 * (approveMcpAccess), because the query is the user's to edit. Allow and
 * Cancel both leave the app: back to the client's redirect_uri.
 */
import gql from 'graphql-tag';
import ConnectConsent from '@routine-notes/ui/organisms/ConnectConsent/ConnectConsent.vue';
import { GC_AUTH_TOKEN, GC_USER_EMAIL } from '../constants/settings';
import { getSessionItem } from '../token';
import { signOut } from '../utils/signOut';
import { rememberAfterSignIn } from '../utils/afterSignIn';

const ARGS = '$clientId: String!, $redirectUri: String!, $codeChallenge: String, $codeChallengeMethod: String, $scope: String, $state: String';
const PASS = 'clientId: $clientId, redirectUri: $redirectUri, codeChallenge: $codeChallenge, '
  + 'codeChallengeMethod: $codeChallengeMethod, scope: $scope, state: $state';

export const MCP_AUTH_REQUEST = gql(`query mcpAuthRequest(${ARGS}) { mcpAuthRequest(${PASS}) { clientName redirectHost } }`);
export const APPROVE_MCP_ACCESS = gql(`mutation approveMcpAccess(${ARGS}) { approveMcpAccess(${PASS}) { redirectTo } }`);

/** The server's message without the `400:` status prefix. */
const reason = (error) => {
  const gqlError = error && error.graphQLErrors && error.graphQLErrors[0];
  return gqlError ? String(gqlError.message).replace(/^\d{3}:/, '') : '';
};

export default {
  name: 'ConnectApp',
  components: { ConnectConsent },
  data() {
    return {
      status: 'loading',
      clientName: '',
      redirectHost: '',
      message: '',
      email: getSessionItem(GC_USER_EMAIL) || '',
    };
  },
  computed: {
    request() {
      const q = this.$route.query;
      return {
        clientId: q.client_id || '',
        redirectUri: q.redirect_uri || '',
        codeChallenge: q.code_challenge,
        codeChallengeMethod: q.code_challenge_method,
        scope: q.scope,
        state: q.state,
      };
    },
  },
  created() {
    if (!getSessionItem(GC_AUTH_TOKEN)) {
      this.signInFirst();
      return;
    }
    this.check();
  },
  methods: {
    signInFirst() {
      rememberAfterSignIn(this.$route.fullPath);
      this.$router.replace('/').catch(() => {});
    },
    async check() {
      if (!this.request.clientId || !this.request.redirectUri) {
        this.status = 'invalid';
        return;
      }
      try {
        const { data } = await this.$apollo.query({
          query: MCP_AUTH_REQUEST, variables: this.request, fetchPolicy: 'no-cache',
        });
        this.clientName = data.mcpAuthRequest.clientName || '';
        this.redirectHost = data.mcpAuthRequest.redirectHost || '';
        this.status = 'ready';
      } catch (error) {
        this.message = reason(error);
        this.status = 'invalid';
      }
    },
    async allow() {
      if (this.status !== 'ready') return;
      this.status = 'working';
      try {
        const { data } = await this.$apollo.mutate({ mutation: APPROVE_MCP_ACCESS, variables: this.request });
        this.leave(data.approveMcpAccess.redirectTo);
      } catch (error) {
        this.message = reason(error);
        this.status = 'invalid';
      }
    },
    /** Only reachable once the server accepted this redirect_uri for the client. */
    cancel() {
      if (this.status !== 'ready') return;
      const back = new URL(this.request.redirectUri);
      back.searchParams.set('error', 'access_denied');
      if (this.request.state) back.searchParams.set('state', this.request.state);
      this.leave(back.toString());
    },
    /** Sign out and come back here as whoever signs in next. signOut goes to /. */
    switchAccount() {
      rememberAfterSignIn(this.$route.fullPath);
      return signOut(this);
    },
    /** Out of the app, back to the AI app's own page. */
    leave(url) {
      window.location.assign(url);
    },
    goHome() {
      this.$router.replace('/home').catch(() => {});
    },
  },
};
</script>
