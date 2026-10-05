/* eslint-env jest */
/**
 * D-10 residual: `$routine` aliased three routineStore methods that the store
 * has never had (`getIndexedDBCache`, `loadFromIndexedDB`, `init`). Each alias
 * was silently `undefined`, so the first caller got
 * "routineStore.loadFromIndexedDB is not a function" — the TypeError that left
 * an offline day with no cached fallback.
 *
 * Every member of the proxy must therefore resolve to something. The getters
 * are exercised too: they read the live store, whose initial values are ''/
 * []/false/null - never undefined.
 */
const Vue = require('vue');

const routinePlugin = require('../routine').default;

Vue.use(routinePlugin);
Vue.config.productionTip = false;
Vue.config.devtools = false;

describe('$routine surface', () => {
  const proxy = () => new Vue().$routine;

  it('exposes nothing that resolves to undefined', () => {
    const missing = Object.keys(proxy()).filter((key) => proxy()[key] === undefined);
    expect(missing).toEqual([]);
  });

  it('no longer offers the IndexedDB aliases the store cannot back', () => {
    expect(Object.keys(proxy())).not.toContain('loadFromIndexedDB');
    expect(Object.keys(proxy())).not.toContain('getIndexedDBCache');
  });
});
