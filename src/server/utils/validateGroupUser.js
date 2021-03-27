const ApiError = require('./ApiError');

async function validateGroupUser(UserModel, email, groupId) {
  const isUserGroupValid = await UserModel.findOne({ email, groupId }).exec();

  if (!isUserGroupValid) {
    throw new ApiError(403, '403:Group Id not valid');
  }
}

module.exports = validateGroupUser;
