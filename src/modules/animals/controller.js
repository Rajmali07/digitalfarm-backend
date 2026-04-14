const animalsService = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const getProfileId = (req) => req.user.profileId || req.user.id;

const getAnimals = asyncHandler(async (req, res) => {
  const animals = await animalsService.getAnimals(getProfileId(req));
  apiResponse.success(res, 'Animals fetched', 200, animals);
});

const addAnimal = asyncHandler(async (req, res) => {
  const animal = await animalsService.addAnimal(getProfileId(req), req.body);
  apiResponse.success(res, 'Animal added', 201, animal);
});

const getAnimalById = asyncHandler(async (req, res) => {
  const animal = await animalsService.getAnimalById(getProfileId(req), req.params.id);
  apiResponse.success(res, 'Animal details', 200, animal);
});

module.exports = { getAnimals, addAnimal, getAnimalById };

