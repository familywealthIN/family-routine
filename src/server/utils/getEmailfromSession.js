const ApiError = require('./ApiError');

function getEmailfromSession(context) {
  if (process.env.NODE_ENV === 'development') {
    return 'grvpanchal@gmail.com';
  }
  const email = context.decodedToken && context.decodedToken.email;
  if (!email) { throw new ApiError(401, '401:A valid authorization token is required'); }
  return email;
}

module.exports = getEmailfromSession;
