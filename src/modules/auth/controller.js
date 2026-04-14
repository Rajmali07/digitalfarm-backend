const authService = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  apiResponse.success(res, 'User registered successfully', 201, { user });
});

const login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  apiResponse.success(res, 'Login successful', 200, { token, user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return apiResponse.error(res, 'Current password and new password are required', 400);
  }

  await authService.changePassword(req.user.id, currentPassword, newPassword);
  apiResponse.success(res, 'Password updated successfully', 200);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, redirectTo } = req.body;

  if (!email) {
    return apiResponse.error(res, 'Email is required', 400);
  }

  const result = await authService.forgotPassword(email, redirectTo);
  apiResponse.success(res, 'Password reset email sent', 200, result);
});

module.exports = { register, login, changePassword, forgotPassword };

