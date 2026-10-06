/* eslint-env jest */
/**
 * The gap the mock left: its Accept handler only dismissed the card and toasted —
 * it never switched groups (docs/redesign/chassis.md, last line). `acceptInvite`
 * is a real mutation that returns the caller's NEW groupId, so these tests assert
 * the mutation is actually called and its groupId is what leaves the container.
 *
 * Methods are exercised against a minimal vm-like context, matching the
 * GoalCreationContainerMissed.test.js convention.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GroupJoinRequestContainer.vue').default;
const DeclineUnit = require('../GroupInviteDeclineContainer.vue').default;
const {
  ACCEPT_INVITE_MUTATION, DECLINE_INVITE_MUTATION,
} = require('../../composables/graphql/groupQueries');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (mutate, overrides = {}) => ({
  inviterEmail: 'nina@studio.co',
  $apollo: { mutate: mutate || jest.fn(() => Promise.resolve({ data: {} })) },
  $emit: jest.fn(),
  $refs: {},
  ...overrides,
});

describe('GroupJoinRequestContainer — Accept really joins', () => {
  it('calls acceptInvite with the inviter the card named', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.resolve({
      data: { acceptInvite: { email: 'me@x.com', groupId: 'g-new' } },
    })));

    Container.methods.onAccept.call(ctx);
    await flush();

    expect(ctx.$apollo.mutate).toHaveBeenCalledWith({
      mutation: ACCEPT_INVITE_MUTATION,
      variables: { inviterEmail: 'nina@studio.co' },
    });
  });

  it('hands the NEW groupId up, which is what makes the page re-read the group', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.resolve({
      data: { acceptInvite: { email: 'me@x.com', groupId: 'g-new' } },
    })));

    Container.methods.onAccept.call(ctx);
    await flush();

    expect(ctx.$emit).toHaveBeenCalledWith('accepted', {
      inviterEmail: 'nina@studio.co',
      groupId: 'g-new',
    });
  });

  it('reports a failed accept instead of pretending the switch happened', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.reject(new Error('403:Group Not Found'))));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    Container.methods.onAccept.call(ctx);
    await flush();

    expect(ctx.$emit).toHaveBeenCalledWith('failed', 'accept');
    expect(ctx.$emit).not.toHaveBeenCalledWith('accepted', expect.anything());
    console.error.mockRestore();
  });

  it('asks the mutation for the groupId it needs back', () => {
    const [definition] = ACCEPT_INVITE_MUTATION.definitions;
    const [field] = definition.selectionSet.selections;
    const fields = field.selectionSet.selections.map((selection) => selection.name.value);
    expect(fields).toContain('groupId');
  });

  it('delegates Decline to its own single-op unit', () => {
    const run = jest.fn();
    const ctx = makeCtx(undefined, { $refs: { decline: { run } } });

    Container.methods.onDecline.call(ctx);

    expect(run).toHaveBeenCalled();
    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });
});

describe('GroupInviteDeclineContainer', () => {
  it('runs declineInvite and reports done', async () => {
    const ctx = makeCtx();

    await DeclineUnit.methods.run.call(ctx);

    expect(ctx.$apollo.mutate).toHaveBeenCalledWith({ mutation: DECLINE_INVITE_MUTATION });
    expect(ctx.$emit).toHaveBeenCalledWith('done');
  });

  it('reports a failure rather than silently clearing the card', async () => {
    const ctx = makeCtx(jest.fn(() => Promise.reject(new Error('offline'))));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await DeclineUnit.methods.run.call(ctx);

    expect(ctx.$emit).toHaveBeenCalledWith('failed');
    console.error.mockRestore();
  });
});
