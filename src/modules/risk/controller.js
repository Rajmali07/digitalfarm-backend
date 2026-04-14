const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const getRiskAssessment = asyncHandler(async (req, res) => {
  const assessment = await service.getRiskAssessment(getProfileId(req));
  apiResponse.success(res, 'Risk assessment', 200, assessment);
});

module.exports = { getRiskAssessment };

