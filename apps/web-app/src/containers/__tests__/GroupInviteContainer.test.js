/* eslint-env jest */
/**
 * The invite write. The gate is the thing: a half-typed or duplicate address must
 * never reach the server, a full group must never send, and the one failure the
 * user can act on (`User Not Found`) has to say what it was.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GroupInviteContainer.vue').default;
const { SEND_INVITE_MUTATION } = require('../../composables/graphql/groupQueries');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (overrides = {}, mutate = jest.fn(() => Promise.resolve({ data: {} }))) => ({
  email: '',
  tried: false,
  taken: ['priya@shah.in'],
  full: false,
  $apollo: { mutate },
  $emit: jest.fn(),
  send: Container.methods.send,
  ...overrides,
});

describe('GroupInviteContainer', () => {
  it('sends a valid, new address', async () => {
    const ctx = makeCtx({ email: '  jo@family.com  ' });

    Container.methods.onSend.call(ctx);
    await flush();

    expect(ctx.$apollo.mutate).toHaveBeenCalledWith({
      mutation: SEND_INVITE_MUTATION,
      variables: { invitedEmail: 'jo@family.com' },
    });
    expect(ctx.$emit).toHaveBeenCalledWith('sent', 'jo@family.com');
  });

  it('does not send a half-typed address — it marks the field as tried instead', () => {
    const ctx = makeCtx({ email: 'jo@' });

    Container.methods.onSend.call(ctx);

    expect(ctx.tried).toBe(true);
    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('does not re-invite somebody who is already in the group', () => {
    const ctx = makeCtx({ email: 'priya@shah.in' });

    Container.methods.onSend.call(ctx);

    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('does not send once the 10-member cap is reached', () => {
    const ctx = makeCtx({ email: 'jo@family.com', full: true });

    Container.methods.onSend.call(ctx);

    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('names the one failure the user can do something about', async () => {
    const ctx = makeCtx(
      { email: 'ghost@nowhere.com' },
      jest.fn(() => Promise.reject(new Error('403:User Not Found'))),
    );

    Container.methods.onSend.call(ctx);
    await flush();

    expect(ctx.$emit).toHaveBeenCalledWith('failed', {
      email: 'ghost@nowhere.com',
      reason: 'No Routine Notes account uses that email yet',
    });
  });

  it('falls back to a plain retry message for anything else', async () => {
    const ctx = makeCtx(
      { email: 'jo@family.com' },
      jest.fn(() => Promise.reject(new Error('Network error'))),
    );

    Container.methods.onSend.call(ctx);
    await flush();

    expect(ctx.$emit).toHaveBeenCalledWith('failed', {
      email: 'jo@family.com',
      reason: 'We could not send that invite — try again',
    });
  });

  it('sends once, however often Send is pressed while the request is in flight', async () => {
    let resolve;
    const mutate = jest.fn(() => new Promise((done) => { resolve = done; }));
    const ctx = makeCtx({ email: 'jo@family.com' }, mutate);

    Container.methods.onSend.call(ctx);
    expect(ctx.sending).toBe(true);
    Container.methods.onSend.call(ctx);
    Container.methods.onSend.call(ctx);
    expect(mutate).toHaveBeenCalledTimes(1);

    resolve({ data: {} });
    await flush();
    expect(ctx.sending).toBe(false);
  });

  it('re-enables Send after a failure so the user can retry', async () => {
    const ctx = makeCtx(
      { email: 'jo@family.com' },
      jest.fn(() => Promise.reject(new Error('Network error'))),
    );

    Container.methods.onSend.call(ctx);
    await flush();

    expect(ctx.sending).toBe(false);
  });

  it('withdraws the invalid verdict as soon as typing resumes', () => {
    const ctx = makeCtx({ email: 'jo@', tried: true });

    Container.methods.onInput.call(ctx, 'jo@f');

    expect(ctx.email).toBe('jo@f');
    expect(ctx.tried).toBe(false);
  });
});
