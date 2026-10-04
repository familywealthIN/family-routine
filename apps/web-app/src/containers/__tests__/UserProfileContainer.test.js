/* eslint-env jest */
/**
 * Profile's one read.
 *
 * Four cards derive from this answer, so what matters is that it reports a
 * complete, defaulted shape — and that `loaded` means "a payload arrived", never
 * "a query finished loading" (ARCHITECTURE.md § 3.7). A missing `oauthConnected`
 * must come out false, not undefined, or Connect AI would render a tri-state chip.
 */
const Container = require('../UserProfileContainer.vue').default;
const { USER_PROFILE_QUERY } = require('../../composables/graphql/profileQueries');

const { computed, methods, apollo } = Container;

const profileOf = (userTags) => computed.profile.call({ userTags });

describe('UserProfileContainer', () => {
  it('reads getUserTags cache-and-network, so a lapsed OAuth state self-heals', () => {
    expect(apollo.userTags.query).toBe(USER_PROFILE_QUERY);
    expect(apollo.userTags.fetchPolicy).toBe('cache-and-network');
  });

  it('reports every field the page needs, defaulted', () => {
    expect(profileOf(null)).toEqual({
      name: '',
      email: '',
      picture: '',
      apiKey: '',
      oauthConnected: false,
      timezone: '',
      loaded: false,
    });
  });

  it('says loaded once a payload arrives, even an empty-ish one', () => {
    expect(profileOf({ email: 'g@example.com' }).loaded).toBe(true);
  });

  it('coerces a missing oauthConnected to false rather than undefined', () => {
    expect(profileOf({ email: 'g@example.com' }).oauthConnected).toBe(false);
    expect(profileOf({ oauthConnected: true }).oauthConnected).toBe(true);
  });

  it('passes the saved key and zone through untouched', () => {
    const profile = profileOf({ apiKey: 'frt_abc', timezone: 'Europe/London' });
    expect(profile.apiKey).toBe('frt_abc');
    expect(profile.timezone).toBe('Europe/London');
  });

  it('re-reads on request, which is how a mutation\'s effect becomes visible', () => {
    const refetch = jest.fn(() => Promise.resolve());
    methods.refresh.call({ $apollo: { queries: { userTags: { refetch } } } });
    expect(refetch).toHaveBeenCalled();
  });

  it('does not explode when there is no vue-apollo at all', () => {
    expect(() => methods.refresh.call({})).not.toThrow();
  });

  it('reports a failed read instead of looking empty', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const emitted = [];
    const vm = { failed: false, $emit: (name) => emitted.push(name) };
    apollo.userTags.error.call(vm, new Error('401'));
    expect(vm.failed).toBe(true);
    expect(emitted).toEqual(['failed']);
    console.error.mockRestore();
  });

  it('renders nothing — it is a read, not a thing on screen', () => {
    expect(Container.render()).toBeNull();
  });
});
