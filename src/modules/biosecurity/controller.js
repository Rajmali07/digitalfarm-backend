const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const getChecklist = asyncHandler(async (req, res) => {
  const checklist = await service.getChecklist(getProfileId(req));
  apiResponse.success(res, 'Biosecurity checklist', 200, checklist);
});

const reportIssue = asyncHandler(async (req, res) => {
  const report = await service.reportIssue(getProfileId(req), req.body);
  apiResponse.success(res, 'Issue reported', 201, report);
});


module.exports = { getChecklist, reportIssue };

