const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.createComplaint(
    getProfileId(req),
    req.body,
    req.file // 👈 ADD THIS
  );

  apiResponse.success(res, 'Complaint submitted', 201, complaint);
});

const getComplaints = asyncHandler(async (req, res) => {
  const complaints = await service.getComplaints(getProfileId(req), req.user?.role);
  apiResponse.success(res, 'Complaints fetched', 200, complaints);
});

const markComplaintSeen = asyncHandler(async (req, res) => {
  const complaint = await service.markComplaintSeen(req.params.id);
  apiResponse.success(res, 'Complaint marked as seen', 200, complaint);
});

const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.updateComplaint(req.params.id, req.body, req.file);
  apiResponse.success(res, 'Complaint updated', 200, complaint);
});

module.exports = { createComplaint, getComplaints, markComplaintSeen, updateComplaint };
