// Auth bypass for Playwright. Mints a JWT signed with the same JWT_SECRET
// the production server uses, then injects it into localStorage at the
// keys the app already reads (token, email, name) so the SPA boots
// already authed.

const jwt = require('jsonwebtoken');

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL || 'grvpanchalus@gmail.com';
const TEST_NAME = process.env.PLAYWRIGHT_TEST_NAME || 'Gaurav Panchal';

function mintToken(email = TEST_EMAIL) {
  const { JWT_SECRET } = process.env;
  if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
  return jwt.sign(
    { email, exp: Math.floor(Date.now() / 1000) + 3600 },
    JWT_SECRET,
  );
}

/**
 * Visits the app at `path` with localStorage pre-seeded so the user is
 * already authenticated. Use this in place of `page.goto(path)`.
 */
async function gotoAuthed(page, path = '/') {
  const token = mintToken();
  // Navigate to a blank page first so localStorage is on the right origin.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token: t, email, name }) => {
    localStorage.setItem('token', t);
    localStorage.setItem('email', email);
    localStorage.setItem('name', name);
    localStorage.setItem('picture', '');
  }, { token, email: TEST_EMAIL, name: TEST_NAME });
  if (path !== '/') await page.goto(path);
  else await page.reload();
}

module.exports = { mintToken, gotoAuthed, TEST_EMAIL, TEST_NAME };
