const service = require('./service');
const asyncHandler = require('../../utils/asyncHandler');
const { apiResponse } = require('../../utils/apiResponse');

const getZones = asyncHandler(async (req, res) => {
  const zones = await service.getZones();
  apiResponse.success(res, "Zones fetched", 200, zones);
});

const createZone = asyncHandler(async (req, res) => {
  const { name, status, keywords } = req.body;
  const zone = await service.createZone({ name, status, keywords });
  apiResponse.success(res, "Zone created", 201, zone);
});

const updateZone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status, keywords } = req.body;
  const zone = await service.updateZone(id, { name, status, keywords });
  apiResponse.success(res, "Zone updated", 200, zone);
});

const deleteZone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await service.deleteZone(id);
  apiResponse.success(res, "Zone deleted", 200);
});

module.exports = { getZones, createZone, updateZone, deleteZone };
