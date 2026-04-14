const adminsService = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const stats = await adminsService.getDashboardStats();
  apiResponse.success(res, 'Dashboard stats', 200, stats);
});

module.exports = { dashboard };

