const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const {
  GOOGLE_CLIENT_ID,
  GA_CLIENT_ID,
  GA_IOS_CLIENT_ID,
  JWT_SECRET,
} = process.env;

// Initialize multiple Google OAuth2 clients
const googleClients = {
  web: new OAuth2Client(GOOGLE_CLIENT_ID),
  android: new OAuth2Client(GA_CLIENT_ID),
  ios: new OAuth2Client(GA_IOS_CLIENT_ID),
};



const authenticateApple = async (req) => {
  const { identityToken } = req.body;
  if (!identityToken) {
    throw new Error('No identity token provided');
  }

  try {
    const payload = jwt.decode(identityToken);

    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    // Apple may not provide email on subsequent logins
    const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;
    const name = payload.email ? payload.email.split('@')[0] : 'Apple User';

    return {
      data: {
        profile: {
          id: payload.sub,
          displayName: name,
          emails: [{ value: email }],
          _json: {
            picture: '',
          },
        },
      },
    };
  } catch (error) {
    throw new Error(`Apple authentication failed: ${error.message}`);
  }
};

// Get all client IDs for audience verification
const getAllClientIds = () => [GOOGLE_CLIENT_ID, GA_CLIENT_ID, GA_IOS_CLIENT_ID].filter(Boolean);
async function upsertAppleUser({ profile }, notificationId) {
  const User = this;
  
  // Try to find user by Apple ID first, then by email
  let user = await User.findOne({ 'social.appleProvider.id': profile.id });
  
  if (!user && profile.emails[0].value) {
    user = await User.findOne({ email: profile.emails[0].value });
    
    // If found by email, update with Apple provider info
    if (user) {
      user.social = user.social || {};
      user.social.appleProvider = { id: profile.id };
      await user.save();
    }
  }

  if (!user) {
    return await User.create({
      name: profile.displayName || 'Apple User',
      email: profile.emails[0].value,
      notificationId,
      picture: '',
      groupId: '',
      tags: [profile.emails[0].value],
      needsOnboarding: true,
      'social.appleProvider': { id: profile.id },
    });
  }

  if (user.notificationId !== notificationId) {
    await User.findOneAndUpdate(
      { _id: user.id },
      { notificationId },
      { new: true }
    );
  }

  return user;
}


// Function to verify Google ID token with multiple clients
const verifyGoogleToken = async (token) => {
  const clientIds = getAllClientIds();

  // Try verification with each client using Promise.allSettled
  const verificationPromises = Object.values(googleClients).map(async (client) => {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientIds, // Support all client IDs as audience
      });
      return { success: true, payload: ticket.getPayload() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  const results = await Promise.allSettled(verificationPromises);

  // Find the first successful verification
  const successfulResult = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .find((value) => value.success);

  if (successfulResult) {
    return successfulResult.payload;
  }

  throw new Error('Invalid Google token - failed verification with all clients');
};

const authenticateGoogle = async (req) => {
  const { credential } = req.body; // Get the credential from the request
  if (!credential) {
    throw new Error('No credential provided');
  }

  try {
    // Check if credential is a JSON string (popup mode) or JWT token (one tap mode)
    let payload;
    if (credential.startsWith('{')) {
      // Popup mode - credential contains access token and user info
      const credentialData = JSON.parse(credential);
      payload = {
        sub: credentialData.user_info.id,
        name: credentialData.user_info.name,
        email: credentialData.user_info.email,
        picture: credentialData.user_info.picture,
      };
    } else {
      // One tap mode - credential is JWT token
      payload = await verifyGoogleToken(credential);
    }

    return {
      data: {
        profile: {
          id: payload.sub,
          displayName: payload.name,
          emails: [{ value: payload.email }],
          _json: {
            picture: payload.picture,
          },
        },
      },
    };
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

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

async function upsertGoogleUser({ profile }, notificationId) {
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
      tags: [profile.emails[0].value],
      needsOnboarding: true,
      'social.googleProvider': {
        id: profile.id,
      },
    });

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

module.exports = {
  generateAccessToken, upsertGoogleUser, upsertAppleUser, authenticateGoogle, authenticateApple,
};
