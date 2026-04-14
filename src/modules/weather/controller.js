const { saveWeather, getLatestWeather, refreshCurrentWeather } = require('./service');
const asyncHandler = require('../../utils/asyncHandler');
const { apiResponse } = require('../../utils/apiResponse');
const getProfileId = (req) => req.user.profileId || req.user.id;

const saveWeatherController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);

  const saved = await saveWeather(userId, req.body);

  apiResponse.success(res, "Weather saved", 200, { saved });
});

const getLatestWeatherController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);
  const latest = await getLatestWeather(userId);

  apiResponse.success(res, "Latest weather fetched", 200, { weather: latest });
});

const refreshCurrentWeatherController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);
  const result = await refreshCurrentWeather(userId);

  apiResponse.success(res, "Current weather refreshed", 200, result);
});

module.exports = {
  saveWeather: saveWeatherController,
  getLatestWeather: getLatestWeatherController,
  refreshCurrentWeather: refreshCurrentWeatherController
};
