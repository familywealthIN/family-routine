/* eslint-env jest */
/**
 * Sign in with Apple and the user's name.
 *
 * Apple hands the real name over EXACTLY ONCE — in the authorization response
 * of the first sign-in for an Apple ID — and never puts it in the identity
 * token. The client used to compute it and drop it on the floor (the parameter
 * it was passed into was shadowed, and the mutation had no field to carry it),
 * so every Apple account was created with the server's placeholder instead.
 *
 * The placeholder is the email's local part, applied to whatever address the
 * token carries. For someone who chose to share their real address that is a
 * plausible-looking name — "alex" for alex@example.com — which is why nobody
 * noticed: onboarding only recognised the placeholder on private-relay
 * addresses, so that user was never asked for their name either.
 */
const jwt = require('jsonwebtoken');

const { authenticateApple, displayNameFromEmail } = require('./passport');

/** An Apple identity token is only ever decoded here, never verified. */
const tokenFor = (claims) => jwt.sign({ sub: 'apple-sub-1', ...claims }, 'test-secret');

const profileFor = async (body) => {
  const { data } = await authenticateApple({ body });
  return data.profile;
};

describe('displayNameFromEmail — the placeholder, not a name', () => {
  it('is the local part of whatever address Apple gave us', () => {
    expect(displayNameFromEmail('alex@example.com')).toBe('alex');
    expect(displayNameFromEmail('abc123@privaterelay.appleid.com')).toBe('abc123');
  });

  it('falls back to "Apple User" when the token carried no email at all', () => {
    expect(displayNameFromEmail(undefined)).toBe('Apple User');
    expect(displayNameFromEmail('')).toBe('Apple User');
  });
});

describe('authenticateApple — the name the client forwards', () => {
  it('uses the real name when the first authorization supplied one', async () => {
    const profile = await profileFor({
      identityToken: tokenFor({ email: 'alex@example.com' }),
      name: 'Alex Rivera',
    });
    expect(profile.displayName).toBe('Alex Rivera');
  });

  it('trims it, so a stray space does not become the stored name', async () => {
    const profile = await profileFor({
      identityToken: tokenFor({ email: 'alex@example.com' }),
      name: '  Alex Rivera  ',
    });
    expect(profile.displayName).toBe('Alex Rivera');
  });

  it('falls back to the placeholder on a later sign-in, which carries no name', async () => {
    const profile = await profileFor({
      identityToken: tokenFor({ email: 'alex@example.com' }),
    });
    expect(profile.displayName).toBe('alex');
  });

  it('treats an empty or blank name as no name rather than storing it', async () => {
    const blank = await profileFor({
      identityToken: tokenFor({ email: 'alex@example.com' }),
      name: '   ',
    });
    expect(blank.displayName).toBe('alex');
  });

  it('still invents a private-relay address when Apple withheld the email', async () => {
    const profile = await profileFor({ identityToken: tokenFor({}) });
    expect(profile.emails[0].value).toBe('apple-sub-1@privaterelay.appleid.com');
    // The placeholder keys off the TOKEN's email, which is absent — not off the
    // address we just invented, which would read as a real-looking name.
    expect(profile.displayName).toBe('Apple User');
  });

  it('keys the account on the Apple subject, whatever the name is', async () => {
    const profile = await profileFor({
      identityToken: tokenFor({ email: 'alex@example.com' }),
      name: 'Alex Rivera',
    });
    expect(profile.id).toBe('apple-sub-1');
  });

  it('refuses a request with no identity token', async () => {
    await expect(authenticateApple({ body: {} })).rejects.toThrow('No identity token provided');
  });
});
