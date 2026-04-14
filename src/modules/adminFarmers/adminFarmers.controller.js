const service = require('./adminFarmers.service');
const asyncHandler = require('../../utils/asyncHandler');
const { apiResponse } = require('../../utils/apiResponse');

const getFarmers = asyncHandler(async (req, res) => {
  const { state, district, village } = req.query;

  const farmers = await service.getAllFarmers({
    state,
    district,
    village
  });

  apiResponse.success(res, 'Farmers fetched', 200, farmers);
});

module.exports = { getFarmers };