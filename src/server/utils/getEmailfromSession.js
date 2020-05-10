function getEmailfromSession(context) {
  const email = context.decodedToken && context.decodedToken.email;
  if (!email) { throw new Error('A valid authorization token is required'); }
  return email;
}

module.exports = getEmailfromSession;
