const { analyzeAndSave } = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;
const { getRiskSummary } = require('./service');

const analyzeRiskController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);

  // 🔥 IMPORTANT: use req.body + req.file
  const result = await analyzeAndSave(userId, req.body, req.file);

  apiResponse.success(res, 'AI analysis + saved', 200, result);
});
const { getHistory } = require('./service');

const getHistoryController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);

  const history = await getHistory(userId);

  apiResponse.success(res, 'History fetched', 200, { history });
});

const getRiskSummaryController = asyncHandler(async (req, res) => {
  const userId = getProfileId(req);
  const summary = await getRiskSummary(userId, req.body || {});

  apiResponse.success(res, 'Risk summary generated', 200, { summary });
});

module.exports = {
  analyzeRisk: analyzeRiskController,
  getHistory: getHistoryController,
  getRiskSummary: getRiskSummaryController
};
