/**
 * Sign out, native-aware.
 *
 * Extracted from MobileLayout so the Routine Focus user drawer logs out through
 * exactly the same path — a second copy of this would be a second place for the
 * Capacitor plugin to be initialised wrongly, and GoogleAuth.signOut() throws a
 * nil error on native if it was never initialised in that session.
 *
 * Always clears local data, even when the provider call fails: a user who
 * pressed Log out must end up logged out.
 */
import localforage from 'localforage';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { USER_TAGS } from '../constants/settings';
import { clearData } from '../token';
import { gauthOption } from '../blob/config';

async function revokeProviderSession(gAuth) {
  if (Capacitor.isNativePlatform()) {
    // Initialize before signOut to prevent nil error.
    const platform = Capacitor.getPlatform();
    const clientId = platform === 'ios'
      ? gauthOption.iosClientId
      : gauthOption.androidClientId;
    await GoogleAuth.initialize({ clientId, scopes: ['profile', 'email'] });
    await GoogleAuth.signOut();
    return;
  }
  if (gAuth && typeof gAuth.signOut === 'function') {
    await gAuth.signOut();
  }
}

async function clearApolloStore(vm) {
  const client = vm && vm.$apollo && vm.$apollo.provider && vm.$apollo.provider.defaultClient;
  if (!client || typeof client.clearStore !== 'function') return;
  try {
    // clearStore, not resetStore: resetStore refetches every active query,
    // which here would just re-read the signed-out user's data.
    await client.clearStore();
  } catch (error) {
    console.log(error);
  }
}

/**
 * @param {Object} vm the calling component (for `$gAuth`, `$apollo`, `$root`
 *   and `$router`)
 */
export async function signOut(vm) {
  try {
    await revokeProviderSession(vm && vm.$gAuth);
  } catch (error) {
    console.log(error);
  }

  try {
    await clearData();
    localStorage.removeItem(USER_TAGS);
  } catch (error) {
    console.log(error);
  }

  // The previous account's data must not survive into the next sign-in. The
  // in-memory Apollo store goes FIRST: the CachePersistor's write-back trigger
  // serialises whatever the store holds, so clearing localforage while the old
  // store is still live lets a pending write put the old user's cache straight
  // back on disk. Each step is guarded on its own so one failure cannot leave
  // the other copy behind.
  await clearApolloStore(vm);
  try {
    await localforage.clear();
  } catch (error) {
    console.log(error);
  }

  // The shell's name / avatar read these off the root; without a reset the
  // login screen and the next account's first paint still show the old user.
  const root = vm && vm.$root && vm.$root.$data;
  if (root) {
    root.name = '';
    root.email = '';
    root.picture = '';
  }

  if (vm && vm.$router) {
    vm.$router.push('/').catch(() => {});
  }
}

export default signOut;
