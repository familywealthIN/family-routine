const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: GoogleTokenStrategy } = require('passport-google-token');


// GOOGLE STRATEGY
const GoogleTokenStrategyCallback = (accessToken, refreshToken, profile, done) => done(null, {
  accessToken,
  profile,
});

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_KEY, JWT_SECRET } = process.env;

passport.use(new GoogleTokenStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_KEY,
}, GoogleTokenStrategyCallback));

const authenticateGoogle = (req) => new Promise((resolve, reject) => {
  passport.authenticate('google-token', { session: false }, (err, data, info) => {
    if (err) reject(err);
    resolve({ data, info });
  })(req);
});

function generateAccessToken() {
  const today = new Date();
  const expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + 60);

  return jwt.sign({
    email: this.email,
    // eslint-disable-next-line no-underscore-dangle
    id: this._id,
    exp: parseInt(expirationDate.getTime() / 1000, 10),
  }, JWT_SECRET);
}

async function upsertGoogleUser({ accessToken, profile }, notificationId) {
  const User = this;

  const user = await User.findOne({ 'social.googleProvider.id': profile.id });

  // no user was found, lets create a new one
  if (!user) {
    const newUser = await User.create({
      name: profile.displayName || `${profile.familyName} ${profile.givenName}`,
      email: profile.emails[0].value,
      notificationId,
      // eslint-disable-next-line no-underscore-dangle
      picture: profile._json.picture,
      groupId: '',
      'social.googleProvider': {
        id: profile.id,
        token: accessToken,
      },
    });

    newUser.isNew = true;

    return newUser;
  }

  // eslint-disable-next-line no-underscore-dangle
  if (user.notificationId !== notificationId || user.picture !== profile._json.picture) {
    User.findOneAndUpdate(
      { _id: user.id },
      // eslint-disable-next-line no-underscore-dangle
      { notificationId, picture: profile._json.picture },
      { new: true },
    ).exec();
  }

  return user;
}

module.exports = { generateAccessToken, upsertGoogleUser, authenticateGoogle };
