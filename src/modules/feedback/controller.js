const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const createFeedback = asyncHandler(async (req, res) => {
  const data = await service.createFeedback(req.body);
  apiResponse.success(res, "Feedback submitted", 201, data);
});

const getFeedbacks = asyncHandler(async (req, res) => {
  const data = await service.getFeedbacks();
  apiResponse.success(res, "Feedback fetched", 200, data);
});

const updateFeedback = asyncHandler(async (req, res) => {
  const data = await service.updateFeedback(req.params.id, req.body);
  apiResponse.success(res, "Feedback updated", 200, data);
});

module.exports = { createFeedback, getFeedbacks, updateFeedback };
