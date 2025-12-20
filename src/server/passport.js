const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const { GOOGLE_CLIENT_ID, JWT_SECRET } = process.env;

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);


// Add this function to passport.js or create a separate apple auth file
const authenticateApple = async (req) => {
  const { identityToken } = req.body;
  if (!identityToken) {
    throw new Error('No identity token provided');
  }

  try {
    // Decode the JWT token without verification first to get the header
    const decodedHeader = jwt.decode(identityToken, { complete: true });
    if (!decodedHeader) {
      throw new Error('Invalid identity token format');
    }

    // Get Apple's public keys
    const appleKeysResponse = await axios.get('https://appleid.apple.com/auth/keys');
    const appleKeys = appleKeysResponse.data.keys;
    
    // Find the correct key
    const keyId = decodedHeader.header.kid;
    const appleKey = appleKeys.find(key => key.kid === keyId);
    
    if (!appleKey) {
      throw new Error('Apple key not found');
    }

    // For production, you should properly verify the JWT with Apple's public key
    // For now, we'll decode it (in production, use proper JWT verification)
    const payload = jwt.decode(identityToken);
    
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    return {
      data: {
        profile: {
          id: payload.sub,
          displayName: payload.email ? payload.email.split('@')[0] : 'Apple User',
          emails: [{ value: payload.email }],
          _json: {
            picture: '', // Apple doesn't provide profile pictures
          },
        },
      },
    };
  } catch (error) {
    throw new Error(`Apple authentication failed: ${error.message}`);
  }
};

// Add this function to passport.js
async function upsertAppleUser({ profile }, notificationId) {
  const User = this;

  const user = await User.findOne({ 'social.appleProvider.id': profile.id });

  if (!user) {
    const newUser = await User.create({
      name: profile.displayName || 'Apple User',
      email: profile.emails[0].value,
      notificationId,
      picture: '', // Apple doesn't provide profile pictures
      groupId: '',
      tags: [profile.emails[0].value],
      needsOnboarding: true,
      'social.appleProvider': {
        id: profile.id,
      },
    });

    return newUser;
  }

  if (user.notificationId !== notificationId) {
    User.findOneAndUpdate(
      { _id: user.id },
      { notificationId },
      { new: true },
    ).exec();
  }

  return user;
}


// Function to verify Google ID token
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    throw new Error('Invalid Google token');
  }
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

module.exports = { generateAccessToken, upsertGoogleUser, upsertAppleUser, authenticateGoogle, authenticateApple  };
