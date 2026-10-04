jest.mock('../views/Login.vue', () => ({ name: 'Login', render: (h) => h('div') }));
jest.mock('../views/YearGoals.vue', () => ({ name: 'YearGoals', render: (h) => h('div') }));

/* eslint-disable import/first */
import router from '../router';
/* eslint-enable import/first */

describe('router catch-all', () => {
  it.each(['/areas', '/projects', '/no-such-page', '/settings/nope/deeper'])(
    'redirects the unknown URL %s to /home',
    (path) => {
      // resolve() follows redirects without loading the lazy /home chunk.
      const { route } = router.resolve(path);
      expect(route.path).toBe('/home');
      expect(route.name).toBe('home');
    },
  );

  it('does not shadow the login route at /', () => {
    expect(router.resolve('/').route.name).toBe('login');
  });

  it('does not shadow real routes', () => {
    expect(router.resolve('/settings/profile').route.name).toBe('profile');
    expect(router.resolve('/year-goals/abc').route.name).toBe('yearGoal');
  });
});
