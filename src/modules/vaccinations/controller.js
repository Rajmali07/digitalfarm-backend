const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const getVaccinations = asyncHandler(async (req, res) => {
  const vaccinations = await service.getVaccinations(getProfileId(req));
  apiResponse.success(res, 'Vaccinations fetched', 200, vaccinations);
});

const addVaccination = asyncHandler(async (req, res) => {
  const vaccination = await service.addVaccination(getProfileId(req), req.body);
  apiResponse.success(res, 'Vaccination added', 201, vaccination);
});

module.exports = { getVaccinations, addVaccination };

