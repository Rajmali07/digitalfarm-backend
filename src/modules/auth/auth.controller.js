const asyncHandler = require('../../utils/asyncHandler');
const { apiResponse } = require('../../utils/apiResponse');
const authService = require('./service');

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    return apiResponse.error(res, "New password required", 400);
  }

  await authService.changePassword(userId, newPassword);

  apiResponse.success(res, "Password updated successfully", 200);
});

module.exports = { changePassword };    