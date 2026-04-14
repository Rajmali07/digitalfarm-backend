const express = require('express');
const router = express.Router();

const controller = require('./adminFarmers.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

// Only ADMIN can access
router.get(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  controller.getFarmers
);

module.exports = router;