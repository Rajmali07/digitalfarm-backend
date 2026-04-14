const farmersService = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const getProfile = asyncHandler(async (req, res) => {
  const profile = await farmersService.getProfile(getProfileId(req));
  apiResponse.success(res, 'Profile fetched successfully', 200, profile);
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await farmersService.updateProfile(getProfileId(req), req.body);
  apiResponse.success(res, 'Profile updated successfully', 200, profile);
});

module.exports = { getProfile, updateProfile };

