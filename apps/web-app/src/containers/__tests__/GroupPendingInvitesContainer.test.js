/* eslint-env jest */
/**
 * "Cancel invite" is real, and pending invites come from the server.
 *
 * `GroupInviteCancelContainer` must call `cancelInvite` with the address and
 * report success or failure (the page removes the row only on success);
 * `GroupPendingInvitesContainer` turns the server's `pendingInvites` into the
 * page's pending rows.
 */
const CancelUnit = require('../GroupInviteCancelContainer.vue').default;
const PendingRead = require('../GroupPendingInvitesContainer.vue').default;
const {
  CANCEL_INVITE_MUTATION,
  PENDING_INVITES_QUERY,
} = require('../../composables/graphql/groupQueries');

describe('GroupInviteCancelContainer', () => {
  const makeCtx = (mutate) => ({ $apollo: { mutate }, $emit: jest.fn() });

  it('cancels on the server and resolves true', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.resolve({ data: { cancelInvite: { email: 'jo@x.com' } } })));

    const ok = await CancelUnit.methods.run.call(ctx, 'jo@x.com');

    expect(ctx.$apollo.mutate).toHaveBeenCalledWith({
      mutation: CANCEL_INVITE_MUTATION,
      variables: { invitedEmail: 'jo@x.com' },
    });
    expect(ok).toBe(true);
    expect(ctx.$emit).toHaveBeenCalledWith('done', 'jo@x.com');
  });

  it('reports a refused or failed cancel and resolves false', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const ctx = makeCtx(jest.fn(() => Promise.reject(new Error('GraphQL error: 403:Invite Not Found'))));

    const ok = await CancelUnit.methods.run.call(ctx, 'jo@x.com');

    expect(ok).toBe(false);
    expect(ctx.$emit).toHaveBeenCalledWith('failed', 'jo@x.com');
    expect(ctx.$emit).not.toHaveBeenCalledWith('done', expect.anything());
    console.error.mockRestore();
  });
});

describe('GroupPendingInvitesContainer', () => {
  it('reads pendingInvites from the server, freshly', () => {
    expect(PendingRead.apollo.pendingInvites.query).toBe(PENDING_INVITES_QUERY);
    expect(PendingRead.apollo.pendingInvites.fetchPolicy).toBe('cache-and-network');
    expect(PendingRead.apollo.pendingInvites.update({
      pendingInvites: [{ email: 'a@x.com' }],
    })).toEqual([{ email: 'a@x.com' }]);
    expect(PendingRead.apollo.pendingInvites.update({})).toEqual([]);
  });

  it('maps server invites to pending rows keyed on the email', () => {
    const pending = PendingRead.computed.pending.call({
      pendingInvites: [
        { email: 'Jo@X.com', name: 'Jo', picture: 'p.png' },
        { email: 'sam@x.com', name: null, picture: null },
        { email: '' },
      ],
    });

    expect(pending).toEqual([
      {
        id: 'jo@x.com', email: 'Jo@X.com', name: 'Jo', picture: 'p.png',
      },
      {
        id: 'sam@x.com', email: 'sam@x.com', name: '', picture: '',
      },
    ]);
  });

  it('emits the list only once the server has answered', () => {
    const emit = jest.fn();
    PendingRead.watch.pending.call({ pendingInvites: null, $emit: emit }, [], undefined);
    expect(emit).not.toHaveBeenCalled();

    const rows = [{
      id: 'a@x.com', email: 'a@x.com', name: '', picture: '',
    }];
    PendingRead.watch.pending.call({ pendingInvites: [{ email: 'a@x.com' }], $emit: emit }, rows, []);
    expect(emit).toHaveBeenCalledWith('pending', rows);
  });

  it('refresh() refetches the read', () => {
    const refetch = jest.fn(() => Promise.resolve());
    PendingRead.methods.refresh.call({ $apollo: { queries: { pendingInvites: { refetch } } } });
    expect(refetch).toHaveBeenCalled();
  });
});
